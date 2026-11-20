import { describe, expect, it } from "@jest/globals";

import { needsAttention } from "@/lib/attention";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

const today = "2026-11-20";

function receipt(id: string, purchaseDate: string, extra: Partial<Receipt> = {}): Receipt {
  return {
    id,
    product: `Product ${id}`,
    retailer: "Argos",
    pricePence: 2999,
    purchaseDate,
    channel: "in_store",
    paymentMethod: "debit_card",
    ...extra,
  };
}

function subscription(id: string, nextRenewal: string, extra: Partial<Subscription> = {}): Subscription {
  return { id, name: `Sub ${id}`, pricePence: 999, cycle: "monthly", nextRenewal, ...extra };
}

describe("needsAttention", () => {
  it("is empty, with nothing later, when there's nothing", () => {
    expect(needsAttention([], [], today)).toEqual({ now: [], later: undefined });
  });

  it("lists a receipt deadline inside two weeks, with its price and shop", () => {
    // Bought in store 20 days ago: the 30-day refund right ends in 10 days.
    const { now } = needsAttention([receipt("a", "2026-10-31")], [], today);
    expect(now).toEqual([
      expect.objectContaining({ kind: "deadline", date: "2026-11-30", label: "Refund by", detail: "£29.99 · Argos", receiptId: "a" }),
    ]);
  });

  it("leaves out finished receipts and deadlines further away, but names the next one when caught up", () => {
    const finished = receipt("done", "2026-10-31", { closed: { reason: "returned", on: "2026-11-01" } });
    const fresh = receipt("new", "2026-11-19"); // refund by 19 Dec, 29 days away
    const result = needsAttention([finished, fresh], [], today);
    expect(result.now).toEqual([]);
    expect(result.later).toEqual(expect.objectContaining({ receiptId: "new", date: "2026-12-19" }));
  });

  it("counts renewals only in the next 3 days and trials in the next 7", () => {
    const soon = subscription("soon", "2026-11-23");
    const routine = subscription("routine", "2026-11-25");
    const trial = subscription("trial", "2026-12-27", { trialEnds: "2026-11-27" });
    const { now } = needsAttention([], [soon, routine, trial], today);
    expect(now.map((item) => [item.subscriptionId, item.kind, item.date])).toEqual([
      ["trial", "trial", "2026-11-27"],
      ["soon", "renewal", "2026-11-23"],
    ]);
    expect(now[0].detail).toBe("Then £9.99/month");
  });

  it("rolls a passed renewal date forward", () => {
    const { now } = needsAttention([], [subscription("old", "2026-09-22")], today);
    expect(now[0]).toEqual(expect.objectContaining({ date: "2026-11-22", label: "Renews" }));
  });

  it("puts deadlines and trials before routine payments, soonest first, and a trial first on the same day", () => {
    const deadline = receipt("r", "2026-10-28"); // refund by 27 Nov
    const trial = subscription("t", "2026-12-27", { trialEnds: "2026-11-27" });
    const renewal = subscription("n", "2026-11-21");
    const { now } = needsAttention([deadline], [trial, renewal], today);
    expect(now.map((item) => item.key)).toEqual(["subscription-t", "receipt-r", "subscription-n"]);
  });
});
