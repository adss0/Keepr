import { formatDate } from "@/lib/format";
import type { ClosedReason, Receipt } from "@/types/receipt";

export const CLOSED_LABELS: Record<ClosedReason, string> = {
  returned: "Returned",
  claimed: "Claimed",
  archived: "Archived",
};

/** Where a receipt stands: still running, or how it was finished with. */
export type ReceiptStatus = "active" | ClosedReason;

export const STATUS_OPTIONS: { value: ReceiptStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "returned", label: CLOSED_LABELS.returned },
  { value: "claimed", label: CLOSED_LABELS.claimed },
  { value: "archived", label: CLOSED_LABELS.archived },
];

export function statusOf(receipt: Receipt): ReceiptStatus {
  return receipt.closed?.reason ?? "active";
}

/** "Returned 18 Nov", for a finished-with receipt. */
export function closedText(closed: NonNullable<Receipt["closed"]>, currentYear: number): string {
  return `${CLOSED_LABELS[closed.reason]} ${formatDate(closed.on, currentYear)}`;
}
