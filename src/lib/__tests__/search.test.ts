import { describe, expect, it } from "@jest/globals";

import { searchReceipts } from "@/lib/search";
import type { Receipt } from "@/types/receipt";

function receipt(id: string, product: string, retailer: string): Receipt {
  return {
    id,
    product,
    retailer,
    pricePence: 100,
    purchaseDate: "2026-11-01",
    channel: "in_store",
    paymentMethod: "cash",
  };
}

const receipts = [
  receipt("1", "Sony headphones", "Currys"),
  receipt("2", "Nike trainers", "JD Sports"),
  receipt("3", "Kettle", "Argos"),
];

describe("searchReceipts", () => {
  it("returns everything for an empty query", () => {
    expect(searchReceipts(receipts, "  ")).toEqual(receipts);
  });

  it("matches product or shop, ignoring case", () => {
    expect(searchReceipts(receipts, "SONY").map((r) => r.id)).toEqual(["1"]);
    expect(searchReceipts(receipts, "argos").map((r) => r.id)).toEqual(["3"]);
  });

  it("requires every word to match", () => {
    expect(searchReceipts(receipts, "nike jd").map((r) => r.id)).toEqual(["2"]);
    expect(searchReceipts(receipts, "nike argos")).toEqual([]);
  });
});
