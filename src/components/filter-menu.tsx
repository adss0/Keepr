import { type ReactNode, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/form";
import { Icon } from "@/components/icon";
import { useTheme } from "@/constants/theme";

type Props<T extends string> = {
  /** Heading of the list, such as "Sort by". */
  title: string;
  /** Text on the chip: usually the current choice. */
  chipLabel: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Filled chip, for a filter that's narrowing the list. */
  active?: boolean;
  /** Choosing this option keeps the list open to fill in `extra` (such as dates). */
  stayOpenFor?: T;
  extra?: ReactNode;
};

/** A chip showing its current choice; tapping it lists every option, and choosing one applies it straight away. */
export function FilterMenu<T extends string>({
  title,
  chipLabel,
  value,
  options,
  onChange,
  active,
  stayOpenFor,
  extra,
}: Props<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const showExtra = value === stayOpenFor && extra;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${chipLabel}`}
        onPress={() => setOpen(true)}
        style={[
          styles.chip,
          { backgroundColor: active ? theme.text : theme.card, borderColor: active ? theme.text : theme.border },
        ]}
      >
        <Text style={[styles.chipText, { color: active ? theme.background : theme.text }]} numberOfLines={1}>
          {chipLabel}
        </Text>
        <Icon name="chevronDown" size={14} color={active ? theme.background : theme.textMuted} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textMuted }]}>
              {title}
            </Text>
            <ScrollView style={styles.options} accessibilityRole="radiogroup">
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(option.value);
                      if (option.value !== stayOpenFor) setOpen(false);
                    }}
                    style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.calmBg }]}
                  >
                    <Text style={[styles.optionText, { color: theme.text }, selected && styles.selected]}>
                      {option.label}
                    </Text>
                    {selected && <Icon name="check" size={18} color={theme.text} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            {showExtra && (
              <View style={styles.extra}>
                {extra}
                <Button title="Done" variant="primary" onPress={() => setOpen(false)} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 180,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  options: {
    flexGrow: 0,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  optionText: {
    fontSize: 16,
  },
  selected: {
    fontWeight: "700",
  },
  extra: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
