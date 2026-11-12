import { describe, expect, it } from "@jest/globals";

import { MAX_SCHEDULED_REMINDERS, planReminders } from "@/lib/reminders";
import type { Receipt } from "@/types/receipt";

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: "r1",
    retailer: "Currys",
    product: "Headphones",
    pricePence: 7999,
    purchaseDate: "2026-11-01",
    channel: "in_store",
    paymentMethod: "debit_card",
    ...overrides,
  };
}

describe("planReminders", () => {
  it("reminds 3 days before and on the last day, at 9am", () => {
    const reminders = planReminders([receipt()], new Date(2026, 10, 1, 12));
    // 30-day reject window ends 1 Dec.
    expect(reminders.map((r) => [r.date.getMonth() + 1, r.date.getDate(), r.date.getHours()])).toEqual([
      [11, 28, 9],
      [12, 1, 9],
    ]);
    expect(reminders[0].title).toBe("Refund if faulty in 3 days");
    expect(reminders[1].title).toBe("Last day: Refund if faulty");
    expect(reminders[1].body).toContain("Headphones from Currys");
  });

  it("skips reminders whose time has passed", () => {
    const reminders = planReminders([receipt()], new Date(2026, 10, 29));
    expect(reminders).toHaveLength(1);
    expect(reminders[0].title).toBe("Last day: Refund if faulty");
  });

  it("sorts across receipts and caps the total", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      receipt({ id: String(i), channel: "online", warrantyMonths: 12 }),
    );
    const reminders = planReminders(many, new Date(2026, 10, 1, 12));
    expect(reminders).toHaveLength(MAX_SCHEDULED_REMINDERS);
    const times = reminders.map((r) => r.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
