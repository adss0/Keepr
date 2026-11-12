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
