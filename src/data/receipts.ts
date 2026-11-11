import { sampleReceipts } from "@/data/sample-receipts";
import type { Receipt } from "@/types/receipt";

/** All receipts. Backed by sample data until receipts can be saved. */
export function useReceipts(): Receipt[] {
  return sampleReceipts;
}

export function useReceipt(id: string | undefined): Receipt | undefined {
  return useReceipts().find((receipt) => receipt.id === id);
}
