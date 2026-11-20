import { getNextDeadline } from "@/lib/deadlines";
import { monthLabel } from "@/lib/insights";
import type { Receipt } from "@/types/receipt";

export type ReceiptsView = "list" | "grid" | "timeline";
export type ReceiptsSort = "deadline" | "newest" | "oldest" | "price" | "cheapest";

export const SORT_LABELS: Record<ReceiptsSort, string> = {
  deadline: "Soonest deadline",
  newest: "Newest first",
  oldest: "Oldest first",
  price: "Highest price",
  cheapest: "Lowest price",
};

export const SORT_OPTIONS = (Object.keys(SORT_LABELS) as ReceiptsSort[]).map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

/** Sort key for receipts with no upcoming deadline, so they go last. */
const NO_DEADLINE = "9999-12-31";

/** Receipts in the chosen order. Ties fall back to the newest purchase. */
export function sortReceipts(receipts: Receipt[], sort: ReceiptsSort, today: string): Receipt[] {
  const newest = (a: Receipt, b: Receipt) => b.purchaseDate.localeCompare(a.purchaseDate);
  const sorted = [...receipts];
  if (sort === "newest") return sorted.sort(newest);
  if (sort === "oldest") return sorted.sort((a, b) => newest(b, a));
  if (sort === "price") return sorted.sort((a, b) => b.pricePence - a.pricePence || newest(a, b));
  if (sort === "cheapest") return sorted.sort((a, b) => a.pricePence - b.pricePence || newest(a, b));
  const deadline = new Map(sorted.map((r) => [r.id, getNextDeadline(r, today)?.date ?? NO_DEADLINE]));
  return sorted.sort((a, b) => deadline.get(a.id)!.localeCompare(deadline.get(b.id)!) || newest(a, b));
}

export type MonthSection = { month: string; title: string; totalPence: number; data: Receipt[] };

/** Receipts grouped by the month they were bought, newest month first, each in the given order. */
export function groupByMonth(receipts: Receipt[]): MonthSection[] {
  const sections = new Map<string, MonthSection>();
  for (const receipt of receipts) {
    const month = receipt.purchaseDate.slice(0, 7);
    const section = sections.get(month) ?? { month, title: monthLabel(month), totalPence: 0, data: [] };
    section.totalPence += receipt.pricePence;
    section.data.push(receipt);
    sections.set(month, section);
  }
  return [...sections.values()].sort((a, b) => b.month.localeCompare(a.month));
}
