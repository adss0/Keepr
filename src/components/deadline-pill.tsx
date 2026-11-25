import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { type Theme, useTheme } from "@/constants/theme";
import { type Deadline, DEADLINE_WORDS, daysBetween } from "@/lib/deadlines";
import { formatDate } from "@/lib/format";
import { closedText } from "@/lib/receipt-status";
import type { Receipt } from "@/types/receipt";

/** Deadlines this close (in days) are shown as urgent or coming up soon. */
const URGENT_DAYS = 3;
const SOON_DAYS = 7;

export type Tone = { bg: string; text: string; border: string };

/** Colours for a deadline `daysLeft` away (undefined = no deadline, negative = passed). */
export function toneFor(theme: Theme, daysLeft: number | undefined): Tone {
  if (daysLeft === undefined || daysLeft < 0 || daysLeft > SOON_DAYS) {
    return { bg: theme.calmBg, text: theme.calmText, border: theme.border };
  }
  if (daysLeft <= URGENT_DAYS) {
    return { bg: theme.urgentBg, text: theme.urgentText, border: theme.urgentText };
  }
  return { bg: theme.soonBg, text: theme.soonText, border: theme.soonText };
}

function describeDaysLeft(days: number): string {
  if (days === 0) return "ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

type Props = {
  deadline: Deadline | undefined;
  today: string;
  /** A finished-with receipt shows how it ended instead of a deadline. */
  closed?: Receipt["closed"];
  /** Narrow spaces (grid tiles): a finished receipt just says "Finished", without how or when. */
  compact?: boolean;
};

export function DeadlinePill({ deadline, today, closed, compact }: Props) {
  const theme = useTheme();
  const daysLeft = deadline ? daysBetween(today, deadline.date) : undefined;
  const tone = toneFor(theme, daysLeft);
  const currentYear = Number(today.slice(0, 4));

  if (closed) {
    // Inverted and ticked, so a finished receipt can't be mistaken for one with a deadline still running.
    return (
      <View
        accessible
        accessibilityLabel={`Finished: ${closedText(closed, currentYear)}`}
        style={[styles.pill, styles.finished, { backgroundColor: theme.primary }]}
      >
        <Icon name="check" size={12} color={theme.onPrimary} />
        <Text style={[styles.text, styles.finishedText, { color: theme.onPrimary }]}>Finished</Text>
        {!compact && <Text style={[styles.text, { color: theme.onPrimary }]}>· {closedText(closed, currentYear)}</Text>}
      </View>
    );
  }

  let text: string;
  if (!deadline || daysLeft === undefined) {
    text = "No active deadlines";
  } else if (daysLeft < 0) {
    text = `${DEADLINE_WORDS[deadline.kind].ended} ${formatDate(deadline.date, currentYear)}`;
  } else if (daysLeft <= SOON_DAYS) {
    text = `${DEADLINE_WORDS[deadline.kind].name}: ${describeDaysLeft(daysLeft)}`;
  } else {
    text = `${DEADLINE_WORDS[deadline.kind].by} ${formatDate(deadline.date, currentYear)}`;
  }

  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
  finished: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  finishedText: {
    fontWeight: "700",
  },
});
