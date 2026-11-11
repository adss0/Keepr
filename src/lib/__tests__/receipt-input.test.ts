import { describe, expect, it } from "@jest/globals";

import {
  emptyReceiptInput,
  parsePriceToPence,
  receiptToInput,
  validateReceiptInput,
} from "@/lib/receipt-input";

const TODAY = "2026-11-11";

describe("parsePriceToPence", () => {
  it("accepts common ways of writing a price", () => {
    expect(parsePriceToPence("79.99")).toBe(7999);
    expect(parsePriceToPence("£79.99")).toBe(7999);
    expect(parsePriceToPence("1,234.5")).toBe(123450);
    expect(parsePriceToPence("12")).toBe(1200);
  });

  it("rejects anything that isn't an amount", () => {
    expect(parsePriceToPence("")).toBeUndefined();
    expect(parsePriceToPence("abc")).toBeUndefined();
    expect(parsePriceToPence("1.999")).toBeUndefined();
    expect(parsePriceToPence("-5")).toBeUndefined();
  });
});

describe("validateReceiptInput", () => {
  const valid = {
    ...emptyReceiptInput(TODAY),
    product: " Kettle ",
    retailer: "Argos",
    price: "34.99",
    purchaseDate: "2026-11-01",
  };

  it("returns the parsed receipt when everything is valid", () => {
    expect(validateReceiptInput(valid, TODAY)).toEqual({
      value: {
        product: "Kettle",
        retailer: "Argos",
        pricePence: 3499,
        purchaseDate: "2026-11-01",
        channel: "in_store",
        paymentMethod: "debit_card",
      },
    });
  });

  it("keeps optional return window and warranty when given", () => {
    const result = validateReceiptInput({ ...valid, returnWindowDays: "28", warrantyMonths: "12" }, TODAY);
    expect(result.value).toMatchObject({ returnWindowDays: 28, warrantyMonths: 12 });
  });

  it("reports every missing or invalid field", () => {
    const result = validateReceiptInput(
      { ...emptyReceiptInput(TODAY), purchaseDate: "2026-02-30", returnWindowDays: "two" },
      TODAY,
    );
    expect(Object.keys(result.errors ?? {}).sort()).toEqual(
      ["price", "product", "purchaseDate", "retailer", "returnWindowDays"].sort(),
    );
  });

  it("rejects purchase dates in the future", () => {
    const result = validateReceiptInput({ ...valid, purchaseDate: "2026-11-12" }, TODAY);
    expect(result.errors?.purchaseDate).toBeDefined();
  });
});

describe("receiptToInput", () => {
  it("round-trips through validation", () => {
    const receipt = {
      id: "1",
      product: "iPad Air",
      retailer: "Apple",
      pricePence: 59900,
      purchaseDate: "2026-11-09",
      channel: "online" as const,
      paymentMethod: "credit_card" as const,
      warrantyMonths: 12,
    };
    const { id, ...fields } = receipt;
    expect(id).toBe("1");
    expect(validateReceiptInput(receiptToInput(receipt), TODAY).value).toEqual(fields);
  });
});
