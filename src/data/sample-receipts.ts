import { addDays, todayIso } from "@/lib/deadlines";
import type { Receipt } from "@/types/receipt";

/** A date `days` before today, so the sample deadlines always look current. */
function daysAgo(days: number): string {
  return addDays(todayIso(), -days);
}

/** Made-up receipts used until real ones can be saved. */
export const sampleReceipts: Receipt[] = [
  {
    id: "1",
    retailer: "Currys",
    product: "Sony headphones",
    pricePence: 7999,
    purchaseDate: daysAgo(12),
    channel: "online",
    paymentMethod: "credit_card",
    warrantyMonths: 12,
  },
  {
    id: "2",
    retailer: "JD Sports",
    product: "Nike trainers",
    pricePence: 9500,
    purchaseDate: daysAgo(22),
    channel: "in_store",
    paymentMethod: "debit_card",
    returnWindowDays: 28,
  },
  {
    id: "3",
    retailer: "AO.com",
    product: "Washing machine",
    pricePence: 44900,
    purchaseDate: daysAgo(16),
    channel: "online",
    paymentMethod: "credit_card",
    warrantyMonths: 24,
  },
  {
    id: "4",
    retailer: "Argos",
    product: "Kettle",
    pricePence: 3499,
    purchaseDate: daysAgo(240),
    channel: "in_store",
    paymentMethod: "cash",
    warrantyMonths: 12,
  },
  {
    id: "5",
    retailer: "Apple",
    product: "iPad Air",
    pricePence: 59900,
    purchaseDate: daysAgo(2),
    channel: "online",
    paymentMethod: "credit_card",
    returnWindowDays: 14,
    warrantyMonths: 12,
  },
  {
    id: "6",
    retailer: "Tesco",
    product: "Weekly shop",
    pricePence: 6243,
    purchaseDate: daysAgo(45),
    channel: "in_store",
    paymentMethod: "debit_card",
  },
];
