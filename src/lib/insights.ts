import type { Receipt } from "@/types/receipt";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type MonthSpend = { month: string; pence: number; count: number };
export type ShopSpend = { shop: string; pence: number; count: number };

/** "2026-11" → "Nov 2026". */
export function monthLabel(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** The `count` months ending with the month of `today`, oldest first, as "YYYY-MM". */
export function lastMonths(today: string, count: number): string[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + month - (count - 1 - i);
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

/** Returned items were refunded, so they don't count as spending. */
function kept(receipts: Receipt[]): Receipt[] {
  return receipts.filter((receipt) => receipt.closed?.reason !== "returned");
}

/** Spending per month for the given months (from receipts' purchase dates). */
export function spendByMonth(receipts: Receipt[], months: string[]): MonthSpend[] {
  const totals = new Map(months.map((month) => [month, { month, pence: 0, count: 0 }]));
  for (const receipt of kept(receipts)) {
    const entry = totals.get(receipt.purchaseDate.slice(0, 7));
    if (!entry) continue;
    entry.pence += receipt.pricePence;
    entry.count += 1;
  }
  return months.map((month) => totals.get(month)!);
}

/** Spending per shop, biggest first. Shop names are grouped ignoring case and extra spaces. */
export function spendByShop(receipts: Receipt[], from?: string): ShopSpend[] {
  const totals = new Map<string, ShopSpend>();
  for (const receipt of kept(receipts)) {
    if (from && receipt.purchaseDate < from) continue;
    const name = receipt.retailer.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    const entry = totals.get(key) ?? { shop: name, pence: 0, count: 0 };
    entry.pence += receipt.pricePence;
    entry.count += 1;
    totals.set(key, entry);
  }
  return [...totals.values()].sort((a, b) => b.pence - a.pence || a.shop.localeCompare(b.shop));
}
