import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Segmented } from "@/components/form";
import { Icon } from "@/components/icon";
import { useTheme } from "@/constants/theme";
import { type ExportPeriod, PERIOD_OPTIONS } from "@/lib/export-range";
import { formatFullDate } from "@/lib/format";
import { type ReceiptsSort, SORT_LABELS, SORT_OPTIONS } from "@/lib/receipt-views";

/** Which purchase dates to show: a period, or the `from` and `to` dates picked for "Pick dates". */
export type DateFilter = { period: ExportPeriod; from: string; to: string };

export function allDates(today: string): DateFilter {
  return { period: "all", from: `${today.slice(0, 7)}-01`, to: today };
}

type Props = {
  sort: ReceiptsSort;
  onSortChange: (sort: ReceiptsSort) => void;
  dates: DateFilter;
  onDatesChange: (dates: DateFilter) => void;
  today: string;
  /** Shown to the left of the Sort & filter button, such as the list or grid switch. */
  leading?: ReactNode;
};

/** A "Sort & filter" button that opens every choice at once: the order, and which purchase dates to show. */
export function ReceiptFilters({ sort, onSortChange, dates, onDatesChange, today, leading }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const datesLabel =
    dates.period === "custom"
      ? `${formatFullDate(dates.from)} to ${formatFullDate(dates.to)}`
      : dates.period === "all"
        ? undefined
        : PERIOD_OPTIONS.find((option) => option.value === dates.period)?.label;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {leading}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort and filter. ${SORT_LABELS[sort]}${datesLabel ? `, ${datesLabel}` : ""}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((shown) => !shown)}
          style={[
            styles.button,
            { backgroundColor: open ? theme.accentSoft : theme.card, borderColor: open ? theme.accent : theme.border },
          ]}
        >
          <Icon name="sort" size={16} color={open ? theme.accent : theme.textMuted} />
          <Text style={[styles.buttonText, { color: theme.text }]} numberOfLines={1}>
            {SORT_LABELS[sort]}
            {datesLabel ? ` · ${datesLabel}` : ""}
          </Text>
        </Pressable>
      </View>
      {open && (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Segmented label="Sort by" value={sort} options={SORT_OPTIONS} onChange={onSortChange} />
          <Segmented
            label="Bought"
            value={dates.period}
            options={PERIOD_OPTIONS}
            onChange={(period) => onDatesChange({ ...dates, period })}
          />
          {dates.period === "custom" && (
            <>
              <DateField label="From" value={dates.from} onChange={(from) => onDatesChange({ ...dates, from })} maximumDate={today} />
              <DateField label="To" value={dates.to} onChange={(to) => onDatesChange({ ...dates, to })} maximumDate={today} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  button: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  buttonText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
});
