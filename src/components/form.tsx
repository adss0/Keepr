import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { PressScale } from "@/components/press-scale";
import { useTheme } from "@/constants/theme";
import { haptics } from "@/data/haptics";

type FieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, secureTextEntry, ...inputProps }: FieldProps) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.card, borderColor: error ? theme.urgentText : theme.border },
        ]}
      >
        <TextInput
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={label}
          secureTextEntry={secureTextEntry && !revealed}
          style={[styles.input, { color: theme.text }]}
          {...inputProps}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            hitSlop={8}
            onPress={() => setRevealed((current) => !current)}
            style={styles.reveal}
          >
            <Text style={{ color: theme.accent, fontWeight: "600" }}>{revealed ? "Hide" : "Show"}</Text>
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
              onPress={() => {
                if (option.value !== value) haptics.selection();
                onChange(option.value);
              }}
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
  /** "ghost" is a plain text link, for less important actions. */
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
  /** Shows a spinner and ignores taps while something is in progress. */
  busy?: boolean;
};

export function Button({ title, onPress, variant = "secondary", icon, busy = false }: ButtonProps) {
  const theme = useTheme();
  const colours = {
    primary: { bg: theme.accent, text: theme.onAccent, border: theme.accent },
    secondary: { bg: theme.card, text: theme.text, border: theme.border },
    danger: { bg: theme.card, text: theme.urgentText, border: theme.urgentText },
    ghost: { bg: "transparent", text: theme.accent, border: "transparent" },
  }[variant];

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colours.bg, borderColor: colours.border }]}
    >
      {busy ? <ActivityIndicator color={colours.text} /> : icon}
      <Text style={[styles.buttonText, { color: colours.text }]}>{title}</Text>
    </PressScale>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  reveal: {
    paddingHorizontal: 12,
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
