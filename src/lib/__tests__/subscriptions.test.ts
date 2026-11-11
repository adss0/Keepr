import { describe, expect, it } from "@jest/globals";

import {
  monthlyCostPence,
  nextRenewalOnOrAfter,
  sortByNextCharge,
  totalMonthlyPence,
  totalYearlyPence,
} from "@/lib/subscriptions";
import type { Subscription } from "@/types/subscription";

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "s1",
    name: "Netflix",
    pricePence: 1099,
    cycle: "monthly",
    nextRenewal: "2026-11-20",
    ...overrides,
  };
}

describe("costs", () => {
  it("converts every cycle to a monthly cost", () => {
    expect(monthlyCostPence(sub({ cycle: "monthly", pricePence: 1099 }))).toBe(1099);
    expect(monthlyCostPence(sub({ cycle: "yearly", pricePence: 12000 }))).toBe(1000);
    expect(monthlyCostPence(sub({ cycle: "weekly", pricePence: 300 }))).toBe(1300);
  });

  it("totals monthly and yearly spend", () => {
    const subs = [sub({ pricePence: 1000 }), sub({ id: "s2", cycle: "yearly", pricePence: 6000 })];
    expect(totalMonthlyPence(subs)).toBe(1500);
    expect(totalYearlyPence(subs)).toBe(18000);
  });
});

describe("nextRenewalOnOrAfter", () => {
  it("keeps a renewal that hasn't happened yet", () => {
    expect(nextRenewalOnOrAfter(sub(), "2026-11-11")).toBe("2026-11-20");
  });

  it("rolls a passed renewal forward by whole cycles", () => {
    expect(nextRenewalOnOrAfter(sub({ nextRenewal: "2026-09-20" }), "2026-11-21")).toBe("2026-12-20");
    expect(nextRenewalOnOrAfter(sub({ cycle: "weekly", nextRenewal: "2026-11-01" }), "2026-11-11")).toBe(
      "2026-11-15",
    );
    expect(nextRenewalOnOrAfter(sub({ cycle: "yearly", nextRenewal: "2025-03-01" }), "2026-11-11")).toBe(
      "2027-03-01",
    );
  });

  it("keeps billing on the 31st where the month has one", () => {
    expect(nextRenewalOnOrAfter(sub({ nextRenewal: "2026-01-31" }), "2026-03-15")).toBe("2026-03-31");
  });
});

describe("sortByNextCharge", () => {
  it("puts the soonest charge first, counting trial ends", () => {
    const subs = [
      sub({ id: "later", nextRenewal: "2026-11-30" }),
      sub({ id: "trial", nextRenewal: "2026-12-25", trialEnds: "2026-11-14" }),
      sub({ id: "soon", nextRenewal: "2026-11-20" }),
    ];
    expect(sortByNextCharge(subs, "2026-11-11").map((s) => s.id)).toEqual(["trial", "soon", "later"]);
  });
});
