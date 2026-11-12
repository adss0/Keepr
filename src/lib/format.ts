const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 7999 → "£79.99", 123456 → "£1,234.56". */
export function formatPrice(pence: number): string {
  const pounds = Math.floor(pence / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const remainder = String(pence % 100).padStart(2, "0");
  return `£${pounds}.${remainder}`;
}

/** "2026-11-05" → "5 Nov", or "5 Nov 2027" when not in `currentYear`. */
export function formatDate(isoDate: string, currentYear?: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const short = `${day} ${MONTHS[month - 1]}`;
  return currentYear === undefined || year === currentYear ? short : `${short} ${year}`;
}

/** "2026-11-05" → "5 Nov 2026". Use for legal deadlines and letters, where the year matters. */
export function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
