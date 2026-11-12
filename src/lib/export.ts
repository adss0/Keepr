import { getNextDeadline } from "@/lib/deadlines";
import type { PaymentMethod, Receipt } from "@/types/receipt";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
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
  "Next deadline",
  "Next deadline date",
];

/** Quotes a CSV field when it contains a comma, quote or line break. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** All receipts as CSV, oldest purchase first, ready to open in Excel, Numbers or Google Sheets. */
export function receiptsToCsv(receipts: Receipt[], today: string): string {
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
        deadline?.label ?? "",
        deadline?.date ?? "",
      ];
    });

  return [HEADERS, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}
