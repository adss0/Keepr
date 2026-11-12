import type { Receipt } from "@/types/receipt";

/** Consumer Rights Act 2015: short-term right to reject faulty goods. */
const SHORT_TERM_REJECT_DAYS = 30;
/** Consumer Contracts Regulations 2013: cancellation period for distance sales. */
const ONLINE_CANCELLATION_DAYS = 14;

export type DeadlineKind = "retailer_return" | "online_cancellation" | "faulty_reject" | "warranty";

export type Deadline = {
  kind: DeadlineKind;
  label: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
};

/** Plain-English explanation of what each deadline means for the buyer. */
export const DEADLINE_EXPLANATIONS: Record<DeadlineKind, string> = {
  online_cancellation:
    "Bought online, by phone or by mail order? You can cancel for any reason within 14 days of delivery, then return it within another 14 days for a full refund (Consumer Contracts Regulations 2013).",
  retailer_return:
    "The shop's own returns policy. This is a goodwill promise on top of your legal rights, so check its conditions (receipt, packaging, unused).",
  faulty_reject:
    "If it's faulty, not as described or not fit for purpose, you can reject it for a full refund within 30 days (Consumer Rights Act 2015). After that you're still entitled to a repair or replacement.",
  warranty:
    "The manufacturer's warranty. It's extra cover from the maker and doesn't replace your legal rights against the shop.",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Today's date (YYYY-MM-DD) in the device's local time zone. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whole days from `fromDate` to `toDate` (negative if `toDate` has passed). */
export function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((to - from) / MS_PER_DAY);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Adds months, clamping to the last day of the month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

/** All known deadlines for a receipt, soonest first. */
export function getDeadlines(receipt: Receipt): Deadline[] {
  const deadlines: Deadline[] = [
    {
      kind: "faulty_reject",
      label: "Refund if faulty",
      date: addDays(receipt.purchaseDate, SHORT_TERM_REJECT_DAYS),
    },
  ];

  if (receipt.channel === "online") {
    deadlines.push({
      kind: "online_cancellation",
      label: "Cancel for any reason",
      date: addDays(receipt.purchaseDate, ONLINE_CANCELLATION_DAYS),
    });
  }

  if (receipt.returnWindowDays !== undefined) {
    deadlines.push({
      kind: "retailer_return",
      label: "Store return",
      date: addDays(receipt.purchaseDate, receipt.returnWindowDays),
    });
  }

  if (receipt.warrantyMonths !== undefined) {
    deadlines.push({
      kind: "warranty",
      label: "Warranty",
      date: addMonths(receipt.purchaseDate, receipt.warrantyMonths),
    });
  }

  return deadlines.sort((a, b) => a.date.localeCompare(b.date));
}

/** The soonest deadline that hasn't passed yet, or undefined if all have. */
export function getNextDeadline(
  receipt: Receipt,
  today: string = todayIso(),
): Deadline | undefined {
  return getDeadlines(receipt).find((deadline) => deadline.date >= today);
}
