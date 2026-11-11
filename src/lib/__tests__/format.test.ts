import { describe, expect, it } from "@jest/globals";

import { formatDate, formatFullDate, formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("formats pence as pounds", () => {
    expect(formatPrice(7999)).toBe("£79.99");
    expect(formatPrice(5)).toBe("£0.05");
    expect(formatPrice(0)).toBe("£0.00");
  });

  it("adds thousands separators", () => {
    expect(formatPrice(123456)).toBe("£1,234.56");
    expect(formatPrice(100000000)).toBe("£1,000,000.00");
  });
});

describe("formatDate", () => {
  it("shows day and month", () => {
    expect(formatDate("2026-11-05")).toBe("5 Nov");
  });

  it("adds the year when it isn't the current year", () => {
    expect(formatDate("2027-03-10", 2026)).toBe("10 Mar 2027");
    expect(formatDate("2026-03-10", 2026)).toBe("10 Mar");
  });
});

describe("formatFullDate", () => {
  it("always includes the year", () => {
    expect(formatFullDate("2026-11-05")).toBe("5 Nov 2026");
    expect(formatFullDate("2027-10-30")).toBe("30 Oct 2027");
  });
});
