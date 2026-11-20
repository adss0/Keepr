import type { Receipt } from "@/types/receipt";

/** "Marks & Spencer" and "M&S Spencer Ltd." compare on letters and digits only. */
function shopKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * A receipt already kept that looks like the same purchase: same day, same price and the same shop
 * (one name containing the other, so "Tesco" matches "Tesco Express"). Only a warning; both can be kept.
 */
export function findDuplicate(
  receipts: Receipt[],
  candidate: Pick<Receipt, "retailer" | "pricePence" | "purchaseDate">,
): Receipt | undefined {
  const shop = shopKey(candidate.retailer);
  if (!shop) return undefined;
  return receipts.find((receipt) => {
    if (receipt.purchaseDate !== candidate.purchaseDate || receipt.pricePence !== candidate.pricePence) return false;
    const other = shopKey(receipt.retailer);
    return other !== "" && (other.includes(shop) || shop.includes(other));
  });
}
