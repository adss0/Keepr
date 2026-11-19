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

const STYLES = `
  @page { margin: 18mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #21201c; font-size: 12pt; }
  .brand { color: #d13415; font-weight: 800; letter-spacing: 0.04em; font-size: 11pt; }
  h1 { font-size: 22pt; margin: 4px 0 2px; }
  .muted { color: #63635e; font-size: 10pt; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { text-align: left; vertical-align: top; padding: 8px 6px; border-bottom: 1px solid #dad9d6; }
  th { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; color: #63635e; }
  .details td:first-child { color: #63635e; width: 38%; }
  .nowrap { white-space: nowrap; }
  .passed { color: #63635e; }
  .open { color: #d13415; font-weight: 600; }
  h2 { font-size: 13pt; margin: 22px 0 0; }
  .photo { margin-top: 18px; text-align: center; page-break-inside: avoid; }
  .photo img { max-width: 100%; max-height: 150mm; border: 1px solid #dad9d6; border-radius: 6px; }
  footer { margin-top: 24px; color: #63635e; font-size: 9pt; }
  .receipt { page-break-before: always; }
  .total td { font-weight: 700; border-bottom: none; }
  .right { text-align: right; }
`;

const FOOTER =
  "Made with Keepr. Deadlines are worked out from the details above and UK consumer law; they are guidance, not legal advice.";

function documentHtml(title: string, body: string): string {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
  <div class="brand">KEEPR</div>
${body}
  <footer>${FOOTER}</footer>
</body>
</html>`;
}

/** One receipt's details, deadlines and photo, as part of a printable page. */
function receiptBody(receipt: Receipt, today: string, photoDataUri?: string): string {
  const e = escapeHtml;
  const details: [string, string][] = [
    ["Product", receipt.product],
    ["Shop", receipt.retailer],
    ["Price", formatPrice(receipt.pricePence)],
    ["Date bought", formatFullDate(receipt.purchaseDate)],
    ["Bought", receipt.channel === "online" ? "Online" : "In store"],
    ["Paid by", PAYMENT_LABELS[receipt.paymentMethod]],
  ];
  if (receipt.returnWindowDays !== undefined) details.push(["Shop return window", `${receipt.returnWindowDays} days`]);
  if (receipt.warrantyMonths !== undefined) details.push(["Warranty", `${receipt.warrantyMonths} months`]);

  const deadlines = getDeadlines(receipt)
    .map(
      (d) => `<tr>
        <td><strong>${e(d.label)}</strong><div class="muted">${e(DEADLINE_EXPLANATIONS[d.kind])}</div></td>
        <td class="nowrap">${e(formatFullDate(d.date))}</td>
        <td class="nowrap ${daysBetween(today, d.date) < 0 ? "passed" : "open"}">${e(status(today, d.date))}</td>
      </tr>`,
    )
    .join("");

  return `
  <h1>${e(receipt.product)}</h1>
  <div class="muted">Proof of purchase and your consumer rights deadlines, as of ${e(formatFullDate(today))}</div>

  <table class="details">${details.map(([label, value]) => `<tr><td>${e(label)}</td><td>${e(value)}</td></tr>`).join("")}</table>

  <h2>Deadlines</h2>
  <table>
    <tr><th>What</th><th>Until</th><th>Status</th></tr>
    ${deadlines}
  </table>

  ${photoDataUri ? `<div class="photo"><h2>Receipt</h2><img src="${e(photoDataUri)}" alt="Receipt photo" /></div>` : ""}

`;
}

/**
 * A printable one-page record of a receipt: its details, every deadline with what it means,
 * and the photo if there is one. Used for "Save as PDF" when making a return or claim.
 */
export function receiptReportHtml(receipt: Receipt, today: string, photoDataUri?: string): string {
  return documentHtml(`${receipt.product} receipt`, receiptBody(receipt, today, photoDataUri));
}

/**
 * Several receipts in one printable document: a summary table with the total first, then each receipt on its
 * own page. `photos` maps receipt ids to image sources to include. `period` describes the dates covered.
 */
export function receiptsReportHtml(
  receipts: Receipt[],
  today: string,
  period: string,
  photos: Record<string, string> = {},
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
  const summary = `  <h1>Your receipts</h1>
  <div class="muted">${e(period)} · ${receipts.length === 1 ? "1 receipt" : `${receipts.length} receipts`} · as of ${e(formatFullDate(today))}</div>
  <table>
    <tr><th>Bought</th><th>What</th><th>Shop</th><th class="right">Price</th></tr>
    ${rows}
    <tr class="total"><td></td><td>Total</td><td></td><td class="nowrap right">${e(formatPrice(total))}</td></tr>
  </table>
`;
  const pages = receipts
    .map((r) => `  <section class="receipt">${receiptBody(r, today, photos[r.id])}</section>
`)
    .join("");
  return documentHtml(`Keepr receipts, ${period}`, summary + pages);
}
