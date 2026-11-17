import { addDays, getDeadlines } from "@/lib/deadlines";
import { formatPrice } from "@/lib/format";
import { nextRenewalOnOrAfter } from "@/lib/subscriptions";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

/** Something due on a day: a receipt deadline, a subscription payment or a free trial ending. */
export type CalendarEvent = {
  kind: "deadline" | "renewal" | "trial";
  date: string;
  title: string;
  detail: string;
  receiptId?: string;
  subscriptionId?: string;
};

/** Every event from `from` to `to` (inclusive, YYYY-MM-DD), grouped by date and sorted within each day. */
export function calendarEvents(
  receipts: Receipt[],
  subscriptions: Subscription[],
  from: string,
  to: string,
): Map<string, CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const inRange = (date: string) => date >= from && date <= to;

  for (const receipt of receipts) {
    for (const deadline of getDeadlines(receipt)) {
      if (!inRange(deadline.date)) continue;
      events.push({
        kind: "deadline",
        date: deadline.date,
        title: deadline.label,
        detail: `${receipt.product} · ${receipt.retailer}`,
        receiptId: receipt.id,
      });
    }
  }

  for (const subscription of subscriptions) {
    const price = formatPrice(subscription.pricePence);
    if (subscription.trialEnds && inRange(subscription.trialEnds)) {
      events.push({
        kind: "trial",
        date: subscription.trialEnds,
        title: `${subscription.name} trial ends`,
        detail: `Then ${price}`,
        subscriptionId: subscription.id,
      });
    }
    // Payments start after any trial. Step from one renewal to the next until past the range.
    let date = nextRenewalOnOrAfter(subscription, from);
    while (date <= to) {
      if (!subscription.trialEnds || date > subscription.trialEnds) {
        events.push({
          kind: "renewal",
          date,
          title: `${subscription.name} renews`,
          detail: price,
          subscriptionId: subscription.id,
        });
      }
      // The day after a renewal is the earliest the next one can be, so this always moves forward.
      date = nextRenewalOnOrAfter(subscription, addDays(date, 1));
    }
  }

  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))) {
    byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);
  }
  return byDate;
}

/** The weeks shown for a month: each week is 7 ISO dates (Monday first), padded with days from the months around it. */
export function monthGrid(year: number, month: number): string[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const start = addDays(first.toISOString().slice(0, 10), -mondayOffset);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((mondayOffset + daysInMonth) / 7);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  );
}
