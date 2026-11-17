import { describe, expect, it } from "@jest/globals";

import { isOldSample } from "@/lib/old-samples";

describe("isOldSample", () => {
  it("matches a sample only when product, shop and price all match", () => {
    expect(isOldSample({ product: "Kettle", retailer: "Argos", pricePence: 3499 })).toBe(true);
    expect(isOldSample({ product: "Kettle", retailer: "Argos", pricePence: 3500 })).toBe(false);
    expect(isOldSample({ product: "Kettle", retailer: "Tesco", pricePence: 3499 })).toBe(false);
  });
});
