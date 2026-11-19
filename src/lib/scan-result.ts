import type { ReceiptInput } from "@/lib/receipt-input";
import type { PaymentMethod, PurchaseChannel } from "@/types/receipt";

const CHANNELS: PurchaseChannel[] = ["in_store", "online"];
const PAYMENT_METHODS: PaymentMethod[] = ["credit_card", "debit_card", "cash", "other"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns what the extract-receipt function returned into form fields.
 * Anything missing or malformed is left as it already was in the form, so the user can fill it in.
 * Returns undefined when the image wasn't a receipt.
 */
export function scanResultToInput(result: unknown, current: ReceiptInput): ReceiptInput | undefined {
  if (typeof result !== "object" || result === null) return undefined;
  const data = result as Record<string, unknown>;
  if (data.is_receipt === false) return undefined;

  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  const wholeNumber = (value: unknown) =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;

  const pence = wholeNumber(data.total_pence);
  const date = text(data.purchase_date);
  const returnDays = wholeNumber(data.return_window_days);
  const warranty = wholeNumber(data.warranty_months);

  return {
    ...current,
    product: text(data.product) ?? current.product,
    retailer: text(data.retailer) ?? current.retailer,
    price: pence !== undefined ? (pence / 100).toFixed(2) : current.price,
    purchaseDate: date && ISO_DATE.test(date) ? date : current.purchaseDate,
    channel: CHANNELS.includes(data.channel as PurchaseChannel) ? (data.channel as PurchaseChannel) : current.channel,
    paymentMethod: PAYMENT_METHODS.includes(data.payment_method as PaymentMethod)
      ? (data.payment_method as PaymentMethod)
      : current.paymentMethod,
    returnWindowDays: returnDays !== undefined ? String(returnDays) : current.returnWindowDays,
    warrantyMonths: warranty !== undefined ? String(warranty) : current.warrantyMonths,
  };
}

/** How many form fields differ between `before` and `after`, to tell the user what a scan filled in. */
export function countChangedFields(before: ReceiptInput, after: ReceiptInput): number {
  return (Object.keys(after) as (keyof ReceiptInput)[]).filter((key) => after[key] !== before[key]).length;
}

export type ScannedItem = { name: string; pricePence?: number };

/** The separate products on a scanned receipt (empty if the scan didn't list them). */
export function scannedItems(result: unknown): ScannedItem[] {
  if (typeof result !== "object" || result === null) return [];
  const items = (result as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item): ScannedItem[] => {
    if (typeof item !== "object" || item === null) return [];
    const { name, price_pence: price } = item as { name?: unknown; price_pence?: unknown };
    if (typeof name !== "string" || !name.trim()) return [];
    const pricePence = typeof price === "number" && Number.isInteger(price) && price >= 0 ? price : undefined;
    return [{ name: name.trim(), pricePence }];
  });
}

/** Kept text is capped so a long PDF can't bloat every sync. */
export const MAX_PRINTED_TEXT = 2000;

/** The words printed on a scanned receipt, tidied for search, or undefined if the scan didn't return them. */
export function scannedText(result: unknown): string | undefined {
  if (typeof result !== "object" || result === null) return undefined;
  const text = (result as { printed_text?: unknown }).printed_text;
  if (typeof text !== "string") return undefined;
  const tidy = text.replace(/\s+/g, " ").trim().slice(0, MAX_PRINTED_TEXT);
  return tidy || undefined;
}

/** "7999" pence → "79.99", as typed in the price field. */
export function penceToInput(pence: number): string {
  return (pence / 100).toFixed(2);
}
