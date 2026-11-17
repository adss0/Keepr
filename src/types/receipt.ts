export type PurchaseChannel = "in_store" | "online";

export type PaymentMethod = "credit_card" | "debit_card" | "cash" | "other";

export type Receipt = {
  id: string;
  retailer: string;
  product: string;
  /** Price in pence, to avoid floating-point rounding errors. */
  pricePence: number;
  /** ISO date (YYYY-MM-DD) the item was bought or delivered. */
  purchaseDate: string;
  channel: PurchaseChannel;
  paymentMethod: PaymentMethod;
  /** Retailer's own return window in days, if known. */
  returnWindowDays?: number;
  /** Manufacturer warranty length in months, if known. */
  warrantyMonths?: number;
  /** File name of the receipt's photo or PDF, kept as proof of purchase (see data/receipt-photos). */
  photo?: string;
  /** The shared space (family or organisation) this belongs to; personal when missing. */
  spaceId?: string;
  /** Who added it, from the cloud. Used for shared items' names and photo folders. */
  ownerId?: string;
};
