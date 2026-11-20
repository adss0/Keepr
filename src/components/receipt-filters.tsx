import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { DateField } from "@/components/date-field";
import { FilterMenu } from "@/components/filter-menu";
import { useTheme } from "@/constants/theme";
import { type ExportPeriod, PERIOD_OPTIONS } from "@/lib/export-range";
import { formatDate } from "@/lib/format";
import { type ReceiptsSort, SORT_LABELS, SORT_OPTIONS } from "@/lib/receipt-views";

/** Which purchase dates to show: a period, or the `from` and `to` dates picked for "Pick dates". */
export type DateFilter = { period: ExportPeriod; from: string; to: string };

export function allDates(today: string): DateFilter {
  return { period: "all", from: `${today.slice(0, 7)}-01`, to: today };
}

const DATE_OPTIONS = PERIOD_OPTIONS.map((option) => ({
  ...option,
  label: option.value === "all" ? "Any date" : option.value === "custom" ? "Pick dates…" : option.label,
}));

type Props = {
  sort: ReceiptsSort;
  onSortChange: (sort: ReceiptsSort) => void;
  dates: DateFilter;
  onDatesChange: (dates: DateFilter) => void;
  today: string;
  /** Whose receipts: everyone's, just mine, or one space. "all" is the default. */
  who?: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void };
  /** Shown at the right end of the row, such as the list or grid switch. */
  trailing?: ReactNode;
};

/** A row of chips (whose, which dates, what order); each lists its options and applies a choice at once. */
export function ReceiptFilters({ sort, onSortChange, dates, onDatesChange, today, who, trailing }: Props) {
  const theme = useTheme();
  // On a phone the chips need the whole width, so anything trailing (Select, list or grid) gets its own line.
  const narrow = useWindowDimensions().width < 600;
  const currentYear = Number(today.slice(0, 4));
  const datesLabel =
    dates.period === "custom"
      ? `${formatDate(dates.from, currentYear)} – ${formatDate(dates.to, currentYear)}`
      : (DATE_OPTIONS.find((option) => option.value === dates.period)?.label ?? "Any date");
  const filtering = dates.period !== "all" || (who !== undefined && who.value !== "all");

  return (
    <View style={narrow ? styles.stacked : styles.row}>
      {narrow && trailing ? <View style={styles.trailingLine}>{trailing}</View> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={narrow ? undefined : styles.scroll}>
        {who && (
          <FilterMenu
            title="Show"
            chipLabel={who.options.find((option) => option.value === who.value)?.label ?? "All receipts"}
            value={who.value}
            options={who.options}
            onChange={who.onChange}
            active={who.value !== "all"}
          />
        )}
        <FilterMenu
          title="Bought"
          chipLabel={datesLabel}
          value={dates.period}
          options={DATE_OPTIONS}
          onChange={(period) => onDatesChange({ ...dates, period })}
          active={dates.period !== "all"}
          stayOpenFor="custom"
          extra={
            <>
              <DateField label="From" value={dates.from} onChange={(from) => onDatesChange({ ...dates, from })} maximumDate={today} />
              <DateField label="To" value={dates.to} onChange={(to) => onDatesChange({ ...dates, to })} maximumDate={today} />
            </>
          }
        />
        <FilterMenu title="Sort by" chipLabel={SORT_LABELS[sort]} value={sort} options={SORT_OPTIONS} onChange={onSortChange} />
        {filtering && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            hitSlop={6}
            onPress={() => {
              onDatesChange({ ...dates, period: "all" });
              who?.onChange("all");
            }}
            style={styles.clear}
          >
            <Text style={[styles.clearText, { color: theme.textMuted }]}>Clear</Text>
          </Pressable>
        )}
      </ScrollView>
      {narrow ? null : trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stacked: {
    gap: 8,
  },
  trailingLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  scroll: {
    flex: 1,
  },
  chips: {
    gap: 8,
    alignItems: "center",
  },
  clear: {
    paddingHorizontal: 6,
    height: 36,
    justifyContent: "center",
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
