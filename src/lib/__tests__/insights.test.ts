import { describe, expect, it } from "@jest/globals";
import { strFromU8, unzipSync } from "fflate";

import { lastMonths, monthLabel, spendByMonth, spendByShop } from "@/lib/insights";
import { spendingWorkbook } from "@/lib/spending-workbook";
import { buildXlsx, columnName, safeSheetName } from "@/lib/xlsx";
import type { Receipt } from "@/types/receipt";

function receipt(overrides: Partial<Receipt>): Receipt {
  return {
    id: "r",
    product: "Thing",
    retailer: "Argos",
    pricePence: 1000,
    purchaseDate: "2026-11-01",
    channel: "in_store",
    paymentMethod: "debit_card",
    ...overrides,
  };
}

describe("spending insights", () => {
  it("lists the last months oldest first, across a year boundary", () => {
    expect(lastMonths("2026-02-10", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(monthLabel("2026-02")).toBe("Feb 2026");
  });

  it("totals spending per month and per shop", () => {
    const receipts = [
      receipt({ pricePence: 1000, purchaseDate: "2026-10-05" }),
      receipt({ pricePence: 2500, purchaseDate: "2026-11-02", retailer: " argos " }),
      receipt({ pricePence: 500, purchaseDate: "2026-11-03", retailer: "Tesco" }),
      receipt({ pricePence: 9999, purchaseDate: "2025-01-01" }),
    ];
    expect(spendByMonth(receipts, ["2026-10", "2026-11"])).toEqual([
      { month: "2026-10", pence: 1000, count: 1 },
      { month: "2026-11", pence: 3000, count: 2 },
    ]);
    expect(spendByShop(receipts, "2026-01-01")).toEqual([
      { shop: "Argos", pence: 3500, count: 2 },
      { shop: "Tesco", pence: 500, count: 1 },
    ]);
  });
});

describe("xlsx", () => {
  it("names columns like Excel", () => {
    expect([0, 25, 26, 27, 701].map(columnName)).toEqual(["A", "Z", "AA", "AB", "ZZ"]);
  });

  it("makes sheet names valid and unique", () => {
    const used = new Set<string>();
    expect(safeSheetName("By shop: [all]", used)).toBe("By shop all");
    expect(safeSheetName("by shop all", used)).toBe("by shop all 2");
  });

  it("builds a workbook whose cells are escaped text, never formulas", () => {
    const sheets = spendingWorkbook(
      [receipt({ product: '=HYPERLINK("x") & <b>', pricePence: 7999 })],
      [{ id: "s", name: "Netflix", pricePence: 1099, cycle: "monthly", nextRenewal: "2026-11-20" }],
      "2026-11-17",
    );
    expect(sheets.map((s) => s.name)).toEqual(["Summary", "By month", "By shop", "Receipts", "Subscriptions"]);

    const files = unzipSync(buildXlsx(sheets));
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet5.xml"]),
    );
    const receiptsSheet = strFromU8(files["xl/worksheets/sheet4.xml"]);
    expect(receiptsSheet).toContain("=HYPERLINK(&quot;x&quot;) &amp; &lt;b&gt;");
    expect(receiptsSheet).not.toContain("<f>");
    expect(receiptsSheet).toContain("<v>79.99</v>");
  });
});
