import { Fragment, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DeadlinePill } from "@/components/deadline-pill";
import { Fonts, useTheme } from "@/constants/theme";
import { formatDate } from "@/lib/format";
import { type TimelineEntry } from "@/lib/timeline";

const DOT = 12;

/**
 * A receipt's dates as a vertical line: what's passed is muted and short, "Today" marks where you are,
 * and the next thing to run out is highlighted. `extra` adds controls under an entry (such as removing a warranty).
 */
export function ReceiptTimeline({
  entries,
  today,
  extra,
}: {
  entries: TimelineEntry[];
  today: string;
  extra?: (entry: TimelineEntry) => ReactNode;
}) {
  const theme = useTheme();
  const year = Number(today.slice(0, 4));
  // The purchase is never "upcoming", even when it was today.
  const nextIndex = entries.findIndex((entry, index) => index > 0 && entry.date >= today);
  const todayAt = nextIndex === -1 ? entries.length : nextIndex;

  const todayRow = (
    <View key="today" style={styles.row} accessibilityLabel="Today">
      <View style={styles.rail}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <View style={[styles.todayDot, { backgroundColor: theme.accent }]} />
        <View style={[styles.line, { backgroundColor: todayAt < entries.length ? theme.border : "transparent" }]} />
      </View>
      <Text style={[styles.today, { color: theme.accent }]}>Today</Text>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {entries.map((entry, index) => {
        const past = index === 0 || index < todayAt;
        const next = index === nextIndex;
        const last = index === entries.length - 1 && todayAt < entries.length;
        return (
          <Fragment key={entry.key}>
            {index === todayAt && todayRow}
            <View style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.lineTop, { backgroundColor: index === 0 ? "transparent" : theme.border }]} />
                <View
                  style={[
                    styles.dot,
                    next
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : past
                        ? { backgroundColor: theme.textMuted, borderColor: theme.textMuted }
                        : { backgroundColor: theme.card, borderColor: theme.textMuted },
                  ]}
                />
                <View style={[styles.line, { backgroundColor: last ? "transparent" : theme.border }]} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(entry.date, year)}</Text>
                <Text style={[styles.title, { color: past ? theme.textMuted : theme.text }, next && styles.titleNext]}>
                  {entry.title}
                </Text>
                {index === 0 ? (
                  <Text style={[styles.detail, { color: theme.textMuted }]}>{entry.detail}</Text>
                ) : (
                  <>
                    {entry.deadline && <DeadlinePill deadline={entry.deadline} today={today} />}
                    {/* Rights that have run out are kept short; what's still ahead is explained. */}
                    {!past && <Text style={[styles.detail, { color: theme.textMuted }]}>{entry.detail}</Text>}
                  </>
                )}
                {extra?.(entry)}
              </View>
            </View>
          </Fragment>
        );
      })}
      {todayAt === entries.length && todayRow}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rail: {
    width: DOT,
    alignItems: "center",
  },
  lineTop: {
    width: 2,
    height: 12,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 8,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  today: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingVertical: 6,
  },
  body: {
    flex: 1,
    gap: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  date: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  titleNext: {
    fontSize: 16,
  },
  detail: {
    fontSize: 13,
    lineHeight: 19,
  },
});
