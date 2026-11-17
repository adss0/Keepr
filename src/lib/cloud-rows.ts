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
  photo: string | null;
  space_id: string | null;
  /** Set by the database; not sent when saving. */
  user_id?: string;
  updated_at?: string;
};

/** A row in the Supabase `subscriptions` table. */
export type SubscriptionRow = {
  id: string;
  name: string;
  price_pence: number;
  cycle: BillingCycle;
  next_renewal: string;
  trial_ends: string | null;
  space_id: string | null;
  user_id?: string;
  updated_at?: string;
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
    photo: receipt.photo ?? null,
    space_id: receipt.spaceId ?? null,
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
    // Rows saved before photos existed have no photo column value at all.
    ...(row.photo != null && { photo: row.photo }),
    ...cloudFields(row),
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
    space_id: subscription.spaceId ?? null,
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
    ...cloudFields(row),
  };
}

/** Space and owner, which only the cloud knows. Old rows may lack the columns entirely. */
function cloudFields(row: { space_id?: string | null; user_id?: string }) {
  return {
    ...(row.space_id != null && { spaceId: row.space_id }),
    ...(row.user_id && { ownerId: row.user_id }),
  };
}

/** The items whose saved row differs from `base` (or aren't in it): changes not yet in the cloud. */
export function changedSince<T extends { id: string }, R>(items: T[], base: T[], toRow: (item: T) => R): T[] {
  const before = new Map(base.map((item) => [item.id, JSON.stringify(toRow(item))]));
  return items.filter((item) => before.get(item.id) !== JSON.stringify(toRow(item)));
}

/**
 * Combines the phone's list with the cloud's, for several people editing the same items. `base` is what
 * the cloud held at the last sync on this phone, so no clocks are needed:
 * - changed on this phone since then: the phone's copy wins (it's pushed next);
 * - otherwise, if the cloud has it: the cloud's copy (someone else may have edited it);
 * - on the phone, unchanged, but gone from the cloud: someone deleted it, so it goes;
 * - new on the phone: kept. Only in the cloud: added.
 * Returns `local` itself when nothing changes.
 */
export function reconcile<T extends { id: string }, R>(local: T[], remote: T[], base: T[], toRow: (item: T) => R): T[] {
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const baseIds = new Set(base.map((item) => item.id));
  const dirty = new Set(changedSince(local, base, toRow).map((item) => item.id));
  let changed = false;
  const result: T[] = [];
  for (const item of local) {
    const cloud = remoteById.get(item.id);
    remoteById.delete(item.id);
    if (dirty.has(item.id) && (cloud || !baseIds.has(item.id))) {
      result.push(item);
    } else if (cloud) {
      const same = JSON.stringify(cloud) === JSON.stringify(item);
      result.push(same ? item : cloud);
      changed ||= !same;
    } else {
      changed = true; // Deleted elsewhere (or edited here after someone else deleted it: the delete wins).
    }
  }
  for (const item of remoteById.values()) {
    result.push(item);
    changed = true;
  }
  return changed ? result : local;
}

/** Ids that were in `before` but are gone from `after`, i.e. deleted on the phone. */
export function removedIds<T extends { id: string }>(before: T[], after: T[]): string[] {
  const afterIds = new Set(after.map((item) => item.id));
  return before.filter((item) => !afterIds.has(item.id)).map((item) => item.id);
}
