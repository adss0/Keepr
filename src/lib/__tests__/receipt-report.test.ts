import { describe, expect, it } from "@jest/globals";

import { receiptReportHtml } from "@/lib/receipt-report";
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

  it("lists each deadline with its status, and the photo when given", () => {
    const html = receiptReportHtml(receipt, "2026-11-17", "data:image/jpeg;base64,AAAA");
    expect(html).toContain("Cancel for any reason");
    expect(html).toContain("Passed"); // 14-day cancellation ended 15 Nov
    expect(html).toContain("14 days left"); // 30-day reject ends 1 Dec
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
    expect(receiptReportHtml(receipt, "2026-11-17")).not.toContain("<img");
  });
});
