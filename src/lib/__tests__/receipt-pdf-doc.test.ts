import { describe, expect, it } from "@jest/globals";
import { PDFDocument } from "pdf-lib/cjs";

import { type Evidence, receiptPhotosPdf, receiptsReportPdf } from "@/lib/receipt-pdf-doc";
import type { Receipt } from "@/types/receipt";

// A 1×1 PNG.
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (char) => char.charCodeAt(0),
);

async function pdfWithPages(count: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let page = 0; page < count; page++) doc.addPage();
  return doc.save();
}

const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

const receipt = (id: string, product: string): Receipt => ({
  id,
  product,
  retailer: "Café Nero & Co",
  pricePence: 1658,
  purchaseDate: "2026-11-11",
  channel: "online",
  paymentMethod: "debit_card",
  warrantyMonths: 12,
});

describe("receiptsReportPdf", () => {
  it("has a summary, a page per receipt, and each receipt's own PDF pages after it", async () => {
    const evidence: Record<string, Evidence> = {
      photo: { bytes: PNG, kind: "png" },
      file: { bytes: await pdfWithPages(2), kind: "pdf" },
    };
    const bytes = await receiptsReportPdf({
      receipts: [receipt("photo", "Kettle"), receipt("file", "Headphones"), receipt("none", "Toaster")],
      today: "2026-11-19",
      period: "This year",
      evidence,
      withDeadlines: true,
    });
    // Summary + 3 receipt pages + the 2 pages of the attached PDF.
    expect(await pageCount(bytes)).toBe(6);
  });

  it("copes with text the PDF font can't show, and a photo that won't open", async () => {
    const bytes = await receiptsReportPdf({
      receipts: [receipt("bad", "Kettle 🫖 – £34.99 · 日本")],
      today: "2026-11-19",
      period: "All receipts",
      evidence: { bad: { bytes: Uint8Array.from([1, 2, 3]), kind: "jpg" } },
      withDeadlines: false,
    });
    expect(await pageCount(bytes)).toBe(2);
  });
});

describe("receiptPhotosPdf", () => {
  it("gives a photo its own page, keeps a PDF's pages, and details for a receipt with neither", async () => {
    const bytes = await receiptPhotosPdf([receipt("photo", "Kettle"), receipt("file", "Headphones"), receipt("none", "Toaster")], "2026-11-19", {
      photo: { bytes: PNG, kind: "png" },
      file: { bytes: await pdfWithPages(3), kind: "pdf" },
    });
    expect(await pageCount(bytes)).toBe(5);
  });
});
