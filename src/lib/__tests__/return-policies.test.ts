import { describe, expect, it } from "@jest/globals";

import { normaliseShop, usualReturnDays } from "@/lib/return-policies";

describe("usualReturnDays", () => {
  it("matches common spellings of a shop", () => {
    expect(usualReturnDays("Argos")).toBe(30);
    expect(usualReturnDays("  ARGOS ltd ")).toBe(30);
    expect(usualReturnDays("Marks & Spencer")).toBe(35);
    expect(usualReturnDays("M&S")).toBe(35);
    expect(usualReturnDays("H&M")).toBe(28);
    expect(usualReturnDays("Amazon.co.uk")).toBe(30);
    expect(usualReturnDays("The IKEA store")).toBe(365);
  });

  it("knows nothing about other shops or partial names", () => {
    expect(usualReturnDays("")).toBeUndefined();
    expect(usualReturnDays("Arg")).toBeUndefined();
    expect(usualReturnDays("Joe's Corner Shop")).toBeUndefined();
    expect(usualReturnDays("Next door bakery")).toBeUndefined();
  });

  it("normalises punctuation and filler words", () => {
    expect(normaliseShop("John Lewis & Partners plc")).toBe("john lewis and partners");
  });
});
