import { addDays, getDeadlines, todayIso } from "@/lib/deadlines";
import { formatPrice } from "@/lib/format";
import { nextRenewalOnOrAfter } from "@/lib/subscriptions";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

/** When reminders go out. Users can change these in Settings. */
export type ReminderOptions = {
  /** Days before a deadline to send a heads-up. */
  daysBefore: number;
  /** Also remind on the last day itself. */
  onLastDay: boolean;
  /** Hour of the day (0–23, local time). */
  hour: number;
};

export const DEFAULT_REMINDER_OPTIONS: ReminderOptions = { daysBefore: 3, onLastDay: true, hour: 9 };

/** "in 3 days", or "tomorrow" for 1. */
function inDays(days: number): string {
  return days === 1 ? "tomorrow" : `in ${days} days`;
}
/** iOS keeps at most 64 scheduled notifications per app; stay under it. */
export const MAX_SCHEDULED_REMINDERS = 60;

export type Reminder = {
  /** The receipt or subscription the reminder is about. */
  receiptId?: string;
  subscriptionId?: string;
  date: Date;
  title: string;
  body: string;
};

function atHour(isoDate: string, hour: number): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

/**
 * Every future reminder for these receipts and subscriptions, soonest first,
 * capped at MAX_SCHEDULED_REMINDERS.
 */
export function planReminders(
  receipts: Receipt[],
  now: Date = new Date(),
  subscriptions: Subscription[] = [],
  options: ReminderOptions = DEFAULT_REMINDER_OPTIONS,
): Reminder[] {
  const reminders: Reminder[] = [];
  const offsets = [...new Set([options.daysBefore, ...(options.onLastDay ? [0] : [])])];
  const atReminderTime = (isoDate: string) => atHour(isoDate, options.hour);

  for (const receipt of receipts) {
    if (receipt.closed) continue;
    for (const deadline of getDeadlines(receipt)) {
      for (const daysBefore of offsets) {
        const date = atReminderTime(addDays(deadline.date, -daysBefore));
        if (date <= now) continue;
        reminders.push({
          receiptId: receipt.id,
          date,
          title: daysBefore === 0 ? `Last day: ${deadline.label}` : `${deadline.label} ${inDays(daysBefore)}`,
          body:
            daysBefore === 0
              ? `Today is the last day for your ${receipt.product} from ${receipt.retailer}.`
              : `Your ${receipt.product} from ${receipt.retailer}: ${deadline.label.toLowerCase()} ends ${inDays(daysBefore)}.`,
        });
      }
    }
  }

  const today = todayIso(now);
  for (const subscription of subscriptions) {
    const price = formatPrice(subscription.pricePence);

    if (subscription.trialEnds && subscription.trialEnds >= today) {
      for (const daysBefore of offsets) {
        const date = atReminderTime(addDays(subscription.trialEnds, -daysBefore));
        if (date <= now) continue;
        reminders.push({
          subscriptionId: subscription.id,
          date,
          title: daysBefore === 0 ? `${subscription.name} trial ends today` : `${subscription.name} trial ends ${inDays(daysBefore)}`,
          body: `Cancel before it ends if you don't want to pay ${price}.`,
        });
      }
    } else {
      const renewal = nextRenewalOnOrAfter(subscription, today);
      const date = atReminderTime(addDays(renewal, -options.daysBefore));
      if (date > now) {
        reminders.push({
          subscriptionId: subscription.id,
          date,
          title: `${subscription.name} renews ${inDays(options.daysBefore)}`,
          body: `You'll be charged ${price}. Cancel before then if you no longer use it.`,
        });
      }
    }
  }

  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED_REMINDERS);
}
