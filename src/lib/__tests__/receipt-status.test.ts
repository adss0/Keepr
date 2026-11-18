import { describe, expect, it } from "@jest/globals";

import { calendarEvents } from "@/lib/calendar";
import { receiptToRow, rowToReceipt } from "@/lib/cloud-rows";
import { getNextDeadline } from "@/lib/deadlines";
import { spendByMonth, spendByShop } from "@/lib/insights";
import { closedText } from "@/lib/receipt-status";
import { planReminders } from "@/lib/reminders";
import type { Receipt } from "@/types/receipt";

const receipt: Receipt = {
  id: "r1",
  retailer: "Argos",
  product: "Kettle",
  pricePence: 2500,
  purchaseDate: "2026-11-10",
  channel: "online",
  paymentMethod: "debit_card",
  returnWindowDays: 30,
};
const returned: Receipt = { ...receipt, id: "r2", closed: { reason: "returned", on: "2026-11-15" } };
const claimed: Receipt = { ...receipt, id: "r3", closed: { reason: "claimed", on: "2026-11-16" } };

describe("finished-with receipts", () => {
  it("have no next deadline, reminders or calendar events", () => {
    expect(getNextDeadline(receipt, "2026-11-12")).toBeDefined();
    expect(getNextDeadline(returned, "2026-11-12")).toBeUndefined();
    expect(planReminders([returned, claimed], new Date("2026-11-12T08:00:00Z"))).toEqual([]);
    expect(calendarEvents([returned], [], "2026-11-01", "2026-12-31").size).toBe(0);
  });

  it("don't count as spending once returned, but still do when claimed", () => {
    expect(spendByShop([receipt, returned, claimed])).toEqual([{ shop: "Argos", pence: 5000, count: 2 }]);
    expect(spendByMonth([returned], ["2026-11"])).toEqual([{ month: "2026-11", pence: 0, count: 0 }]);
  });

  it("keep their status through the cloud", () => {
    expect(rowToReceipt(receiptToRow(returned))).toEqual(returned);
    expect(receiptToRow(receipt)).toMatchObject({ closed_reason: null, closed_on: null });
    expect(rowToReceipt(receiptToRow(receipt)).closed).toBeUndefined();
  });

  it("describe how they ended", () => {
    expect(closedText({ reason: "returned", on: "2026-11-15" }, 2026)).toMatch(/^Returned /);
  });
});
