import type { Receipt } from "@/types/receipt";

/** Receipts whose product or shop contains every word in `query` (case-insensitive). */
export function searchReceipts(receipts: Receipt[], query: string): Receipt[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return receipts;
  return receipts.filter((receipt) => {
    const haystack = `${receipt.product} ${receipt.retailer}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
