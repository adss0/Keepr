import { formatDate } from "@/lib/format";
import type { ClosedReason, Receipt } from "@/types/receipt";

export const CLOSED_LABELS: Record<ClosedReason, string> = {
  returned: "Returned",
  claimed: "Claimed",
  archived: "Archived",
};

/** "Returned 18 Nov", for a finished-with receipt. */
export function closedText(closed: NonNullable<Receipt["closed"]>, currentYear: number): string {
  return `${CLOSED_LABELS[closed.reason]} ${formatDate(closed.on, currentYear)}`;
}
