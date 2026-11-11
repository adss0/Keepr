import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/constants/theme";
import type { ReminderPermission } from "@/data/reminders";

type Props = {
  permission: ReminderPermission;
  onEnable: () => void;
};

/** Asks the user to turn on reminders, or explains how if they said no before. */
export function RemindersBanner({ permission, onEnable }: Props) {
  const theme = useTheme();
  if (permission === "granted" || permission === "unsupported") return null;

  const denied = permission === "denied";
  return (
    <View style={[styles.banner, { backgroundColor: theme.soonBg }]}>
      <Text style={[styles.text, { color: theme.soonText }]}>
        {denied
          ? "Reminders are turned off. Turn on notifications for Keepr in Settings so you don't miss a deadline."
          : "Get a reminder 3 days before each deadline, and on the last day."}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={denied ? () => Linking.openSettings() : onEnable}
        hitSlop={8}
      >
        <Text style={[styles.action, { color: theme.soonText }]}>
          {denied ? "Open Settings" : "Turn on reminders"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginTop: 12,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    fontSize: 14,
    fontWeight: "700",
  },
});
