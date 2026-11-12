import { describe, expect, it } from "@jest/globals";

import {
  mergeById,
  receiptToRow,
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

  it("round-trips a subscription", () => {
    expect(subscriptionToRow(subscription).trial_ends).toBeNull();
    expect(rowToSubscription(subscriptionToRow(subscription))).toEqual(subscription);
  });
});

describe("mergeById", () => {
  it("adds remote-only items and keeps the phone's copy on a clash", () => {
    const local = [{ id: "a", v: "phone" }, { id: "b", v: "phone" }];
    const remote = [{ id: "b", v: "cloud" }, { id: "c", v: "cloud" }];
    expect(mergeById(local, remote)).toEqual([
      { id: "a", v: "phone" },
      { id: "b", v: "phone" },
      { id: "c", v: "cloud" },
    ]);
  });
});

describe("removedIds", () => {
  it("finds items that were deleted", () => {
    expect(removedIds([{ id: "a" }, { id: "b" }, { id: "c" }], [{ id: "b" }])).toEqual(["a", "c"]);
  });
});
