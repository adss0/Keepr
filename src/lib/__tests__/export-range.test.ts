import { describe, expect, it } from "@jest/globals";

import { periodRange, rangeFileSuffix, receiptsInRange } from "@/lib/export-range";
import type { ReceiptStatus } from "@/lib/receipt-status";
import type { Receipt } from "@/types/receipt";

const ALL = new Set<ReceiptStatus>(["active", "returned", "claimed", "archived"]);

const make = (id: string, purchaseDate: string, closed?: Receipt["closed"]): Receipt => ({
  id,
  retailer: "Argos",
  product: id,
  pricePence: 100,
  purchaseDate,
  channel: "in_store",
  paymentMethod: "cash",
  ...(closed && { closed }),
});

describe("periodRange", () => {
  const today = "2026-11-18";
  it("covers the usual periods", () => {
    expect(periodRange("month", today)).toEqual({ from: "2026-11-01", to: today });
    expect(periodRange("3months", today)).toEqual({ from: "2026-09-01", to: today });
    expect(periodRange("year", today)).toEqual({ from: "2026-01-01", to: today });
    expect(periodRange("lastYear", today)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(periodRange("all", today)).toEqual({});
  });

  it("swaps picked dates given the wrong way round", () => {
    expect(periodRange("custom", today, { from: "2026-05-01", to: "2026-02-01" })).toEqual({
      from: "2026-02-01",
      to: "2026-05-01",
    });
  });
});

describe("receiptsInRange", () => {
  const receipts = [
    make("dec", "2025-12-31"),
    make("feb", "2026-02-01"),
    make("jan", "2026-01-01"),
    make("returned", "2026-03-01", { reason: "returned", on: "2026-03-05" }),
  ];

  it("keeps both end dates, oldest first", () => {
    const ids = receiptsInRange(receipts, { from: "2026-01-01", to: "2026-02-01" }, ALL).map((r) => r.id);
    expect(ids).toEqual(["jan", "feb"]);
  });

  it("leaves out finished receipts when asked", () => {
    expect(receiptsInRange(receipts, {}, ALL)).toHaveLength(4);
    expect(receiptsInRange(receipts, {}, new Set(["active"] as const)).map((r) => r.id)).not.toContain("returned");
    expect(receiptsInRange(receipts, {}, new Set(["returned"] as const)).map((r) => r.id)).toEqual(["returned"]);
  });

  it("names files by the range", () => {
    expect(rangeFileSuffix({ from: "2026-01-01", to: "2026-02-01" }, "2026-11-18")).toBe("2026-01-01-to-2026-02-01");
    expect(rangeFileSuffix({}, "2026-11-18")).toBe("all-to-2026-11-18");
  });
});
