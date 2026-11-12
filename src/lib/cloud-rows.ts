import type { PaymentMethod, PurchaseChannel, Receipt } from "@/types/receipt";
import type { BillingCycle, Subscription } from "@/types/subscription";

/** A row in the Supabase `receipts` table (see supabase/migrations). */
export type ReceiptRow = {
  id: string;
  product: string;
  retailer: string;
  price_pence: number;
  purchase_date: string;
  channel: PurchaseChannel;
  payment_method: PaymentMethod;
  return_window_days: number | null;
  warranty_months: number | null;
};

/** A row in the Supabase `subscriptions` table. */
export type SubscriptionRow = {
  id: string;
  name: string;
  price_pence: number;
  cycle: BillingCycle;
  next_renewal: string;
  trial_ends: string | null;
};

export function receiptToRow(receipt: Receipt): ReceiptRow {
  return {
    id: receipt.id,
    product: receipt.product,
    retailer: receipt.retailer,
    price_pence: receipt.pricePence,
    purchase_date: receipt.purchaseDate,
    channel: receipt.channel,
    payment_method: receipt.paymentMethod,
    return_window_days: receipt.returnWindowDays ?? null,
    warranty_months: receipt.warrantyMonths ?? null,
  };
}

export function rowToReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    product: row.product,
    retailer: row.retailer,
    pricePence: row.price_pence,
    purchaseDate: row.purchase_date,
    channel: row.channel,
    paymentMethod: row.payment_method,
    ...(row.return_window_days !== null && { returnWindowDays: row.return_window_days }),
    ...(row.warranty_months !== null && { warrantyMonths: row.warranty_months }),
  };
}

export function subscriptionToRow(subscription: Subscription): SubscriptionRow {
  return {
    id: subscription.id,
    name: subscription.name,
    price_pence: subscription.pricePence,
    cycle: subscription.cycle,
    next_renewal: subscription.nextRenewal,
    trial_ends: subscription.trialEnds ?? null,
  };
}

export function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    pricePence: row.price_pence,
    cycle: row.cycle,
    nextRenewal: row.next_renewal,
    ...(row.trial_ends !== null && { trialEnds: row.trial_ends }),
  };
}

/** Items from both lists, matched by id. When both have the same id, the phone's copy wins. */
export function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const localIds = new Set(local.map((item) => item.id));
  return [...local, ...remote.filter((item) => !localIds.has(item.id))];
}

/** Ids that were in `before` but are gone from `after`, i.e. deleted on the phone. */
export function removedIds<T extends { id: string }>(before: T[], after: T[]): string[] {
  const afterIds = new Set(after.map((item) => item.id));
  return before.filter((item) => !afterIds.has(item.id)).map((item) => item.id);
}
