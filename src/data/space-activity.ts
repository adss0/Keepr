import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/data/supabase";
import { type Activity, type ActivityRow, rowToActivity } from "@/lib/space-activity";

const FEED_LENGTH = 60;

type ActivityStatus = "loading" | "ready" | "unavailable" | "error";

async function fetchActivity(spaceId: string): Promise<{ status: ActivityStatus; items?: Activity[] }> {
  if (!supabase) return { status: "unavailable" };
  const { data, error } = await supabase
    .from("space_activity")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(FEED_LENGTH);
  if (error) return { status: ["PGRST205", "42P01"].includes(error.code ?? "") ? "unavailable" : "error" };
  return { status: "ready", items: (data as ActivityRow[]).map(rowToActivity) };
}

/**
 * A space's activity feed, newest first, kept live with Realtime while the screen is open.
 * "unavailable" means the database hasn't had the activity migration yet.
 */
export function useSpaceActivity(spaceId: string | undefined) {
  const [items, setItems] = useState<Activity[]>([]);
  const [status, setStatus] = useState<ActivityStatus>("loading");

  const apply = useCallback((result: { status: ActivityStatus; items?: Activity[] }) => {
    setStatus(result.status);
    if (result.items) setItems(result.items);
  }, []);

  useEffect(() => {
    if (!supabase || !spaceId) return;
    const client = supabase;
    // Applied after the await, never synchronously inside the effect.
    fetchActivity(spaceId)
      .then(apply)
      .catch(() => apply({ status: "error" }));
    const channel = client
      .channel(`keepr-activity-${spaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "space_activity", filter: `space_id=eq.${spaceId}` },
        (payload) =>
          setItems((current) =>
            [rowToActivity(payload.new as ActivityRow), ...current.filter((item) => item.id !== payload.new.id)].slice(
              0,
              FEED_LENGTH,
            ),
          ),
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [spaceId, apply]);

  return { items, status };
}
