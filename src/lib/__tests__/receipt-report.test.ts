import { describe, expect, it } from "@jest/globals";

import { receiptPhotosHtml, receiptReportHtml, receiptsReportHtml } from "@/lib/receipt-report";
import type { Receipt } from "@/types/receipt";

const receipt: Receipt = {
  id: "r1",
  product: 'Kettle <script>alert("x")</script>',
  retailer: "Argos & Co",
  pricePence: 3499,
  purchaseDate: "2026-11-01",
  channel: "online",
  paymentMethod: "credit_card",
  warrantyMonths: 12,
};

describe("receiptReportHtml", () => {
  it("escapes everything the user typed", () => {
    const html = receiptReportHtml(receipt, "2026-11-17");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Kettle &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("Argos &amp; Co");
  });

  it("lists each deadline with its status only when asked, and the photo when given", () => {
    const html = receiptReportHtml(receipt, "2026-11-17", { photo: "data:image/jpeg;base64,AAAA", withDeadlines: true });
    expect(html).toContain("Cancel for any reason");
    expect(html).toContain("Passed"); // 14-day cancellation ended 15 Nov
    expect(html).toContain("14 days left"); // 30-day reject ends 1 Dec
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
    const plain = receiptReportHtml(receipt, "2026-11-17");
    expect(plain).not.toContain("<img");
    expect(plain).not.toContain("Cancel for any reason");
    // No footer, and no page margins, so browsers don't print the address on the page.
    expect(plain).not.toContain("Made with Keepr");
    expect(plain).toContain("@page { size: A4; margin: 0; }");
  });
});

describe("receiptsReportHtml", () => {
  it("lists every receipt with the total, then a page each, with photos where given", () => {
    const second: Receipt = { ...receipt, id: "r2", product: "Toaster", pricePence: 1501, closed: { reason: "returned", on: "2026-11-05" } };
    const html = receiptsReportHtml([receipt, second], "2026-11-17", "This month", { r2: "https://example.test/p.jpg" });
    expect(html).toContain("2 receipts");
    expect(html).toContain("£50.00"); // 34.99 + 15.01
    expect(html).toContain("Returned");
    // The summary, then a page each.
    expect(html.match(/class="sheet"/g)).toHaveLength(3);
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).not.toContain("<script>");
  });
});

describe("receiptPhotosHtml", () => {
  it("puts each photo on its own page, captioned only when there are several", () => {
    const other = { ...receipt, id: "r2", product: "Toaster" };
    const one = receiptPhotosHtml([receipt], "2026-11-17", { [receipt.id]: "data:image/jpeg;base64,AAAA" });
    expect(one).toContain('src="data:image/jpeg;base64,AAAA"');
    expect(one).not.toContain('class="caption"');
    const two = receiptPhotosHtml([receipt, other], "2026-11-17", { [receipt.id]: "data:image/jpeg;base64,AAAA" });
    expect(two).toContain('class="caption"');
    expect(two.match(/class="sheet"/g)).toHaveLength(2);
    // No photo: the receipt's details instead.
    expect(two).toContain("Toaster");
    expect(two.match(/<img/g)).toHaveLength(1);
  });
});
