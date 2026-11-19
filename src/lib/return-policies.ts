/**
 * Usual change-of-mind return windows of common UK shops, in days. They're a starting point only:
 * shops change them and some items (sale, opened, Christmas) differ, so the form says to check the receipt.
 */
const POLICIES: { names: string[]; days: number }[] = [
  { names: ["argos"], days: 30 },
  { names: ["amazon", "amazon uk", "amazon co uk"], days: 30 },
  { names: ["john lewis", "john lewis and partners"], days: 35 },
  { names: ["marks and spencer", "m and s", "mands", "marks spencer"], days: 35 },
  { names: ["boots"], days: 35 },
  { names: ["next"], days: 28 },
  { names: ["primark"], days: 28 },
  { names: ["asos"], days: 28 },
  { names: ["h and m", "handm", "hm"], days: 28 },
  { names: ["tk maxx", "tkmaxx"], days: 28 },
  { names: ["river island"], days: 28 },
  { names: ["selfridges"], days: 28 },
  { names: ["very"], days: 28 },
  { names: ["zara"], days: 30 },
  { names: ["uniqlo"], days: 30 },
  { names: ["currys", "currys pc world"], days: 21 },
  { names: ["apple", "apple store"], days: 14 },
  { names: ["ikea"], days: 365 },
];

/** "Marks & Spencer Ltd" → "marks and spencer", so different spellings of a shop match. */
export function normaliseShop(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|ltd|limited|plc|uk|store|stores|online|com|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BY_NAME = new Map(POLICIES.flatMap((policy) => policy.names.map((name) => [normaliseShop(name), policy.days])));

/** The shop's usual return window in days, or undefined if Keepr doesn't know it. */
export function usualReturnDays(shop: string): number | undefined {
  const key = normaliseShop(shop);
  return key ? BY_NAME.get(key) : undefined;
}
