import { addMonths } from "@/lib/deadlines";
import { formatPrice } from "@/lib/format";
import type { ReceiptInput } from "@/lib/receipt-input";
import { scannedItems } from "@/lib/scan-result";

/** A note on each form field the scan may have got wrong, saying what to check. */
export type ScanChecks = Partial<Record<keyof ReceiptInput, string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Plain checks on what the scanner read, so the user knows which details to look at before saving. The scanner
 * gives no confidence scores, so these only flag what can be shown to be missing or unlikely.
 */
export function scanChecks(result: unknown, today: string): ScanChecks {
  if (typeof result !== "object" || result === null) return {};
  const data = result as Record<string, unknown>;
  if (data.is_receipt === false) return {};
  const checks: ScanChecks = {};

  if (typeof data.retailer !== "string" || !data.retailer.trim()) {
    checks.retailer = "Couldn't read the shop's name. Add it from the receipt.";
  }

  const total = typeof data.total_pence === "number" && Number.isInteger(data.total_pence) ? data.total_pence : undefined;
  const items = scannedItems(result);
  const priced = items.filter((item) => item.pricePence !== undefined);
  if (total === undefined || total <= 0) {
    checks.price = "Couldn't read the total. Enter it from the receipt.";
  } else if (items.length > 1 && priced.length === items.length) {
    const sum = priced.reduce((running, item) => running + (item.pricePence ?? 0), 0);
    // Off by a penny is rounding; more could be a misread, or a discount the scan didn't list.
    if (Math.abs(sum - total) > 1) {
      checks.price = `The items add up to ${formatPrice(sum)}. Check the total; a discount could explain it.`;
    }
  }

  const date = typeof data.purchase_date === "string" ? data.purchase_date.trim() : "";
  if (!ISO_DATE.test(date)) {
    checks.purchaseDate = "Couldn't read the date. Check it against the receipt.";
  } else if (date > today) {
    checks.purchaseDate = "This date is in the future. Check the day and month.";
  } else if (date < addMonths(today, -24)) {
    checks.purchaseDate = "This is over 2 years ago. Check the year.";
  }

  return checks;
}
