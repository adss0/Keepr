import type { Receipt } from "@/types/receipt";

/** Receipts whose product, shop, order or serial number, notes or printed text (from a scan) contain every word in `query`, ignoring case. */
export function searchReceipts(receipts: Receipt[], query: string): Receipt[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return receipts;
  return receipts.filter((receipt) => {
    const haystack = [receipt.product, receipt.retailer, receipt.orderNumber, receipt.serialNumber, receipt.notes, receipt.printedText]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
