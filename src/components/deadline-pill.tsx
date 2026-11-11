import { StyleSheet, Text, View } from "react-native";

import { type Theme, useTheme } from "@/constants/theme";
import { type Deadline, daysBetween } from "@/lib/deadlines";
import { formatDate } from "@/lib/format";

/** Deadlines this close (in days) are shown as urgent or coming up soon. */
export const URGENT_DAYS = 3;
export const SOON_DAYS = 7;

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
};

export function DeadlinePill({ deadline, today }: Props) {
  const theme = useTheme();
  const daysLeft = deadline ? daysBetween(today, deadline.date) : undefined;
  const tone = toneFor(theme, daysLeft);
  const currentYear = Number(today.slice(0, 4));

  let text: string;
  if (!deadline || daysLeft === undefined) {
    text = "No active deadlines";
  } else if (daysLeft < 0) {
    text = `${deadline.label}: ended ${formatDate(deadline.date, currentYear)}`;
  } else if (daysLeft <= SOON_DAYS) {
    text = `${deadline.label}: ${describeDaysLeft(daysLeft)}`;
  } else {
    text = `${deadline.label}: until ${formatDate(deadline.date, currentYear)}`;
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
});
