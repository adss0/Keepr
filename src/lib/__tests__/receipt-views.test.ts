import { describe, expect, it } from "@jest/globals";

import { groupByMonth, sortReceipts } from "@/lib/receipt-views";
import type { Receipt } from "@/types/receipt";

function receipt(id: string, purchaseDate: string, pricePence: number, returnWindowDays?: number): Receipt {
  return { id, product: id, retailer: "Shop", pricePence, purchaseDate, channel: "in_store", paymentMethod: "cash", returnWindowDays };
}

const TODAY = "2026-11-17";
const receipts = [
  receipt("old-cheap", "2026-09-01", 500),
  receipt("new-dear", "2026-11-15", 9000),
  receipt("mid-soon", "2026-10-20", 2000, 30), // store return ends 19 Nov
];

describe("sortReceipts", () => {
  it("sorts by soonest deadline, newest purchase, or highest price", () => {
    expect(sortReceipts(receipts, "deadline", TODAY).map((r) => r.id)).toEqual(["mid-soon", "new-dear", "old-cheap"]);
    expect(sortReceipts(receipts, "newest", TODAY).map((r) => r.id)).toEqual(["new-dear", "mid-soon", "old-cheap"]);
    expect(sortReceipts(receipts, "price", TODAY).map((r) => r.id)).toEqual(["new-dear", "mid-soon", "old-cheap"]);
  });

  it("doesn't change the list it was given", () => {
    const copy = [...receipts];
    sortReceipts(receipts, "price", TODAY);
    expect(receipts).toEqual(copy);
  });
});

describe("groupByMonth", () => {
  it("groups by purchase month, newest month first, with totals", () => {
    const sections = groupByMonth(sortReceipts(receipts, "newest", TODAY));
    expect(sections.map((s) => [s.title, s.totalPence, s.data.length])).toEqual([
      ["Nov 2026", 9000, 1],
      ["Oct 2026", 2000, 1],
      ["Sep 2026", 500, 1],
    ]);
  });
});
