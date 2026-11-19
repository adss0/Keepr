// Supabase Edge Function: tells the other members of a shared space about what the caller just did there
// (added a receipt or subscription, joined, left), as push notifications through Expo's push service.
// The app calls it after syncing a shared item or changing membership. It only sends activity the caller did
// themselves that hasn't been sent yet, so calling it twice, or by someone else, can't send anything extra.
// Each member's choices for the space (space_members.notify_receipts / notify_members) are respected.
// Deploy with --no-verify-jwt, like extract-receipt: it checks the caller's sign-in with Supabase Auth itself.

import { createClient } from "npm:@supabase/supabase-js@^2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_ACTIVITY = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Activity = {
  id: number;
  space_id: string;
  actor_id: string | null;
  actor_name: string;
  kind: string;
  title: string;
  detail: string;
};
type Member = { space_id: string; user_id: string; notify_receipts: boolean; notify_members: boolean };
type PushMessage = { to: string; title: string; body: string; data: Record<string, string>; sound: "default"; channelId: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** The notification text for an activity, or undefined for kinds nobody is notified about. */
function messageFor(activity: Activity): string | undefined {
  const who = activity.actor_name || "Someone";
  switch (activity.kind) {
    case "receipt_added":
      return `${who} added ${activity.title}${activity.detail ? ` (${activity.detail})` : ""}`;
    case "subscription_added":
      return `${who} added the subscription ${activity.title}`;
    case "member_joined":
      return `${who} joined`;
    case "member_left":
      return `${activity.title || who} left`;
  }
}

function wants(member: Member, kind: string): boolean {
  if (kind === "receipt_added" || kind === "subscription_added") return member.notify_receipts;
  if (kind === "member_joined" || kind === "member_left") return member.notify_members;
  return false;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "The function isn't set up" }, 500);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = auth.user;
  if (!user || user.is_anonymous) return json({ error: "Sign in first" }, 401);

  // Claim the caller's unsent activity in one update, so overlapping calls can't send it twice.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("space_activity")
    .update({ notified_at: new Date().toISOString() })
    .eq("actor_id", user.id)
    .is("notified_at", null)
    .gte("created_at", dayAgo)
    .select("id, space_id, actor_id, actor_name, kind, title, detail");
  if (claimError) return json({ error: claimError.message }, 500);
  const activities = ((claimed ?? []) as Activity[]).filter((activity) => messageFor(activity)).slice(0, MAX_ACTIVITY);
  if (activities.length === 0) return json({ sent: 0 });

  const spaceIds = [...new Set(activities.map((activity) => activity.space_id))];
  const [{ data: members }, { data: spaces }] = await Promise.all([
    admin.from("space_members").select("space_id, user_id, notify_receipts, notify_members").in("space_id", spaceIds),
    admin.from("spaces").select("id, name").in("id", spaceIds),
  ]);
  const spaceName = new Map(((spaces ?? []) as { id: string; name: string }[]).map((space) => [space.id, space.name]));

  // Who should hear about what: everyone else in the space who wants that kind of news.
  const wanted: { userId: string; activity: Activity }[] = [];
  for (const activity of activities) {
    for (const member of (members ?? []) as Member[]) {
      if (member.space_id === activity.space_id && member.user_id !== user.id && wants(member, activity.kind)) {
        wanted.push({ userId: member.user_id, activity });
      }
    }
  }
  if (wanted.length === 0) return json({ sent: 0 });

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token, user_id")
    .in("user_id", [...new Set(wanted.map((item) => item.userId))]);
  const tokensByUser = new Map<string, string[]>();
  for (const row of (tokens ?? []) as { token: string; user_id: string }[]) {
    tokensByUser.set(row.user_id, [...(tokensByUser.get(row.user_id) ?? []), row.token]);
  }

  const messages: PushMessage[] = wanted.flatMap(({ userId, activity }) =>
    (tokensByUser.get(userId) ?? []).map((to) => ({
      to,
      title: spaceName.get(activity.space_id) ?? "Shared space",
      body: messageFor(activity)!,
      data: { type: "space-activity", spaceId: activity.space_id },
      sound: "default",
      channelId: "spaces",
    })),
  );

  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const stale: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(expoToken && { Authorization: `Bearer ${expoToken}` }),
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      console.error(`Expo push failed: ${response.status} ${await response.text()}`);
      continue;
    }
    const { data: tickets } = (await response.json()) as {
      data?: { status: string; details?: { error?: string } }[];
    };
    // Phones that uninstalled Keepr or turned notifications off: forget them.
    tickets?.forEach((ticket, index) => {
      if (ticket.details?.error === "DeviceNotRegistered") stale.push(batch[index].to);
    });
  }
  if (stale.length > 0) await admin.from("push_tokens").delete().in("token", stale);

  return json({ sent: messages.length - stale.length });
});
