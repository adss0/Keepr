import { formatFullDate } from "@/lib/format";
import { lastMonths, monthLabel, spendByMonth, spendByShop } from "@/lib/insights";
import { PAYMENT_LABELS } from "@/lib/export";
import { monthlyCostPence, nextRenewalOnOrAfter, totalMonthlyPence, totalYearlyPence } from "@/lib/subscriptions";
import type { Sheet } from "@/lib/xlsx";
import type { Receipt } from "@/types/receipt";
import type { BillingCycle, Subscription } from "@/types/subscription";

const CYCLE_LABELS: Record<BillingCycle, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
const money = (pence: number) => ({ money: pence / 100 });

/** Every month from the earliest purchase to this month (at least the last 12). */
function monthsCovered(receipts: Receipt[], today: string): string[] {
  const earliest = receipts.reduce((min, r) => (r.purchaseDate < min ? r.purchaseDate : min), today);
  const span =
    (Number(today.slice(0, 4)) - Number(earliest.slice(0, 4))) * 12 +
    (Number(today.slice(5, 7)) - Number(earliest.slice(5, 7))) +
    1;
  return lastMonths(today, Math.max(12, span));
}

/** The spending breakdown workbook: summary, by month, by shop, and every receipt and subscription. */
export function spendingWorkbook(receipts: Receipt[], subscriptions: Subscription[], today: string): Sheet[] {
  const totalPence = receipts.reduce((sum, r) => sum + r.pricePence, 0);
  const yearAgo = lastMonths(today, 12)[0];
  const last12Pence = receipts.filter((r) => r.purchaseDate.slice(0, 7) >= yearAgo).reduce((sum, r) => sum + r.pricePence, 0);
  const subsMonthly = totalMonthlyPence(subscriptions);
  const months = spendByMonth(receipts, monthsCovered(receipts, today));
  const sortedReceipts = [...receipts].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));

  return [
    {
      name: "Summary",
      widths: [34, 16],
      rows: [
        ["Keepr spending breakdown", formatFullDate(today)],
        ["Total spent (all receipts)", money(totalPence)],
        ["Spent in the last 12 months", money(last12Pence)],
        ["Number of receipts", receipts.length],
        ["Average purchase", money(receipts.length ? Math.round(totalPence / receipts.length) : 0)],
        ["Subscriptions per month", money(subsMonthly)],
        ["Subscriptions per year", money(totalYearlyPence(subscriptions))],
      ],
    },
    {
      name: "By month",
      widths: [12, 10, 14, 24, 14],
      rows: [
        ["Month", "Receipts", "Spent", "Subscriptions (per month)", "Total"],
        // Newest first, the way people read spending.
        ...[...months].reverse().map((m) => [
          monthLabel(m.month),
          m.count,
          money(m.pence),
          money(subsMonthly),
          money(m.pence + subsMonthly),
        ]),
      ],
    },
    {
      name: "By shop",
      widths: [28, 11, 14, 14],
      rows: [
        ["Shop", "Purchases", "Total spent", "Average"],
        ...spendByShop(receipts).map((s) => [s.shop, s.count, money(s.pence), money(Math.round(s.pence / s.count))]),
      ],
    },
    {
      name: "Receipts",
      widths: [14, 32, 24, 10, 14, 12, 20, 18],
      rows: [
        ["Date bought", "Product", "Shop", "Bought", "Paid by", "Price", "Return window (days)", "Warranty (months)"],
        ...sortedReceipts.map((r) => [
          r.purchaseDate,
          r.product,
          r.retailer,
          r.channel === "online" ? "Online" : "In store",
          PAYMENT_LABELS[r.paymentMethod],
          money(r.pricePence),
          r.returnWindowDays ?? null,
          r.warrantyMonths ?? null,
        ]),
      ],
    },
    {
      name: "Subscriptions",
      widths: [26, 10, 12, 12, 12, 14, 12],
      rows: [
        ["Name", "Billing", "Price", "Per month", "Per year", "Next payment", "Trial ends"],
        ...subscriptions.map((s) => [
          s.name,
          CYCLE_LABELS[s.cycle],
          money(s.pricePence),
          money(monthlyCostPence(s)),
          money(totalYearlyPence([s])),
          nextRenewalOnOrAfter(s, today),
          s.trialEnds ?? null,
        ]),
      ],
    },
  ];
}
