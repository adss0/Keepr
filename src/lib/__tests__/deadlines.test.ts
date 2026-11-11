import { describe, expect, it } from "@jest/globals";

import { addDays, daysBetween, getDeadlines, getNextDeadline, todayIso } from "@/lib/deadlines";
import type { Receipt } from "@/types/receipt";

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: "r1",
    retailer: "Currys",
    product: "Headphones",
    pricePence: 7999,
    purchaseDate: "2026-01-31",
    channel: "in_store",
    paymentMethod: "debit_card",
    ...overrides,
  };
}

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("subtracts days", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("daysBetween", () => {
  it("counts whole days forward and backward", () => {
    expect(daysBetween("2026-11-01", "2026-11-05")).toBe(4);
    expect(daysBetween("2026-11-05", "2026-11-01")).toBe(-4);
    expect(daysBetween("2026-11-05", "2026-11-05")).toBe(0);
  });
});

describe("todayIso", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("getDeadlines", () => {
  it("always includes the 30-day right to reject", () => {
    const deadlines = getDeadlines(receipt());
    expect(deadlines).toEqual([
      { kind: "faulty_reject", label: "Refund if faulty", date: "2026-03-02" },
    ]);
  });

  it("adds the 14-day cancellation period for online orders", () => {
    const kinds = getDeadlines(receipt({ channel: "online" })).map((d) => d.kind);
    expect(kinds).toContain("online_cancellation");
  });

  it("adds the retailer return window and warranty, sorted soonest first", () => {
    const deadlines = getDeadlines(
      receipt({ channel: "online", returnWindowDays: 21, warrantyMonths: 12 }),
    );
    expect(deadlines.map((d) => [d.kind, d.date])).toEqual([
      ["online_cancellation", "2026-02-14"],
      ["retailer_return", "2026-02-21"],
      ["faulty_reject", "2026-03-02"],
      ["warranty", "2027-01-31"],
    ]);
  });

  it("clamps warranty end dates to the end of the month", () => {
    const warranty = getDeadlines(receipt({ warrantyMonths: 1 })).find((d) => d.kind === "warranty");
    expect(warranty?.date).toBe("2026-02-28");
  });
});

describe("getNextDeadline", () => {
  it("skips deadlines that have passed", () => {
    const next = getNextDeadline(receipt({ channel: "online" }), "2026-02-20");
    expect(next?.kind).toBe("faulty_reject");
  });

  it("treats a deadline on today's date as still open", () => {
    const next = getNextDeadline(receipt(), "2026-03-02");
    expect(next?.kind).toBe("faulty_reject");
  });

  it("returns undefined when every deadline has passed", () => {
    expect(getNextDeadline(receipt(), "2026-03-03")).toBeUndefined();
  });
});
