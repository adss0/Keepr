import { describe, expect, it } from "@jest/globals";

import { emptyReceiptInput } from "@/lib/receipt-input";
import {
  countChangedFields,
  MAX_PRINTED_TEXT,
  receiptName,
  scannedItems,
  scannedText,
  scanResultToInput,
} from "@/lib/scan-result";

const blank = emptyReceiptInput("2026-11-12");

describe("scanResultToInput", () => {
  it("fills the form from a full scan", () => {
    expect(
      scanResultToInput(
        {
          is_receipt: true,
          retailer: "Currys",
          product: "Sony WH-1000XM6 headphones",
          total_pence: 32900,
          purchase_date: "2026-11-10",
          channel: "in_store",
          payment_method: "credit_card",
          return_window_days: 21,
          warranty_months: 12,
        },
        blank,
      ),
    ).toEqual({
      product: "Sony WH-1000XM6 headphones",
      retailer: "Currys",
      price: "329.00",
      purchaseDate: "2026-11-10",
      channel: "in_store",
      paymentMethod: "credit_card",
      returnWindowDays: "21",
      warrantyMonths: "12",
    });
  });

  it("keeps what's already in the form for missing or malformed fields", () => {
    const current = { ...blank, product: "Kettle" };
    const result = scanResultToInput(
      {
        is_receipt: true,
        retailer: "Argos",
        product: null,
        total_pence: -5,
        purchase_date: "10/11/2026",
        channel: "shop",
        payment_method: null,
        return_window_days: null,
        warranty_months: 1.5,
      },
      current,
    );
    expect(result).toEqual({ ...current, retailer: "Argos" });
  });

  it("returns undefined when the image isn't a receipt", () => {
    expect(scanResultToInput({ is_receipt: false }, blank)).toBeUndefined();
    expect(scanResultToInput("nonsense", blank)).toBeUndefined();
  });
});

describe("countChangedFields", () => {
  it("counts the fields a scan filled in", () => {
    const after = scanResultToInput({ is_receipt: true, retailer: "Argos", product: "Kettle", total_pence: 3499 }, blank);
    expect(after && countChangedFields(blank, after)).toBe(3);
  });

  it("is zero when nothing changed", () => {
    expect(countChangedFields(blank, { ...blank })).toBe(0);
  });
});

describe("scannedItems", () => {
  it("keeps named items with valid prices and drops the rest", () => {
    expect(
      scannedItems({
        items: [
          { name: " Kettle ", price_pence: 3499 },
          { name: "Toaster", price_pence: -5 },
          { name: "", price_pence: 100 },
          { price_pence: 100 },
          "nonsense",
        ],
      }),
    ).toEqual([{ name: "Kettle", pricePence: 3499 }, { name: "Toaster", pricePence: undefined }]);
    expect(scannedItems({ is_receipt: true })).toEqual([]);
    expect(scannedItems(null)).toEqual([]);
  });
});

describe("scannedText", () => {
  it("tidies the printed words and caps their length", () => {
    expect(scannedText({ printed_text: "  ARGOS \n KETTLE\t£24.99 " })).toBe("ARGOS KETTLE £24.99");
    expect(scannedText({ printed_text: "x".repeat(5000) })).toHaveLength(MAX_PRINTED_TEXT);
  });

  it("is undefined when the scan has no text", () => {
    expect(scannedText({})).toBeUndefined();
    expect(scannedText({ printed_text: "   " })).toBeUndefined();
    expect(scannedText(null)).toBeUndefined();
  });
});

describe("receiptName", () => {
  const items = [{ name: "Energy drink", pricePence: 150 }, { name: "Donuts" }, { name: "Milk" }];

  it("keeps the scanner's name for one item, or its summary of several", () => {
    expect(receiptName("Kettle", [{ name: "Kettle" }])).toBe("Kettle");
    expect(receiptName("Food shop: energy drink, donuts and milk", items)).toBe("Food shop: energy drink, donuts and milk");
  });

  it("sums up several items itself when the scanner named just one", () => {
    expect(receiptName("Energy drink", items)).toBe("Energy drink and 2 more items");
    expect(receiptName(undefined, items.slice(0, 2))).toBe("Energy drink and 1 more item");
  });

  it("names the whole receipt when filling the form", () => {
    const result = scanResultToInput(
      { is_receipt: true, product: "Energy drink", total_pence: 1658, items: items.map((i) => ({ name: i.name })) },
      blank,
    );
    expect(result?.product).toBe("Energy drink and 2 more items");
    expect(result?.price).toBe("16.58");
  });
});
