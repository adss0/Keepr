import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { useTheme } from "@/constants/theme";

type FieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, ...inputProps }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: error ? theme.urgentText : theme.border,
          },
        ]}
        {...inputProps}
      />
      {error ? (
        <Text style={[styles.message, { color: theme.urgentText }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.message, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.segment,
                {
                  backgroundColor: selected ? theme.accent : theme.card,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={{ color: selected ? theme.onAccent : theme.text, fontWeight: "500" }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
};

export function Button({ title, onPress, variant = "secondary", icon }: ButtonProps) {
  const theme = useTheme();
  const colours = {
    primary: { bg: theme.accent, text: theme.onAccent, border: theme.accent },
    secondary: { bg: theme.card, text: theme.text, border: theme.border },
    danger: { bg: theme.card, text: theme.urgentText, border: theme.urgentText },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colours.bg, borderColor: colours.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, { color: colours.text }]}>{title}</Text>
    </Pressable>
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  message: {
    fontSize: 12,
  },
  segments: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
