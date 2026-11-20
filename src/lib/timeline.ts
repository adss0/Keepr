import { addMonths, type Deadline, DEADLINE_EXPLANATIONS, getDeadlines } from "@/lib/deadlines";
import type { Receipt } from "@/types/receipt";

/** Consumer Rights Act 2015, s.19(14): a fault showing within 6 months is taken to have been there all along. */
const PRESUMPTION_MONTHS = 6;

export type TimelineEntry = {
  key: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  detail: string;
  /** Set for the deadlines Keepr reminds about, not for the purchase or the 6-month milestone. */
  deadline?: Deadline;
};

/**
 * A receipt's life in date order: when it was bought, then each right as it runs out, including the
 * 6-month point after which proving a fault gets harder. Same-day entries keep the deadlines' order.
 */
export function receiptTimeline(receipt: Receipt): TimelineEntry[] {
  const bought: TimelineEntry = {
    key: "bought",
    date: receipt.purchaseDate,
    title: receipt.channel === "online" ? "Delivered" : "Bought",
    detail: `${receipt.retailer}, ${receipt.channel === "online" ? "online" : "in store"}`,
  };
  const presumption: TimelineEntry = {
    key: "presumption",
    date: addMonths(receipt.purchaseDate, PRESUMPTION_MONTHS),
    title: "Faults assumed from the start",
    detail:
      "Until this date, a fault is taken to have been there when you bought it, so the shop must repair or replace it unless it can prove otherwise. After it, you may have to show that yourself (Consumer Rights Act 2015).",
  };
  const deadlines = getDeadlines(receipt).map(
    (deadline): TimelineEntry => ({
      key: deadline.kind,
      date: deadline.date,
      title: deadline.label,
      detail: DEADLINE_EXPLANATIONS[deadline.kind],
      deadline,
    }),
  );
  // Array sort is stable, so the deadlines keep their order on the same day.
  return [bought, ...[...deadlines, presumption].sort((a, b) => a.date.localeCompare(b.date))];
}
