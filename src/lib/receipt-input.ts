import type { PaymentMethod, PurchaseChannel, Receipt } from "@/types/receipt";

/** What the add/edit form holds: everything as typed text, before validation. */
export type ReceiptInput = {
  product: string;
  retailer: string;
  price: string;
  purchaseDate: string;
  channel: PurchaseChannel;
  paymentMethod: PaymentMethod;
  returnWindowDays: string;
  warrantyMonths: string;
};

export type ReceiptInputErrors = Partial<Record<keyof ReceiptInput, string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "79.99", "£79.99" or "1,234.5" → pence. Undefined if it isn't a valid amount. */
export function parsePriceToPence(text: string): number | undefined {
  const cleaned = text.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const [pounds, pence = ""] = cleaned.split(".");
  return Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
}

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

function parseWholeNumber(text: string): number | undefined {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
}

export function emptyReceiptInput(today: string): ReceiptInput {
  return {
    product: "",
    retailer: "",
    price: "",
    purchaseDate: today,
    channel: "in_store",
    paymentMethod: "debit_card",
    returnWindowDays: "",
    warrantyMonths: "",
  };
}

export function receiptToInput(receipt: Receipt): ReceiptInput {
  const pounds = Math.floor(receipt.pricePence / 100);
  const pence = String(receipt.pricePence % 100).padStart(2, "0");
  return {
    product: receipt.product,
    retailer: receipt.retailer,
    price: `${pounds}.${pence}`,
    purchaseDate: receipt.purchaseDate,
    channel: receipt.channel,
    paymentMethod: receipt.paymentMethod,
    returnWindowDays: receipt.returnWindowDays?.toString() ?? "",
    warrantyMonths: receipt.warrantyMonths?.toString() ?? "",
  };
}

/**
 * Checks the form and turns it into receipt fields.
 * Returns either `errors` (field → message) or the parsed `value`.
 */
export function validateReceiptInput(
  input: ReceiptInput,
  today: string,
): { errors: ReceiptInputErrors; value?: undefined } | { errors?: undefined; value: Omit<Receipt, "id"> } {
  const errors: ReceiptInputErrors = {};

  if (!input.product.trim()) errors.product = "Enter what you bought";
  if (!input.retailer.trim()) errors.retailer = "Enter the shop";

  const pricePence = parsePriceToPence(input.price);
  if (pricePence === undefined) errors.price = "Enter a price, like 79.99";

  if (!isRealDate(input.purchaseDate)) {
    errors.purchaseDate = "Use the format YYYY-MM-DD";
  } else if (input.purchaseDate > today) {
    errors.purchaseDate = "The purchase date can't be in the future";
  }

  const returnWindowDays = input.returnWindowDays.trim() ? parseWholeNumber(input.returnWindowDays) : undefined;
  if (input.returnWindowDays.trim() && returnWindowDays === undefined) {
    errors.returnWindowDays = "Enter a number of days, or leave it blank";
  }

  const warrantyMonths = input.warrantyMonths.trim() ? parseWholeNumber(input.warrantyMonths) : undefined;
  if (input.warrantyMonths.trim() && warrantyMonths === undefined) {
    errors.warrantyMonths = "Enter a number of months, or leave it blank";
  }

  if (Object.keys(errors).length > 0 || pricePence === undefined) return { errors };

  return {
    value: {
      product: input.product.trim(),
      retailer: input.retailer.trim(),
      pricePence,
      purchaseDate: input.purchaseDate,
      channel: input.channel,
      paymentMethod: input.paymentMethod,
      ...(returnWindowDays !== undefined && { returnWindowDays }),
      ...(warrantyMonths !== undefined && { warrantyMonths }),
    },
  };
}
