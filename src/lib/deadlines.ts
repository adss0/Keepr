import type { Receipt } from "@/types/receipt";

/** Consumer Rights Act 2015: short-term right to reject faulty goods. */
const SHORT_TERM_REJECT_DAYS = 30;
/** Consumer Contracts Regulations 2013: cancellation period for distance sales. */
const ONLINE_CANCELLATION_DAYS = 14;

export type Deadline = {
  kind: "retailer_return" | "online_cancellation" | "faulty_reject" | "warranty";
  label: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Adds months, clamping to the last day of the month (31 Jan + 1 month = 28/29 Feb). */
function addMonths(isoDate: string, months: number): string {
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
      label: "Refund if faulty (30-day right to reject)",
      date: addDays(receipt.purchaseDate, SHORT_TERM_REJECT_DAYS),
    },
  ];

  if (receipt.channel === "online") {
    deadlines.push({
      kind: "online_cancellation",
      label: "Cancel for any reason (14 days for online orders)",
      date: addDays(receipt.purchaseDate, ONLINE_CANCELLATION_DAYS),
    });
  }

  if (receipt.returnWindowDays !== undefined) {
    deadlines.push({
      kind: "retailer_return",
      label: `${receipt.retailer} return policy`,
      date: addDays(receipt.purchaseDate, receipt.returnWindowDays),
    });
  }

  if (receipt.warrantyMonths !== undefined) {
    deadlines.push({
      kind: "warranty",
      label: "Manufacturer warranty",
      date: addMonths(receipt.purchaseDate, receipt.warrantyMonths),
    });
  }

  return deadlines.sort((a, b) => a.date.localeCompare(b.date));
}
