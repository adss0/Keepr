import { lastMonths } from "@/lib/insights";
import { type ReceiptStatus, statusOf } from "@/lib/receipt-status";
import type { Receipt } from "@/types/receipt";

export type ExportPeriod = "month" | "3months" | "year" | "lastYear" | "all" | "custom";

export const PERIOD_OPTIONS: { value: ExportPeriod; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "3months", label: "3 months" },
  { value: "year", label: "This year" },
  { value: "lastYear", label: "Last year" },
  { value: "all", label: "All" },
  { value: "custom", label: "Pick dates" },
];

/** Purchase dates from `from` to `to`, both inclusive (YYYY-MM-DD). A missing end is open. */
export type DateRange = { from?: string; to?: string };

/** The dates a period covers on `today`. `custom` is used as it is for "Pick dates". */
export function periodRange(period: ExportPeriod, today: string, custom: DateRange = {}): DateRange {
  const year = today.slice(0, 4);
  switch (period) {
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "3months":
      return { from: `${lastMonths(today, 3)[0]}-01`, to: today };
    case "year":
      return { from: `${year}-01-01`, to: today };
    case "lastYear":
      return { from: `${Number(year) - 1}-01-01`, to: `${Number(year) - 1}-12-31` };
    case "all":
      return {};
    case "custom":
      // Dates picked the wrong way round still mean the days between them.
      return custom.from && custom.to && custom.from > custom.to ? { from: custom.to, to: custom.from } : custom;
  }
}

/** Whether the receipt was bought within `range`. */
export function boughtIn(receipt: Receipt, range: DateRange): boolean {
  return (!range.from || receipt.purchaseDate >= range.from) && (!range.to || receipt.purchaseDate <= range.to);
}

/** The receipts bought within `range` whose status is one of `statuses`, oldest first. */
export function receiptsInRange(receipts: Receipt[], range: DateRange, statuses: ReadonlySet<ReceiptStatus>): Receipt[] {
  return receipts
    .filter((receipt) => statuses.has(statusOf(receipt)) && boughtIn(receipt, range))
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
}

/** "2026-01-01-to-2026-11-18", for file names. */
export function rangeFileSuffix(range: DateRange, today: string): string {
  if (!range.from && !range.to) return `all-to-${today}`;
  return `${range.from ?? "start"}-to-${range.to ?? today}`;
}
