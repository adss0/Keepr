import { addDays, DEADLINE_WORDS, getNextDeadline } from "@/lib/deadlines";
import { formatPrice } from "@/lib/format";
import { nextRenewalOnOrAfter } from "@/lib/subscriptions";
import type { Receipt } from "@/types/receipt";
import type { BillingCycle, Subscription } from "@/types/subscription";

/** Something coming up that the user may need to act on, from a receipt or a subscription. */
export type AttentionItem = {
  key: string;
  kind: "deadline" | "trial" | "renewal";
  date: string;
  /** What's due: "Refund by", "Trial ends", "Renews". */
  label: string;
  /** The product or subscription. */
  name: string;
  /** Price and shop, or what it will cost. */
  detail: string;
  receiptId?: string;
  subscriptionId?: string;
};

/**
 * How far ahead each kind counts as needing attention. Monthly renewals are routine, so only the next few days
 * of them; a trial ending turns into a charge, so a week; receipt deadlines can't be got back, so two weeks.
 */
export const ATTENTION_DAYS = { deadline: 14, trial: 7, renewal: 3 } as const;
/** How far ahead "all caught up" looks for the next thing to mention. */
const LATER_DAYS = 90;
/**
 * Missing a deadline or a trial loses money for good, so those come first, soonest first; routine payments after.
 * On the same day, a trial (about to start charging) comes before a deadline.
 */
const TIER = { trial: 0, deadline: 0, renewal: 1 } as const;
const SAME_DAY_ORDER = { trial: 0, deadline: 1, renewal: 2 } as const;

const CYCLE_SUFFIX: Record<BillingCycle, string> = { weekly: "/week", monthly: "/month", yearly: "/year" };

function upcoming(receipts: Receipt[], subscriptions: Subscription[], today: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const receipt of receipts) {
    const deadline = getNextDeadline(receipt, today);
    if (!deadline) continue;
    items.push({
      key: `receipt-${receipt.id}`,
      kind: "deadline",
      date: deadline.date,
      label: DEADLINE_WORDS[deadline.kind].by,
      name: receipt.product,
      detail: `${formatPrice(receipt.pricePence)} · ${receipt.retailer}`,
      receiptId: receipt.id,
    });
  }
  for (const subscription of subscriptions) {
    const price = `${formatPrice(subscription.pricePence)}${CYCLE_SUFFIX[subscription.cycle]}`;
    const trialRunning = subscription.trialEnds !== undefined && subscription.trialEnds >= today;
    items.push(
      trialRunning
        ? {
            key: `subscription-${subscription.id}`,
            kind: "trial",
            date: subscription.trialEnds!,
            label: "Trial ends",
            name: subscription.name,
            detail: `Then ${price}`,
            subscriptionId: subscription.id,
          }
        : {
            key: `subscription-${subscription.id}`,
            kind: "renewal",
            date: nextRenewalOnOrAfter(subscription, today),
            label: "Renews",
            name: subscription.name,
            detail: price,
            subscriptionId: subscription.id,
          },
    );
  }
  return items.sort(
    (a, b) => TIER[a.kind] - TIER[b.kind] || a.date.localeCompare(b.date) || SAME_DAY_ORDER[a.kind] - SAME_DAY_ORDER[b.kind],
  );
}

/**
 * What needs attention now, most urgent first: each receipt's next deadline, a trial ending or a payment, inside
 * its own look-ahead (see ATTENTION_DAYS). When nothing does, `later` is the next receipt deadline after that, if any.
 */
export function needsAttention(
  receipts: Receipt[],
  subscriptions: Subscription[],
  today: string,
): { now: AttentionItem[]; later?: AttentionItem } {
  const all = upcoming(receipts, subscriptions, today);
  const now = all.filter((item) => item.date <= addDays(today, ATTENTION_DAYS[item.kind]));
  const later = now.length
    ? undefined
    : all
        .filter((item) => item.kind === "deadline" && item.date <= addDays(today, LATER_DAYS))
        .sort((a, b) => a.date.localeCompare(b.date))[0];
  return { now, later };
}
