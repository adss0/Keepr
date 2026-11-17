import type { Receipt } from "@/types/receipt";

/** The made-up receipts older versions of Keepr could add with "Try it with sample receipts". */
const OLD_SAMPLES: [product: string, retailer: string, pricePence: number][] = [
  ["Sony headphones", "Currys", 7999],
  ["Nike trainers", "JD Sports", 9500],
  ["Washing machine", "AO.com", 44900],
  ["Kettle", "Argos", 3499],
  ["iPad Air", "Apple", 59900],
  ["Weekly shop", "Tesco", 6243],
];

/** True if this receipt is one of the old sample receipts (same product, shop and price). */
export function isOldSample(receipt: Pick<Receipt, "product" | "retailer" | "pricePence">): boolean {
  return OLD_SAMPLES.some(
    ([product, retailer, pricePence]) =>
      receipt.product === product && receipt.retailer === retailer && receipt.pricePence === pricePence,
  );
}
