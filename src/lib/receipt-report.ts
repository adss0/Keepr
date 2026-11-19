import { DEADLINE_EXPLANATIONS, daysBetween, getDeadlines } from "@/lib/deadlines";
import { PAYMENT_LABELS } from "@/lib/export";
import { formatFullDate, formatPrice } from "@/lib/format";
import { CLOSED_LABELS } from "@/lib/receipt-status";
import type { Receipt } from "@/types/receipt";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function status(today: string, date: string): string {
  const days = daysBetween(today, date);
  if (days < 0) return "Passed";
  if (days === 0) return "Last day today";
  return days === 1 ? "1 day left" : `${days} days left`;
}

// Zero page margins stop browsers printing their own header and footer (the page address, date and title);
// each sheet has its own padding instead, repeated on every page it runs onto.
const STYLES = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #21201c; font-size: 11pt; }
  .sheet { padding: 14mm 15mm; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .sheet + .sheet { page-break-before: always; }
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  h1 { font-size: 20pt; margin: 0; }
  .price { font-size: 20pt; font-weight: 700; white-space: nowrap; }
  .muted { color: #63635e; font-size: 10pt; margin-top: 4px; }
  .facts { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; font-size: 10pt; }
  .facts span { color: #63635e; }
  .badge { display: inline-block; margin-top: 10px; padding: 2px 8px; border-radius: 6px; background: #f1f0ef; font-size: 9pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { text-align: left; vertical-align: top; padding: 7px 6px; border-bottom: 1px solid #dad9d6; }
  tr { page-break-inside: avoid; }
  th { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.06em; color: #63635e; }
  .nowrap { white-space: nowrap; }
  .passed { color: #63635e; }
  .open { color: #d13415; font-weight: 600; }
  h2 { font-size: 12pt; margin: 18px 0 0; }
  .photo { margin-top: 10mm; text-align: center; page-break-inside: avoid; }
  .photo img { max-width: 100%; max-height: 200mm; border: 1px solid #dad9d6; border-radius: 4px; }
  .total td { font-weight: 700; border-bottom: none; }
  .right { text-align: right; }
  .whole { text-align: center; }
  .whole img { max-width: 100%; max-height: 262mm; object-fit: contain; }
  .caption { text-align: left; color: #63635e; font-size: 10pt; margin-bottom: 6px; }
`;

function documentHtml(title: string, sheets: string[]): string {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
${sheets.map((sheet) => `<section class="sheet">${sheet}</section>`).join("\n")}
</body>
</html>`;
}

type BodyOptions = { photo?: string; withDeadlines?: boolean };

/** One receipt as a page: what, where and how much at the top, then its deadlines if asked for, then the photo. */
function receiptBody(receipt: Receipt, today: string, { photo, withDeadlines = false }: BodyOptions = {}): string {
  const e = escapeHtml;
  const facts: [string, string][] = [
    ["Shop", receipt.retailer],
    ["Bought", `${formatFullDate(receipt.purchaseDate)}, ${receipt.channel === "online" ? "online" : "in store"}`],
    ["Paid by", PAYMENT_LABELS[receipt.paymentMethod]],
  ];
  if (receipt.returnWindowDays !== undefined) facts.push(["Shop returns", `${receipt.returnWindowDays} days`]);
  if (receipt.warrantyMonths !== undefined) facts.push(["Warranty", `${receipt.warrantyMonths} months`]);

  const deadlines = withDeadlines
    ? `<h2>Deadlines, as of ${e(formatFullDate(today))}</h2>
  <table>
    <tr><th>What</th><th>Until</th><th>Status</th></tr>
    ${getDeadlines(receipt)
      .map(
        (d) => `<tr>
        <td><strong>${e(d.label)}</strong><div class="muted">${e(DEADLINE_EXPLANATIONS[d.kind])}</div></td>
        <td class="nowrap">${e(formatFullDate(d.date))}</td>
        <td class="nowrap ${daysBetween(today, d.date) < 0 ? "passed" : "open"}">${e(status(today, d.date))}</td>
      </tr>`,
      )
      .join("")}
  </table>`
    : "";

  return `
  <div class="top"><h1>${e(receipt.product)}</h1><div class="price">${e(formatPrice(receipt.pricePence))}</div></div>
  <div class="facts">${facts.map(([label, value]) => `<div><span>${e(label)}</span> ${e(value)}</div>`).join("")}</div>
  ${receipt.closed ? `<div class="badge">${e(CLOSED_LABELS[receipt.closed.reason])} ${e(formatFullDate(receipt.closed.on))}</div>` : ""}
  ${deadlines}
  ${photo ? `<div class="photo"><img src="${e(photo)}" alt="Receipt for ${e(receipt.product)}" /></div>` : ""}
`;
}

/** One receipt as a printable page: its details and photo, and its deadlines with what they mean if asked for. */
export function receiptReportHtml(receipt: Receipt, today: string, options: BodyOptions = {}): string {
  return documentHtml(`${receipt.product} receipt`, [receiptBody(receipt, today, options)]);
}

/**
 * Several receipts in one printable document: a summary with the total first, then a page each. `photos` maps
 * receipt ids to image sources to include. `period` describes the dates covered.
 */
export function receiptsReportHtml(
  receipts: Receipt[],
  today: string,
  period: string,
  photos: Record<string, string> = {},
  withDeadlines = false,
): string {
  const e = escapeHtml;
  const total = receipts.reduce((sum, receipt) => sum + receipt.pricePence, 0);
  const rows = receipts
    .map(
      (r) => `<tr>
        <td class="nowrap">${e(formatFullDate(r.purchaseDate))}</td>
        <td>${e(r.product)}${r.closed ? `<div class="muted">${e(CLOSED_LABELS[r.closed.reason])}</div>` : ""}</td>
        <td>${e(r.retailer)}</td>
        <td class="nowrap right">${e(formatPrice(r.pricePence))}</td>
      </tr>`,
    )
    .join("");
  const summary = `
  <div class="top"><h1>Receipts</h1><div class="price">${e(formatPrice(total))}</div></div>
  <div class="muted">${e(period)} · ${receipts.length === 1 ? "1 receipt" : `${receipts.length} receipts`}</div>
  <table>
    <tr><th>Bought</th><th>What</th><th>Shop</th><th class="right">Price</th></tr>
    ${rows}
    <tr class="total"><td></td><td>Total</td><td></td><td class="nowrap right">${e(formatPrice(total))}</td></tr>
  </table>
`;
  const pages = receipts.map((r) => receiptBody(r, today, { photo: photos[r.id], withDeadlines }));
  return documentHtml(`Receipts, ${period}`, [summary, ...pages]);
}

/**
 * Receipt photos as a PDF, one to a page and as large as the page allows. `photos` maps receipt ids to image
 * sources. With several receipts each page has a one-line caption; a receipt with no photo gets its details instead.
 */
export function receiptPhotosHtml(receipts: Receipt[], today: string, photos: Record<string, string>): string {
  const e = escapeHtml;
  const captioned = receipts.length > 1;
  const sheets = receipts.map((r) => {
    const photo = photos[r.id];
    if (!photo) return receiptBody(r, today);
    const caption = captioned
      ? `<div class="caption">${e(r.product)} · ${e(r.retailer)} · ${e(formatFullDate(r.purchaseDate))} · ${e(formatPrice(r.pricePence))}</div>`
      : "";
    return `<div class="whole">${caption}<img src="${e(photo)}" alt="Receipt for ${e(r.product)}" /></div>`;
  });
  return documentHtml(receipts.length === 1 ? `${receipts[0].product} receipt` : "Receipts", sheets);
}
