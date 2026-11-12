import { describe, expect, it } from "@jest/globals";

import { receiptsToCsv } from "@/lib/export";
import type { Receipt } from "@/types/receipt";

const receipts: Receipt[] = [
  {
    id: "2",
    product: 'TV 55", 4K',
    retailer: "Currys",
    pricePence: 49900,
    purchaseDate: "2026-11-01",
    channel: "online",
    paymentMethod: "credit_card",
    warrantyMonths: 12,
  },
  {
    id: "1",
    product: "Kettle",
    retailer: "Argos",
    pricePence: 3499,
    purchaseDate: "2026-03-10",
    channel: "in_store",
    paymentMethod: "cash",
  },
];

describe("receiptsToCsv", () => {
  const lines = receiptsToCsv(receipts, "2026-11-11").split("\r\n");

  it("starts with a header row", () => {
    expect(lines[0]).toBe(
      "Product,Shop,Price (GBP),Date bought,Bought,Paid by,Return window (days),Warranty (months),Next deadline,Next deadline date",
    );
  });

  it("lists receipts oldest first, with prices in pounds", () => {
    expect(lines[1]).toBe("Kettle,Argos,34.99,2026-03-10,In store,Cash,,,,");
  });

  it("quotes fields containing commas or quotes, and includes the next deadline", () => {
    expect(lines[2]).toBe('"TV 55"", 4K",Currys,499.00,2026-11-01,Online,Credit card,,12,Cancel for any reason,2026-11-15');
  });

  it("ends with a line break", () => {
    expect(lines.at(-1)).toBe("");
  });
});
