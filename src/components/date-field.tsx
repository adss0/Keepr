import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { createElement } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/constants/theme";
import { addDays, todayIso } from "@/lib/deadlines";
import { formatFullDate } from "@/lib/format";

type Props = {
  label: string;
  /** ISO date (YYYY-MM-DD), or "" for no date. */
  value: string;
  onChange: (isoDate: string) => void;
  hint?: string;
  error?: string;
  /** Latest date that can be picked, as an ISO date. */
  maximumDate?: string;
  /** Show "Today" and "Yesterday" shortcuts, for dates in the past. */
  pastShortcuts?: boolean;
  /** Let the user remove the date (for optional dates). */
  clearable?: boolean;
};

function toDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** A date picker that works the native way on each platform, plus quick shortcuts. */
export function DateField({ label, value, onChange, hint, error, maximumDate, pastShortcuts, clearable }: Props) {
  const theme = useTheme();
  const today = todayIso();
  const hasValue = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const current = hasValue ? toDate(value) : new Date();
  const max = maximumDate ? toDate(maximumDate) : undefined;

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: current,
      mode: "date",
      maximumDate: max,
      onValueChange: (_event, date) => onChange(todayIso(date)),
    });
  }

  const chip = (title: string, isoDate: string) => {
    const selected = value === isoDate;
    return (
      <Pressable
        key={title}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(isoDate)}
        style={[
          styles.chip,
          { backgroundColor: selected ? theme.accent : theme.card, borderColor: selected ? theme.accent : theme.border },
        ]}
      >
        <Text style={{ color: selected ? theme.onAccent : theme.text, fontWeight: "500" }}>{title}</Text>
      </Pressable>
    );
  };

  let picker;
  if (Platform.OS === "web") {
    picker = createElement("input", {
      type: "date",
      value: hasValue ? value : "",
      max: maximumDate,
      "aria-label": label,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      style: {
        fontSize: 16,
        padding: "9px 12px",
        borderRadius: 10,
        border: `1px solid ${error ? theme.urgentText : theme.border}`,
        backgroundColor: theme.card,
        color: theme.text,
        fontFamily: "inherit",
      },
    });
  } else if (Platform.OS === "ios") {
    picker = hasValue ? (
      <DateTimePicker
        value={current}
        mode="date"
        display="compact"
        maximumDate={max}
        accessibilityLabel={label}
        onValueChange={(_event, date) => onChange(todayIso(date))}
        style={styles.iosPicker}
      />
    ) : (
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(maximumDate && maximumDate < today ? maximumDate : today)}
        style={[styles.input, { backgroundColor: theme.card, borderColor: error ? theme.urgentText : theme.border }]}
      >
        <Text style={{ color: theme.textMuted, fontSize: 16 }}>Choose a date</Text>
      </Pressable>
    );
  } else {
    picker = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${hasValue ? formatFullDate(value) : "not set"}. Tap to change.`}
        onPress={openAndroidPicker}
        style={[styles.input, { backgroundColor: theme.card, borderColor: error ? theme.urgentText : theme.border }]}
      >
        <Text style={{ color: hasValue ? theme.text : theme.textMuted, fontSize: 16 }}>
          {hasValue ? formatFullDate(value) : "Choose a date"}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.row}>
        {picker}
        {pastShortcuts && chip("Today", today)}
        {pastShortcuts && chip("Yesterday", addDays(today, -1))}
        {clearable && hasValue && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => onChange("")} hitSlop={8}>
            <Text style={{ color: theme.accent, fontWeight: "600" }}>Clear</Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={[styles.message, { color: theme.urgentText }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.message, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iosPicker: {
    marginLeft: -8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  message: {
    fontSize: 12,
  },
});
