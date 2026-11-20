import { describe, expect, it } from "@jest/globals";

import { receiptTimeline } from "@/lib/timeline";
import type { Receipt } from "@/types/receipt";

const base: Receipt = {
  id: "r",
  product: "Kettle",
  retailer: "Argos",
  pricePence: 3499,
  purchaseDate: "2026-01-31",
  channel: "online",
  paymentMethod: "debit_card",
  returnWindowDays: 30,
  warrantyMonths: 12,
};

describe("receiptTimeline", () => {
  it("starts with the purchase, then every right in date order with the 6-month point", () => {
    expect(receiptTimeline(base).map((entry) => [entry.key, entry.date])).toEqual([
      ["bought", "2026-01-31"],
      ["online_cancellation", "2026-02-14"],
      ["faulty_reject", "2026-03-02"],
      ["retailer_return", "2026-03-02"],
      ["presumption", "2026-07-31"],
      ["warranty", "2027-01-31"],
    ]);
  });

  it("says where it was bought, and marks only real deadlines as such", () => {
    const [bought, ...rest] = receiptTimeline({ ...base, channel: "in_store", returnWindowDays: undefined, warrantyMonths: undefined });
    expect(bought).toEqual(expect.objectContaining({ title: "Bought", detail: "Argos, in store" }));
    expect(rest.map((entry) => [entry.key, entry.deadline !== undefined])).toEqual([
      ["faulty_reject", true],
      ["presumption", false],
    ]);
  });
});
