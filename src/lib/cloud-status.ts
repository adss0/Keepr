import type { CloudStatus } from "@/data/cloud";

/** Short, plain-English text for each sync state. */
export const STATUS_TEXT: Record<CloudStatus, string> = {
  not_set_up: "Cloud sync isn't set up",
  signed_out: "Not signed in",
  syncing: "Syncing…",
  synced: "Backed up",
  error: "Couldn't sync",
};
