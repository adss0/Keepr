import { ROLE_LABELS } from "@/lib/spaces";

export type ActivityKind =
  | "space_created"
  | "member_joined"
  | "member_left"
  | "member_removed"
  | "role_changed"
  | "owner_changed"
  | "receipt_added"
  | "receipt_closed"
  | "receipt_removed"
  | "subscription_added";

/** A line in a space's activity feed, as stored in the space_activity table. */
export type Activity = {
  id: number;
  spaceId: string;
  actorId: string | undefined;
  actorName: string;
  kind: ActivityKind;
  itemId: string | undefined;
  title: string;
  detail: string;
  createdAt: string;
};

export type ActivityRow = {
  id: number;
  space_id: string;
  actor_id: string | null;
  actor_name: string;
  kind: ActivityKind;
  item_id: string | null;
  title: string;
  detail: string;
  created_at: string;
};

export function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    spaceId: row.space_id,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name,
    kind: row.kind,
    itemId: row.item_id ?? undefined,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

const CLOSED_WORDS: Record<string, string> = { returned: "returned", claimed: "claimed on", archived: "archived" };

/**
 * The feed line for an activity, e.g. "Sam added Kettle". `me` is the signed-in user, shown as "You".
 * `who` is the actor's current name in the space if they're still in it, else the name saved with the activity.
 */
export function activityText(activity: Activity, me: string | undefined, who?: string): string {
  const actor = activity.actorId && activity.actorId === me ? "You" : who || activity.actorName || "Someone";
  const title = activity.title || "something";
  switch (activity.kind) {
    case "space_created":
      return `${actor} created the space`;
    case "member_joined":
      return `${actor} joined`;
    case "member_left":
      return `${activity.actorId === me ? "You" : title} left`;
    case "member_removed":
      return `${actor} removed ${title}`;
    case "role_changed":
      return `${actor} made ${title} ${activity.detail === "admin" ? "an admin" : "a member"}`;
    case "owner_changed":
      return `${title} is now the ${ROLE_LABELS.owner.toLowerCase()}`;
    case "receipt_added":
      return `${actor} added ${title}`;
    case "receipt_closed":
      return activity.detail === "claimed"
        ? `${actor} claimed on the warranty for ${title}`
        : `${actor} ${CLOSED_WORDS[activity.detail] ?? "finished with"} ${title}`;
    case "receipt_removed":
      return `${actor} removed ${title}`;
    case "subscription_added":
      return `${actor} added the subscription ${title}`;
  }
}

/** The second line under an activity: the receipt's shop and price, where there is one. */
export function activityDetail(activity: Activity): string | undefined {
  return activity.kind === "receipt_added" || activity.kind === "subscription_added" ? activity.detail || undefined : undefined;
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", or the date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Whether a member who chose these settings should be told about an activity by someone else. */
export function wantsAlert(kind: ActivityKind, settings: { notifyReceipts: boolean; notifyMembers: boolean }): boolean {
  if (kind === "receipt_added") return settings.notifyReceipts;
  if (kind === "member_joined" || kind === "member_left") return settings.notifyMembers;
  return false;
}
