import { parsePriceToPence } from "@/lib/receipt-input";
import type { BillingCycle, Subscription } from "@/types/subscription";

export type SubscriptionInput = {
  name: string;
  price: string;
  cycle: BillingCycle;
  nextRenewal: string;
  trialEnds: string;
};

export type SubscriptionInputErrors = Partial<Record<keyof SubscriptionInput, string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

export function emptySubscriptionInput(today: string): SubscriptionInput {
  return { name: "", price: "", cycle: "monthly", nextRenewal: today, trialEnds: "" };
}

export function subscriptionToInput(subscription: Subscription): SubscriptionInput {
  const pounds = Math.floor(subscription.pricePence / 100);
  const pence = String(subscription.pricePence % 100).padStart(2, "0");
  return {
    name: subscription.name,
    price: `${pounds}.${pence}`,
    cycle: subscription.cycle,
    nextRenewal: subscription.nextRenewal,
    trialEnds: subscription.trialEnds ?? "",
  };
}

export function validateSubscriptionInput(
  input: SubscriptionInput,
):
  | { errors: SubscriptionInputErrors; value?: undefined }
  | { errors?: undefined; value: Omit<Subscription, "id"> } {
  const errors: SubscriptionInputErrors = {};

  if (!input.name.trim()) errors.name = "Enter the name of the subscription";

  const pricePence = parsePriceToPence(input.price);
  if (pricePence === undefined) errors.price = "Enter a price, like 10.99";

  if (!isRealDate(input.nextRenewal)) errors.nextRenewal = "Use the format YYYY-MM-DD";

  const trialEnds = input.trialEnds.trim();
  if (trialEnds && !isRealDate(trialEnds)) errors.trialEnds = "Use the format YYYY-MM-DD, or leave it blank";

  if (Object.keys(errors).length > 0 || pricePence === undefined) return { errors };

  return {
    value: {
      name: input.name.trim(),
      pricePence,
      cycle: input.cycle,
      nextRenewal: input.nextRenewal,
      ...(trialEnds && { trialEnds }),
    },
  };
}
