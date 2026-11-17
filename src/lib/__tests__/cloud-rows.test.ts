import { describe, expect, it } from "@jest/globals";

import {
  changedSince,
  receiptToRow,
  reconcile,
  removedIds,
  rowToReceipt,
  rowToSubscription,
  subscriptionToRow,
} from "@/lib/cloud-rows";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

const receipt: Receipt = {
  id: "11111111-1111-4111-8111-111111111111",
  product: "Kettle",
  retailer: "Argos",
  pricePence: 3499,
  purchaseDate: "2026-11-01",
  channel: "in_store",
  paymentMethod: "cash",
  warrantyMonths: 12,
};

const subscription: Subscription = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Netflix",
  pricePence: 1099,
  cycle: "monthly",
  nextRenewal: "2026-11-20",
};

describe("row mapping", () => {
  it("round-trips a receipt, storing missing optional fields as null", () => {
    const row = receiptToRow(receipt);
    expect(row.return_window_days).toBeNull();
    expect(row.warranty_months).toBe(12);
    expect(rowToReceipt(row)).toEqual(receipt);
  });

  it("keeps a receipt's photo, and reads rows saved before photos existed", () => {
    const withPhoto = { ...receipt, photo: `${receipt.id}.jpg` };
    expect(receiptToRow(withPhoto).photo).toBe(`${receipt.id}.jpg`);
    expect(rowToReceipt(receiptToRow(withPhoto))).toEqual(withPhoto);
    const { photo: _photo, ...oldRow } = receiptToRow(receipt);
    expect(rowToReceipt(oldRow as ReturnType<typeof receiptToRow>)).toEqual(receipt);
  });

  it("round-trips a subscription", () => {
    expect(subscriptionToRow(subscription).trial_ends).toBeNull();
    expect(rowToSubscription(subscriptionToRow(subscription))).toEqual(subscription);
  });
});

describe("reconcile", () => {
  type Item = { id: string; v: string; ownerId?: string };
  const toRow = ({ id, v }: Item) => ({ id, v });
  const base: Item[] = [
    { id: "kept", v: "1" },
    { id: "edited-here", v: "1" },
    { id: "edited-there", v: "1" },
    { id: "deleted-there", v: "1" },
  ];

  it("keeps changes made here, takes changes made elsewhere, and applies remote deletes", () => {
    const local: Item[] = [
      { id: "kept", v: "1" },
      { id: "edited-here", v: "2" },
      { id: "edited-there", v: "1" },
      { id: "deleted-there", v: "1" },
      { id: "new-here", v: "1" },
    ];
    const remote: Item[] = [
      { id: "kept", v: "1" },
      { id: "edited-here", v: "1" },
      { id: "edited-there", v: "9", ownerId: "sam" },
      { id: "new-there", v: "1", ownerId: "sam" },
    ];
    expect(reconcile(local, remote, base, toRow)).toEqual([
      { id: "kept", v: "1" },
      { id: "edited-here", v: "2" },
      { id: "edited-there", v: "9", ownerId: "sam" },
      { id: "new-here", v: "1" },
      { id: "new-there", v: "1", ownerId: "sam" },
    ]);
  });

  it("returns the same list when nothing changed, so nothing re-renders or re-syncs", () => {
    const local: Item[] = [{ id: "kept", v: "1" }];
    expect(reconcile(local, [{ id: "kept", v: "1" }], [{ id: "kept", v: "1" }], toRow)).toBe(local);
  });

  it("keeps the phone's copy on a first sync, when there's no base yet", () => {
    expect(reconcile([{ id: "a", v: "phone" }], [{ id: "a", v: "cloud" }], [], toRow)).toEqual([{ id: "a", v: "phone" }]);
  });
});

describe("changedSince", () => {
  it("finds new and edited items, ignoring fields that aren't saved", () => {
    const toRow = ({ id, v }: { id: string; v: string; ownerId?: string }) => ({ id, v });
    const items = [{ id: "a", v: "1", ownerId: "me" }, { id: "b", v: "2" }, { id: "c", v: "1" }];
    expect(changedSince(items, [{ id: "a", v: "1" }, { id: "b", v: "1" }], toRow).map((i) => i.id)).toEqual(["b", "c"]);
  });
});

describe("removedIds", () => {
  it("finds items that were deleted", () => {
    expect(removedIds([{ id: "a" }, { id: "b" }, { id: "c" }], [{ id: "b" }])).toEqual(["a", "c"]);
  });
});
