// The CommonJS build: the ES build imports tslib in a way Metro's web bundle can't load ("tslib.default" is undefined).
import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib/cjs";

import { DEADLINE_EXPLANATIONS, daysBetween, getDeadlines } from "@/lib/deadlines";
import { evidenceText } from "@/lib/evidence";
import { PAYMENT_LABELS } from "@/lib/export";
import { formatFullDate, formatPrice } from "@/lib/format";
import { CLOSED_LABELS } from "@/lib/receipt-status";
import type { Receipt } from "@/types/receipt";

/** A receipt's proof of purchase, ready to go in a PDF: a photo, or the pages of a PDF file. */
export type Evidence = { bytes: Uint8Array; kind: "jpg" | "png" | "pdf" };

const PAGE: [number, number] = [595.28, 841.89]; // A4 in points
const MARGIN = 42; // About 15 mm
const WIDTH = PAGE[0] - MARGIN * 2;
const INK = rgb(0.13, 0.125, 0.11);
const MUTED = rgb(0.39, 0.39, 0.37);
const RULE = rgb(0.85, 0.85, 0.84);
const OPEN = rgb(0.82, 0.2, 0.08);

type Style = { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number };

/** Writes text down the page, starting new pages as it fills, in the PDF's built-in Helvetica. */
class Writer {
  page!: PDFPage;
  y = 0;

  constructor(
    readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {}

  newPage() {
    this.page = this.doc.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
  }

  /** Moves to a new page unless `height` more points fit on this one. */
  ensure(height: number) {
    if (this.y - height < MARGIN) this.newPage();
  }

  space(height: number) {
    this.y -= height;
  }

  /** The font's characters only (Helvetica covers Western European text); anything else becomes "?". */
  private safe(text: string, font: PDFFont): string {
    return [...text.replace(/\s+/g, " ")]
      .map((char) => {
        try {
          font.encodeText(char);
          return char;
        } catch {
          return "?";
        }
      })
      .join("");
  }

  lines(text: string, { size = 11, bold = false, width = WIDTH }: Style = {}): string[] {
    const font = bold ? this.bold : this.regular;
    const words = this.safe(text, font).split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /** Writes wrapped text, returning the height it took. */
  text(text: string, style: Style = {}): number {
    const { size = 11, bold = false, color = INK, x = MARGIN } = style;
    const lines = this.lines(text, style);
    const lineHeight = size * 1.35;
    for (const line of lines) {
      this.ensure(lineHeight);
      this.page.drawText(line, { x, y: this.y - size, size, font: bold ? this.bold : this.regular, color });
      this.y -= lineHeight;
    }
    return lines.length * lineHeight;
  }

  /** Text on the right edge of the current line, such as a price. */
  right(text: string, { size = 11, bold = false, color = INK }: Style = {}, y = this.y) {
    const font = bold ? this.bold : this.regular;
    const safe = this.safe(text, font);
    this.page.drawText(safe, { x: PAGE[0] - MARGIN - font.widthOfTextAtSize(safe, size), y: y - size, size, font, color });
  }

  rule() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE[0] - MARGIN, y: this.y },
      thickness: 0.6,
      color: RULE,
    });
  }
}

async function writer(): Promise<Writer> {
  const doc = await PDFDocument.create();
  const [regular, bold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  return new Writer(doc, regular, bold);
}

function deadlineStatus(today: string, date: string): string {
  const days = daysBetween(today, date);
  if (days < 0) return "Passed";
  if (days === 0) return "Last day today";
  return days === 1 ? "1 day left" : `${days} days left`;
}

/** A receipt's heading, details, status and (if asked) deadlines, from the top of a new page. */
function writeDetails(w: Writer, receipt: Receipt, today: string, withDeadlines: boolean) {
  w.newPage();
  const top = w.y;
  w.text(receipt.product, { size: 20, bold: true, width: WIDTH - 120 });
  w.right(formatPrice(receipt.pricePence), { size: 20, bold: true }, top);
  w.space(4);

  const facts: [string, string][] = [
    ["Shop", receipt.retailer],
    ["Bought", `${formatFullDate(receipt.purchaseDate)}, ${receipt.channel === "online" ? "online" : "in store"}`],
    ["Paid by", PAYMENT_LABELS[receipt.paymentMethod]],
  ];
  if (receipt.returnWindowDays !== undefined) facts.push(["Shop returns", `${receipt.returnWindowDays} days`]);
  if (receipt.warrantyMonths) facts.push(["Warranty", `${receipt.warrantyMonths} months`]);
  if (receipt.orderNumber) facts.push(["Order number", receipt.orderNumber]);
  if (receipt.serialNumber) facts.push(["Serial number", receipt.serialNumber]);
  if (receipt.closed) facts.push(["Status", `${CLOSED_LABELS[receipt.closed.reason]} ${formatFullDate(receipt.closed.on)}`]);
  facts.push(["Proof", evidenceText(receipt)]);
  for (const [label, value] of facts) {
    const rowTop = w.y;
    w.text(label, { size: 10, color: MUTED });
    const after = w.y;
    w.y = rowTop;
    w.text(value, { size: 10, x: MARGIN + 90, width: WIDTH - 90 });
    w.y = Math.min(w.y, after);
  }

  if (!withDeadlines) return;
  w.space(14);
  w.text(`Deadlines, as of ${formatFullDate(today)}`, { size: 12, bold: true });
  w.space(4);
  for (const deadline of getDeadlines(receipt)) {
    w.ensure(48);
    w.rule();
    w.space(6);
    const rowTop = w.y;
    w.text(deadline.label, { size: 10, bold: true, width: WIDTH - 170 });
    w.text(DEADLINE_EXPLANATIONS[deadline.kind], { size: 8.5, color: MUTED, width: WIDTH - 170 });
    const after = w.y;
    w.y = rowTop;
    w.text(formatFullDate(deadline.date), { size: 10, x: MARGIN + WIDTH - 160, width: 80 });
    w.y = rowTop;
    const status = deadlineStatus(today, deadline.date);
    w.right(status, { size: 10, bold: status !== "Passed", color: status === "Passed" ? MUTED : OPEN });
    w.y = after - 4;
  }
}

/** Draws a photo as large as fits between the writing position and the bottom margin (a new page if little is left). */
async function writePhoto(w: Writer, evidence: Evidence, minHeight = 240) {
  const image = evidence.kind === "png" ? await w.doc.embedPng(evidence.bytes) : await w.doc.embedJpg(evidence.bytes);
  w.ensure(minHeight);
  const available = w.y - MARGIN;
  const scale = Math.min(WIDTH / image.width, available / image.height, 1.5);
  const width = image.width * scale;
  const height = image.height * scale;
  w.page.drawImage(image, { x: MARGIN + (WIDTH - width) / 2, y: w.y - height, width, height });
  w.y -= height;
}

/** Adds every page of a receipt's own PDF after the current page. */
async function appendPdf(w: Writer, evidence: Evidence) {
  const source = await PDFDocument.load(evidence.bytes, { ignoreEncryption: true });
  const pages = await w.doc.copyPages(source, source.getPageIndices());
  for (const page of pages) w.doc.addPage(page);
}

/** Adds a receipt's proof: the photo on its page, or its PDF's pages after it. A file that won't open gets a note. */
async function writeEvidence(w: Writer, evidence: Evidence | undefined) {
  if (!evidence) return;
  try {
    if (evidence.kind === "pdf") {
      await appendPdf(w, evidence);
    } else {
      w.space(14);
      await writePhoto(w, evidence);
    }
  } catch {
    w.space(10);
    w.text("The proof of purchase is kept in Keepr but couldn't be added to this PDF.", { size: 10, color: MUTED });
  }
}

type ReportOptions = {
  receipts: Receipt[];
  today: string;
  /** The dates covered, as shown on the summary, e.g. "1 Jan 2026 to 19 Nov 2026". */
  period: string;
  /** Proof of purchase by receipt id; receipts not listed have none to add. */
  evidence: Record<string, Evidence>;
  withDeadlines: boolean;
};

/**
 * Several receipts as one PDF: a summary with the total, then a page for each receipt with its details, its photo,
 * and the pages of its PDF file straight after it.
 */
export async function receiptsReportPdf({ receipts, today, period, evidence, withDeadlines }: ReportOptions) {
  const w = await writer();
  w.newPage();
  const total = receipts.reduce((sum, receipt) => sum + receipt.pricePence, 0);
  const top = w.y;
  w.text("Receipts", { size: 22, bold: true });
  w.right(formatPrice(total), { size: 22, bold: true }, top);
  w.text(`${period} · ${receipts.length === 1 ? "1 receipt" : `${receipts.length} receipts`}`, { size: 10, color: MUTED });
  w.space(12);

  const columns = [MARGIN, MARGIN + 90, MARGIN + 300];
  const header = (labels: string[]) => {
    const rowTop = w.y;
    labels.forEach((label, index) => {
      w.y = rowTop;
      w.text(label.toUpperCase(), { size: 8, bold: true, color: MUTED, x: columns[index], width: 200 });
    });
    w.y = rowTop;
    w.right("PRICE", { size: 8, bold: true, color: MUTED });
    w.y = rowTop - 14;
  };
  header(["Bought", "What", "Shop"]);
  for (const receipt of receipts) {
    w.ensure(30);
    if (w.y > PAGE[1] - MARGIN - 1) header(["Bought", "What", "Shop"]);
    w.rule();
    w.space(6);
    const rowTop = w.y;
    w.text(formatFullDate(receipt.purchaseDate), { size: 10, x: columns[0], width: 85 });
    let after = w.y;
    w.y = rowTop;
    const what = receipt.closed ? `${receipt.product} (${CLOSED_LABELS[receipt.closed.reason].toLowerCase()})` : receipt.product;
    w.text(what, { size: 10, x: columns[1], width: 200 });
    after = Math.min(after, w.y);
    w.y = rowTop;
    w.text(receipt.retailer, { size: 10, x: columns[2], width: 130 });
    after = Math.min(after, w.y);
    w.right(formatPrice(receipt.pricePence), { size: 10 }, rowTop);
    w.y = after - 4;
  }
  w.rule();
  w.space(6);
  const totalTop = w.y;
  w.text("Total", { size: 10, bold: true, x: columns[1] });
  w.right(formatPrice(total), { size: 10, bold: true }, totalTop);

  for (const receipt of receipts) {
    writeDetails(w, receipt, today, withDeadlines);
    await writeEvidence(w, evidence[receipt.id]);
  }
  return w.doc.save();
}

/**
 * Receipts as their proof of purchase: each photo on its own page as large as it fits (with a one-line caption when
 * there are several), each PDF file's own pages, and the details of any receipt with neither.
 */
export async function receiptPhotosPdf(receipts: Receipt[], today: string, evidence: Record<string, Evidence>) {
  const w = await writer();
  for (const receipt of receipts) {
    const proof = evidence[receipt.id];
    if (!proof) {
      writeDetails(w, receipt, today, false);
      continue;
    }
    try {
      if (proof.kind === "pdf") {
        await appendPdf(w, proof);
        continue;
      }
      w.newPage();
      if (receipts.length > 1) {
        w.text(
          `${receipt.product} · ${receipt.retailer} · ${formatFullDate(receipt.purchaseDate)} · ${formatPrice(receipt.pricePence)}`,
          { size: 9, color: MUTED },
        );
        w.space(6);
      }
      await writePhoto(w, proof, 0);
    } catch {
      writeDetails(w, receipt, today, false);
      w.space(10);
      w.text("The proof of purchase is kept in Keepr but couldn't be added to this PDF.", { size: 10, color: MUTED });
    }
  }
  return w.doc.save();
}
