import { addDays, getDeadlines } from "@/lib/deadlines";
import type { Receipt } from "@/types/receipt";

/** Reminders go out at 9am local time. */
const REMINDER_HOUR = 9;
/** Days before a deadline to send a heads-up, plus one on the last day. */
const REMINDER_OFFSETS_DAYS = [3, 0];
/** iOS keeps at most 64 scheduled notifications per app; stay under it. */
export const MAX_SCHEDULED_REMINDERS = 60;

export type Reminder = {
  receiptId: string;
  date: Date;
  title: string;
  body: string;
};

function atReminderTime(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, REMINDER_HOUR, 0, 0, 0);
}

/** Every future reminder for these receipts, soonest first, capped at MAX_SCHEDULED_REMINDERS. */
export function planReminders(receipts: Receipt[], now: Date = new Date()): Reminder[] {
  const reminders: Reminder[] = [];

  for (const receipt of receipts) {
    for (const deadline of getDeadlines(receipt)) {
      for (const daysBefore of REMINDER_OFFSETS_DAYS) {
        const date = atReminderTime(addDays(deadline.date, -daysBefore));
        if (date <= now) continue;
        reminders.push({
          receiptId: receipt.id,
          date,
          title: daysBefore === 0 ? `Last day: ${deadline.label}` : `${deadline.label} in ${daysBefore} days`,
          body:
            daysBefore === 0
              ? `Today is the last day for your ${receipt.product} from ${receipt.retailer}.`
              : `Your ${receipt.product} from ${receipt.retailer}: ${deadline.label.toLowerCase()} ends in ${daysBefore} days.`,
        });
      }
    }
  }

  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED_REMINDERS);
}
