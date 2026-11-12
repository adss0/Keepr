import { addDays, addMonths } from "@/lib/deadlines";
import type { BillingCycle, Subscription } from "@/types/subscription";

/** Cost per month in pence, averaged over a year (a weekly £1 is £4.33 a month). */
export function monthlyCostPence(subscription: Pick<Subscription, "pricePence" | "cycle">): number {
  switch (subscription.cycle) {
    case "weekly":
      return Math.round((subscription.pricePence * 52) / 12);
    case "monthly":
      return subscription.pricePence;
    case "yearly":
      return Math.round(subscription.pricePence / 12);
  }
}

export function totalMonthlyPence(subscriptions: Subscription[]): number {
  return subscriptions.reduce((total, subscription) => total + monthlyCostPence(subscription), 0);
}

export function totalYearlyPence(subscriptions: Subscription[]): number {
  return subscriptions.reduce((total, subscription) => {
    switch (subscription.cycle) {
      case "weekly":
        return total + subscription.pricePence * 52;
      case "monthly":
        return total + subscription.pricePence * 12;
      case "yearly":
        return total + subscription.pricePence;
    }
  }, 0);
}

/** The date `cycles` billing cycles after `isoDate`. */
function addCycles(isoDate: string, cycle: BillingCycle, cycles: number): string {
  switch (cycle) {
    case "weekly":
      return addDays(isoDate, 7 * cycles);
    case "monthly":
      return addMonths(isoDate, cycles);
    case "yearly":
      return addMonths(isoDate, 12 * cycles);
  }
}

/** The next renewal on or after `today`, rolling a passed date forward by whole billing cycles. */
export function nextRenewalOnOrAfter(subscription: Pick<Subscription, "nextRenewal" | "cycle">, today: string): string {
  // Always count from the original date, so billing on the 31st stays on the 31st where the month allows.
  let date = subscription.nextRenewal;
  for (let cycles = 1; date < today; cycles++) {
    date = addCycles(subscription.nextRenewal, subscription.cycle, cycles);
  }
  return date;
}

/** Subscriptions sorted by when they next charge you (an active trial ending counts as a charge). */
export function sortByNextCharge(subscriptions: Subscription[], today: string): Subscription[] {
  const nextCharge = (subscription: Subscription) =>
    subscription.trialEnds && subscription.trialEnds >= today
      ? subscription.trialEnds
      : nextRenewalOnOrAfter(subscription, today);
  return [...subscriptions].sort((a, b) => nextCharge(a).localeCompare(nextCharge(b)));
}
