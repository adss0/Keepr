import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { useToast } from "@/components/toast";
import { useCloud } from "@/data/cloud";
import { registerForSpacePush } from "@/data/push-notifications";
import { useReminders } from "@/data/reminders";
import { type Space, useSpaces } from "@/data/spaces";
import { supabase } from "@/data/supabase";
import { type ActivityRow, activityText, rowToActivity, wantsAlert } from "@/lib/space-activity";

/**
 * Shared-space alerts. While Keepr is open, a toast says when someone else adds a receipt to, joins or leaves one of
 * your spaces (as each person chose for that space); its View button opens the space's activity. It also registers
 * the phone for push notifications, which the notify-space function sends while Keepr is closed.
 */
export function SpaceAlerts() {
  const { userId } = useCloud();
  const { spaces } = useSpaces();
  const { permission } = useReminders();
  const { showToast } = useToast();
  // The Realtime listener lives as long as the sign-in, so it reads the latest spaces through a ref.
  const spacesRef = useRef<Space[]>(spaces);
  useEffect(() => {
    spacesRef.current = spaces;
  }, [spaces]);

  useEffect(() => {
    if (!userId || permission !== "granted") return;
    registerForSpacePush()
      .then((problem) => {
        if (problem) console.info(`Shared-space push not set up: ${problem}`);
      })
      .catch((error: unknown) => console.warn("Couldn't register for push notifications", error));
  }, [userId, permission]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const client = supabase;
    const channel = client
      .channel(`keepr-space-alerts-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "space_activity" }, (payload) => {
        const activity = rowToActivity(payload.new as ActivityRow);
        if (activity.actorId === userId) return;
        const space = spacesRef.current.find((item) => item.id === activity.spaceId);
        const me = space?.members.find((member) => member.userId === userId);
        if (!space || !me || !wantsAlert(activity.kind, me)) return;
        const who = space.members.find((member) => member.userId === activity.actorId)?.displayName;
        showToast({
          message: `${activityText(activity, userId, who)} · ${space.name}`,
          action: {
            label: "View",
            onPress: () => router.push({ pathname: "/spaces/[id]", params: { id: space.id, tab: "activity" } }),
          },
        });
      })
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [userId, showToast]);

  return null;
}
