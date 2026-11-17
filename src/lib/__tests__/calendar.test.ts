import { describe, expect, it } from "@jest/globals";

import { calendarEvents, monthGrid } from "@/lib/calendar";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

const kettle: Receipt = {
  id: "r1",
  product: "Kettle",
  retailer: "Argos",
  pricePence: 3499,
  purchaseDate: "2026-11-01",
  channel: "online",
  paymentMethod: "debit_card",
};

const netflix: Subscription = {
  id: "s1",
  name: "Netflix",
  pricePence: 1099,
  cycle: "weekly",
  nextRenewal: "2026-11-03",
};

describe("calendarEvents", () => {
  it("lists receipt deadlines and every renewal in the range", () => {
    const events = calendarEvents([kettle], [netflix], "2026-11-01", "2026-11-30");
    expect(events.get("2026-11-15")?.map((e) => e.title)).toEqual(["Cancel for any reason"]);
    const renewals = [...events.values()].flat().filter((e) => e.kind === "renewal").map((e) => e.date);
    expect(renewals).toEqual(["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"]);
  });

  it("starts payments after a free trial", () => {
    const events = calendarEvents([], [{ ...netflix, trialEnds: "2026-11-12" }], "2026-11-01", "2026-11-30");
    const all = [...events.values()].flat();
    expect(all.find((e) => e.kind === "trial")?.date).toBe("2026-11-12");
    expect(all.filter((e) => e.kind === "renewal").map((e) => e.date)).toEqual(["2026-11-17", "2026-11-24"]);
  });
});

describe("monthGrid", () => {
  it("starts on a Monday and covers the whole month", () => {
    const weeks = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(weeks[0][0]).toBe("2026-10-26");
    expect(weeks[0][6]).toBe("2026-11-01");
    expect(weeks.at(-1)?.includes("2026-11-30")).toBe(true);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});
