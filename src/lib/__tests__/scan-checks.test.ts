import { describe, expect, it } from "@jest/globals";

import { findDuplicate } from "@/lib/duplicates";
import { scanChecks } from "@/lib/scan-checks";
import type { Receipt } from "@/types/receipt";

const today = "2026-11-20";
const good = {
  is_receipt: true,
  retailer: "Argos",
  total_pence: 4699,
  purchase_date: "2026-11-18",
  items: [
    { name: "Kettle", price_pence: 3499 },
    { name: "Mugs", price_pence: 1200 },
  ],
};

describe("scanChecks", () => {
  it("flags nothing on a clean scan", () => {
    expect(scanChecks(good, today)).toEqual({});
  });

  it("flags nothing for something that isn't a receipt", () => {
    expect(scanChecks({ is_receipt: false }, today)).toEqual({});
    expect(scanChecks(null, today)).toEqual({});
  });

  it("asks for the shop and total when they're missing", () => {
    const checks = scanChecks({ ...good, retailer: " ", total_pence: undefined }, today);
    expect(checks.retailer).toMatch(/shop's name/);
    expect(checks.price).toMatch(/Couldn't read the total/);
  });

  it("says what the items add up to when they don't match the total", () => {
    expect(scanChecks({ ...good, total_pence: 5699 }, today).price).toBe(
      "The items add up to £46.99. Check the total; a discount could explain it.",
    );
  });

  it("allows a penny of rounding, and skips the sum when an item has no price", () => {
    expect(scanChecks({ ...good, total_pence: 4700 }, today).price).toBeUndefined();
    const unpriced = { ...good, total_pence: 9999, items: [...good.items, { name: "Bag" }] };
    expect(scanChecks(unpriced, today).price).toBeUndefined();
  });

  it("flags a missing, future or very old date", () => {
    expect(scanChecks({ ...good, purchase_date: "18/11/2026" }, today).purchaseDate).toMatch(/Couldn't read the date/);
    expect(scanChecks({ ...good, purchase_date: "2026-12-01" }, today).purchaseDate).toMatch(/future/);
    expect(scanChecks({ ...good, purchase_date: "2024-11-19" }, today).purchaseDate).toMatch(/over 2 years/);
    expect(scanChecks({ ...good, purchase_date: "2024-11-20" }, today).purchaseDate).toBeUndefined();
  });
});

describe("findDuplicate", () => {
  const kept: Receipt = {
    id: "1",
    product: "Kettle",
    retailer: "Tesco Express",
    pricePence: 3499,
    purchaseDate: "2026-11-18",
    channel: "in_store",
    paymentMethod: "debit_card",
  };

  it("finds the same shop, day and price, ignoring case, spaces and a longer shop name", () => {
    expect(findDuplicate([kept], { retailer: "TESCO", pricePence: 3499, purchaseDate: "2026-11-18" })).toBe(kept);
  });

  it("ignores a different price, day or shop", () => {
    expect(findDuplicate([kept], { retailer: "Tesco", pricePence: 3500, purchaseDate: "2026-11-18" })).toBeUndefined();
    expect(findDuplicate([kept], { retailer: "Tesco", pricePence: 3499, purchaseDate: "2026-11-17" })).toBeUndefined();
    expect(findDuplicate([kept], { retailer: "Argos", pricePence: 3499, purchaseDate: "2026-11-18" })).toBeUndefined();
    expect(findDuplicate([kept], { retailer: "!!", pricePence: 3499, purchaseDate: "2026-11-18" })).toBeUndefined();
  });
});
