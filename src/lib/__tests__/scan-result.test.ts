import { describe, expect, it } from "@jest/globals";

import { emptyReceiptInput } from "@/lib/receipt-input";
import { scanResultToInput } from "@/lib/scan-result";

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
