import { describe, expect, it } from "@jest/globals";

import { receiptToRow, rowToReceipt } from "@/lib/cloud-rows";
import { csvField } from "@/lib/export";
import { wasExpected } from "@/lib/recovery-link";
import type { Receipt } from "@/types/receipt";

const receipt: Receipt = {
  id: "0f8c2b9e-1d2a-4c3b-9a8f-7e6d5c4b3a21",
  product: "Kettle",
  retailer: "Argos",
  pricePence: 3499,
  purchaseDate: "2026-11-01",
  channel: "in_store",
  paymentMethod: "debit_card",
};

describe("CSV formulas", () => {
  it("turns text a spreadsheet would run into plain text", () => {
    expect(csvField('=HYPERLINK("http://x","click")')).toBe(`"'=HYPERLINK(""http://x"",""click"")"`);
    expect(csvField("+44 7700")).toBe("'+44 7700");
    expect(csvField("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvField("-5")).toBe("'-5");
  });

  it("leaves ordinary text and prices alone", () => {
    expect(csvField("Kettle, 1.7L")).toBe('"Kettle, 1.7L"');
    expect(csvField("34.99")).toBe("34.99");
  });
});

describe("photo names from the cloud", () => {
  it("keeps the names Keepr makes", () => {
    for (const photo of [`${receipt.id}.jpg`, `${receipt.id}-mi3k2x.pdf`]) {
      expect(rowToReceipt(receiptToRow({ ...receipt, photo })).photo).toBe(photo);
    }
  });

  it("drops anything that could be a path", () => {
    for (const photo of ["../../Library/x.jpg", "a/b.jpg", "..jpg", "x.jpg\u0000"]) {
      expect(rowToReceipt({ ...receiptToRow(receipt), photo })).not.toHaveProperty("photo");
    }
  });
});

describe("wasExpected", () => {
  const now = 1_800_000_000_000;
  const stored = (kind: string, minutesAgo: number) => JSON.stringify({ kind, at: now - minutesAgo * 60_000 });

  it("accepts a link this device asked for, recently", () => {
    expect(wasExpected(stored("recovery", 50), "recovery", now)).toBe(true);
    expect(wasExpected(stored("google", 5), "google", now)).toBe(true);
  });

  it("refuses links nobody here asked for, of another kind, or too old", () => {
    expect(wasExpected(null, "recovery", now)).toBe(false);
    expect(wasExpected(stored("google", 1), "recovery", now)).toBe(false);
    expect(wasExpected(stored("recovery", 180), "recovery", now)).toBe(false);
    expect(wasExpected(stored("google", 45), "google", now)).toBe(false);
    expect(wasExpected("not json", "google", now)).toBe(false);
  });
});
