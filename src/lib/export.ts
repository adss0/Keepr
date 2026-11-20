import { getNextDeadline } from "@/lib/deadlines";
import type { PaymentMethod, Receipt } from "@/types/receipt";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  credit_card: "Credit card",
  debit_card: "Debit card",
  cash: "Cash",
  other: "Other",
};

const HEADERS = [
  "Product",
  "Shop",
  "Price (GBP)",
  "Date bought",
  "Bought",
  "Paid by",
  "Return window (days)",
  "Warranty (months)",
];
const DEADLINE_HEADERS = ["Next deadline", "Next deadline date"];

/**
 * Quotes a CSV field when it contains a comma, quote or line break. Text starting with = + - @ or a tab is a formula
 * to Excel and Sheets, and a shared space's member could name a product "=HYPERLINK(...)", so it gets a leading
 * apostrophe, which spreadsheets show as plain text.
 */
export function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * All receipts as CSV, oldest purchase first, ready to open in Excel, Numbers or Google Sheets.
 * `withDeadlines` adds each one's next deadline and its date.
 */
export function receiptsToCsv(receipts: Receipt[], today: string, withDeadlines = true): string {
  const rows = [...receipts]
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
    .map((receipt) => {
      const deadline = getNextDeadline(receipt, today);
      return [
        receipt.product,
        receipt.retailer,
        (receipt.pricePence / 100).toFixed(2),
        receipt.purchaseDate,
        receipt.channel === "online" ? "Online" : "In store",
        PAYMENT_LABELS[receipt.paymentMethod],
        receipt.returnWindowDays?.toString() ?? "",
        receipt.warrantyMonths?.toString() ?? "",
        ...(withDeadlines ? [deadline?.label ?? "", deadline?.date ?? ""] : []),
      ];
    });

  return [withDeadlines ? [...HEADERS, ...DEADLINE_HEADERS] : HEADERS, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}
