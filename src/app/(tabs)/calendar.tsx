import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { PressScale } from "@/components/press-scale";
import { ScreenHeader } from "@/components/screen-header";
import { type Theme, useTheme } from "@/constants/theme";
import { useReceipts } from "@/data/receipts";
import { useSubscriptions } from "@/data/subscriptions";
import { type CalendarEvent, calendarEvents, monthGrid } from "@/lib/calendar";
import { addDays, daysBetween, todayIso } from "@/lib/deadlines";
import { formatDate } from "@/lib/format";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
/** How far ahead "Coming up" looks. */
const COMING_UP_DAYS = 60;

function eventColour(theme: Theme, event: CalendarEvent, today: string): string {
  if (event.kind === "renewal") return theme.accent;
  if (event.kind === "trial") return theme.trial;
  const days = daysBetween(today, event.date);
  if (days < 0) return theme.textMuted;
  return days <= 3 ? theme.urgentText : days <= 14 ? theme.soonText : theme.calmText;
}

function openEvent(event: CalendarEvent) {
  if (event.receiptId) router.push({ pathname: "/receipt/[id]", params: { id: event.receiptId } });
  else if (event.subscriptionId) router.push({ pathname: "/subscriptions/edit/[id]", params: { id: event.subscriptionId } });
}

function EventRow({ event, today, showDate }: { event: CalendarEvent; today: string; showDate?: boolean }) {
  const theme = useTheme();
  const colour = eventColour(theme, event, today);
  const days = daysBetween(today, event.date);
  const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : formatDate(event.date, Number(today.slice(0, 4)));
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.detail}${showDate ? `, ${when}` : ""}`}
      onPress={() => openEvent(event)}
      style={StyleSheet.flatten([styles.event, { backgroundColor: theme.card, borderColor: theme.border }])}
    >
      <View style={[styles.eventBar, { backgroundColor: colour }]} />
      <View style={styles.eventText}>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.eventDetail, { color: theme.textMuted }]} numberOfLines={1}>
          {event.detail}
        </Text>
      </View>
      {showDate && <Text style={[styles.eventWhen, { color: colour }]}>{when}</Text>}
      <Icon name="chevronRight" size={16} color={theme.textMuted} />
    </PressScale>
  );
}

export default function CalendarScreen() {
  const theme = useTheme();
  const today = todayIso();
  const receipts = useReceipts();
  const { subscriptions } = useSubscriptions();
  const [month, setMonth] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
  const [selected, setSelected] = useState(today);

  const weeks = useMemo(() => monthGrid(month.year, month.month), [month]);
  const gridStart = weeks[0][0];
  const gridEnd = weeks[weeks.length - 1][6];
  const events = useMemo(
    () => calendarEvents(receipts, subscriptions, gridStart, gridEnd),
    [receipts, subscriptions, gridStart, gridEnd],
  );
  const comingUp = useMemo(
    () => [...calendarEvents(receipts, subscriptions, today, addDays(today, COMING_UP_DAYS)).values()].flat().slice(0, 8),
    [receipts, subscriptions, today],
  );

  const monthKey = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const dueThisMonth = [...events.entries()]
    .filter(([date]) => date.startsWith(monthKey))
    .reduce((count, [, dayEvents]) => count + dayEvents.length, 0);
  const selectedEvents = events.get(selected) ?? [];

  function changeMonth(delta: number) {
    setMonth((current) => {
      const index = current.year * 12 + (current.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  function goToToday() {
    setMonth({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
    setSelected(today);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Calendar"
        subtitle={dueThisMonth === 0 ? "Nothing due this month" : `${dueThisMonth} due in ${MONTHS[month.month - 1]}`}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.calendar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.monthRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10} onPress={() => changeMonth(-1)}>
              <Icon name="chevronLeft" size={22} color={theme.accent} />
            </Pressable>
            <Text accessibilityRole="header" style={[styles.monthTitle, { color: theme.text }]}>
              {MONTHS[month.month - 1]} {month.year}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={10} onPress={() => changeMonth(1)}>
              <Icon name="chevronRight" size={22} color={theme.accent} />
            </Pressable>
          </View>

          <View style={styles.week}>
            {WEEKDAYS.map((day, index) => (
              <Text key={index} style={[styles.weekday, { color: theme.textMuted }]}>
                {day}
              </Text>
            ))}
          </View>

          {weeks.map((week) => (
            <View key={week[0]} style={styles.week}>
              {week.map((date) => {
                const inMonth = date.startsWith(monthKey);
                const isToday = date === today;
                const isSelected = date === selected;
                const dayEvents = events.get(date) ?? [];
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDate(date, 0)}${dayEvents.length ? `, ${dayEvents.length} due` : ""}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelected(date)}
                    style={styles.day}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && { backgroundColor: theme.primary },
                        !isSelected && isToday && { borderColor: theme.accent, borderWidth: 1.5 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          { color: isSelected ? theme.onPrimary : inMonth ? theme.text : theme.textMuted },
                          !inMonth && styles.otherMonth,
                          isToday && styles.today,
                        ]}
                      >
                        {Number(date.slice(8))}
                      </Text>
                    </View>
                    <View style={styles.dots}>
                      {dayEvents.slice(0, 3).map((event, index) => (
                        <View key={index} style={[styles.dot, { backgroundColor: eventColour(theme, event, today) }]} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legend}>
            {[
              { label: "Due in 3 days", colour: theme.urgentText },
              { label: "Deadline", colour: theme.soonText },
              { label: "Trial ends", colour: theme.trial },
              { label: "Payment", colour: theme.accent },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: item.colour }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>{item.label}</Text>
              </View>
            ))}
            {(selected !== today || !monthKey.startsWith(today.slice(0, 7))) && (
              <Pressable accessibilityRole="button" onPress={goToToday} hitSlop={8} style={styles.todayButton}>
                <Text style={{ color: theme.accent, fontWeight: "600" }}>Today</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {selected === today ? "Today" : formatDate(selected, Number(today.slice(0, 4)))}
        </Text>
        {selectedEvents.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Nothing due on this day.</Text>
        ) : (
          <View style={styles.events}>
            {selectedEvents.map((event, index) => (
              <EventRow key={`${event.title}-${index}`} event={event} today={today} />
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Coming up</Text>
        {comingUp.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            Nothing due in the next {COMING_UP_DAYS} days. Add receipts and subscriptions to see their deadlines here.
          </Text>
        ) : (
          <View style={styles.events}>
            {comingUp.map((event, index) => (
              <EventRow key={`${event.date}-${event.title}-${index}`} event={event} today={today} showDate />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  calendar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 12,
    gap: 4,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  week: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    paddingBottom: 4,
  },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 3,
    minHeight: 48,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  otherMonth: {
    opacity: 0.45,
  },
  today: {
    fontWeight: "800",
  },
  dots: {
    flexDirection: "row",
    gap: 3,
    height: 6,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    fontSize: 12,
  },
  todayButton: {
    marginLeft: "auto",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  empty: {
    fontSize: 15,
    lineHeight: 21,
  },
  events: {
    gap: 8,
  },
  event: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
    paddingRight: 12,
    overflow: "hidden",
  },
  eventBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 8,
  },
  eventText: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  eventDetail: {
    fontSize: 13,
  },
  eventWhen: {
    fontSize: 13,
    fontWeight: "600",
  },
});
