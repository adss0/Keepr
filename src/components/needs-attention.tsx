import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/press-scale";
import { Fonts, useTheme } from "@/constants/theme";
import { type AttentionItem, needsAttention } from "@/lib/attention";
import { daysBetween } from "@/lib/deadlines";
import { formatDate, formatFullDate } from "@/lib/format";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

/** The hero plus this many smaller rows; the rest are in the Calendar. */
const SHOWN = 3;

function open(item: AttentionItem) {
  if (item.receiptId) router.push({ pathname: "/receipt/[id]", params: { id: item.receiptId } });
  else if (item.subscriptionId) router.push({ pathname: "/subscriptions/edit/[id]", params: { id: item.subscriptionId } });
}

function whenText(days: number): string {
  return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`;
}

/**
 * The top of the home screen: what needs doing soon (receipt deadlines, trials ending, payments), most urgent
 * first, each opening its receipt or subscription. When nothing does, a calm note says so instead.
 */
export function NeedsAttention({
  receipts,
  subscriptions,
  today,
}: {
  receipts: Receipt[];
  subscriptions: Subscription[];
  today: string;
}) {
  const theme = useTheme();
  const { now, later } = needsAttention(receipts, subscriptions, today);

  if (now.length === 0) {
    return (
      <View style={[styles.calm, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.calmTitle, { color: theme.text }]}>You&apos;re all caught up</Text>
        <Text style={[styles.calmText, { color: theme.textMuted }]}>
          {later
            ? `Nothing due in the next two weeks. Next: ${later.label.toLowerCase()} ${formatDate(later.date, Number(today.slice(0, 4)))} for ${later.name}.`
            : "Nothing needs your attention right now."}
        </Text>
      </View>
    );
  }

  const [first, ...rest] = now;
  const days = daysBetween(today, first.date);
  const count = days === 0 ? "Today" : String(days);
  const unit = days === 0 ? "last day" : days === 1 ? "day left" : "days left";
  const more = now.length - SHOWN;

  return (
    <View style={styles.group}>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={`${first.label} ${formatFullDate(first.date)}: ${first.name}, ${days === 0 ? "today" : `${days} ${unit}`}`}
        onPress={() => open(first)}
        style={StyleSheet.flatten([styles.hero, { backgroundColor: theme.primary }])}
      >
        <View style={styles.heroText}>
          <Text style={[styles.eyebrow, { color: theme.onPrimary }]}>Needs attention</Text>
          <Text style={[styles.heroName, { color: theme.onPrimary }]} numberOfLines={1}>
            {first.name}
          </Text>
          <Text style={[styles.heroDetail, { color: theme.onPrimary }]} numberOfLines={1}>
            {first.label} {formatDate(first.date, Number(today.slice(0, 4)))} · {first.detail}
          </Text>
        </View>
        <View style={[styles.countdown, { borderColor: theme.onPrimary }]}>
          <Text style={[styles.count, { color: theme.onPrimary }, days === 0 && styles.countToday]}>{count}</Text>
          <Text style={[styles.unit, { color: theme.onPrimary }]}>{unit}</Text>
        </View>
      </PressScale>

      {rest.length > 0 && (
        <View style={[styles.rows, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {rest.slice(0, SHOWN - 1).map((item, index) => {
            const itemDays = daysBetween(today, item.date);
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} ${formatFullDate(item.date)}: ${item.name}, ${whenText(itemDays)}`}
                onPress={() => open(item)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.rowDetail, { color: theme.textMuted }]} numberOfLines={1}>
                    {item.label} · {item.detail}
                  </Text>
                </View>
                <Text style={[styles.rowWhen, { color: itemDays <= 3 ? theme.urgentText : theme.text }]}>{whenText(itemDays)}</Text>
              </Pressable>
            );
          })}
          {more > 0 && (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/calendar")}
              style={({ pressed }) => [styles.row, { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.moreText, { color: theme.accent }]}>
                {more} more coming up · see the calendar
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 22,
    padding: 18,
  },
  heroText: {
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
  heroName: {
    fontSize: 20,
    letterSpacing: -0.3,
    fontFamily: Fonts.display,
  },
  heroDetail: {
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
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
    fontFamily: Fonts.display,
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
  rows: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDetail: {
    fontSize: 13,
  },
  rowWhen: {
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
  moreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  calm: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  calmTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  calmText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
