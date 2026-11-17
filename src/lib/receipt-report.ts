import { DEADLINE_EXPLANATIONS, daysBetween, getDeadlines } from "@/lib/deadlines";
import { PAYMENT_LABELS } from "@/lib/export";
import { formatFullDate, formatPrice } from "@/lib/format";
import type { Receipt } from "@/types/receipt";

export function escapeHtml(text: string): string {
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

/**
 * A printable one-page record of a receipt: its details, every deadline with what it means,
 * and the photo if there is one. Used for "Save as PDF" when making a return or claim.
 */
export function receiptReportHtml(receipt: Receipt, today: string, photoDataUri?: string): string {
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

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<title>${e(receipt.product)} receipt</title>
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c1c1a; font-size: 12pt; }
  .brand { color: #185fa5; font-weight: 800; letter-spacing: 0.04em; font-size: 11pt; }
  h1 { font-size: 22pt; margin: 4px 0 2px; }
  .muted { color: #6b6b66; font-size: 10pt; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { text-align: left; vertical-align: top; padding: 8px 6px; border-bottom: 1px solid #e2e1dc; }
  th { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; color: #6b6b66; }
  .details td:first-child { color: #6b6b66; width: 38%; }
  .nowrap { white-space: nowrap; }
  .passed { color: #6b6b66; }
  .open { color: #185fa5; font-weight: 600; }
  h2 { font-size: 13pt; margin: 22px 0 0; }
  .photo { margin-top: 18px; text-align: center; page-break-inside: avoid; }
  .photo img { max-width: 100%; max-height: 150mm; border: 1px solid #e2e1dc; border-radius: 6px; }
  footer { margin-top: 24px; color: #6b6b66; font-size: 9pt; }
</style>
</head>
<body>
  <div class="brand">KEEPR</div>
  <h1>${e(receipt.product)}</h1>
  <div class="muted">Proof of purchase and your consumer rights deadlines, as of ${e(formatFullDate(today))}</div>

  <table class="details">${details.map(([label, value]) => `<tr><td>${e(label)}</td><td>${e(value)}</td></tr>`).join("")}</table>

  <h2>Deadlines</h2>
  <table>
    <tr><th>What</th><th>Until</th><th>Status</th></tr>
    ${deadlines}
  </table>

  ${photoDataUri ? `<div class="photo"><h2>Receipt</h2><img src="${e(photoDataUri)}" alt="Receipt photo" /></div>` : ""}

  <footer>Made with Keepr. Deadlines are worked out from the details above and UK consumer law; they are guidance, not legal advice.</footer>
</body>
</html>`;
}
