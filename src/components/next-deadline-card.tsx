import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/press-scale";
import { useTheme } from "@/constants/theme";
import { daysBetween, getNextDeadline } from "@/lib/deadlines";
import { formatFullDate } from "@/lib/format";
import type { Receipt } from "@/types/receipt";

/** How far ahead the hero card looks. Further than this, the list says enough. */
const LOOK_AHEAD_DAYS = 30;

/** The single most urgent deadline, with a big countdown, at the top of the home screen. */
export function NextDeadlineCard({ receipts, today }: { receipts: Receipt[]; today: string }) {
  const theme = useTheme();
  const next = receipts
    .map((receipt) => ({ receipt, deadline: getNextDeadline(receipt, today) }))
    .filter((item) => item.deadline && daysBetween(today, item.deadline.date) <= LOOK_AHEAD_DAYS)
    .sort((a, b) => a.deadline!.date.localeCompare(b.deadline!.date))[0];
  if (!next?.deadline) return null;

  const days = daysBetween(today, next.deadline.date);
  const count = days === 0 ? "Today" : String(days);
  const unit = days === 0 ? "last day" : days === 1 ? "day left" : "days left";

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`Next deadline: ${next.deadline.label} for ${next.receipt.product}, ${days === 0 ? "today" : `${days} ${unit}`}`}
      onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: next.receipt.id } })}
      style={StyleSheet.flatten([styles.card, { backgroundColor: theme.accent }])}
    >
      <View style={styles.text}>
        <Text style={[styles.eyebrow, { color: theme.onAccent }]}>Next deadline</Text>
        <Text style={[styles.product, { color: theme.onAccent }]} numberOfLines={1}>
          {next.receipt.product}
        </Text>
        <Text style={[styles.detail, { color: theme.onAccent }]} numberOfLines={1}>
          {next.deadline.label} · {formatFullDate(next.deadline.date)}
        </Text>
      </View>
      <View style={[styles.countdown, { borderColor: theme.onAccent }]}>
        <Text style={[styles.count, { color: theme.onAccent }, days === 0 && styles.countToday]}>{count}</Text>
        <Text style={[styles.unit, { color: theme.onAccent }]}>{unit}</Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 22,
    padding: 18,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.8,
  },
  product: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  detail: {
    fontSize: 14,
    opacity: 0.9,
  },
  countdown: {
    alignItems: "center",
    minWidth: 72,
    paddingLeft: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  count: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
  },
  countToday: {
    fontSize: 24,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.85,
  },
});
