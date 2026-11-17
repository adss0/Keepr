import { type Href } from "expo-router";
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { useTheme } from "@/constants/theme";
import { HOME } from "@/lib/navigation";

const TABS: { name: string; href: Href; label: string; icon: IconName }[] = [
  { name: "index", href: HOME, label: "Receipts", icon: "receipts" },
  { name: "calendar", href: "/calendar", label: "Calendar", icon: "calendar" },
  { name: "subscriptions", href: "/subscriptions", label: "Subscriptions", icon: "subscriptions" },
  { name: "settings", href: "/settings", label: "Settings", icon: "settings" },
];

// The trigger's ref isn't needed for a plain button, and its type doesn't match Pressable's.
function TabButton({ isFocused, label, icon, ref: _ref, ...props }: TabTriggerSlotProps & { label: string; icon: IconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textMuted;
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} style={styles.tab}>
      <View style={[styles.pill, isFocused && { backgroundColor: theme.accentSoft }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Browsers have no system tab bar, so the web gets this bottom bar instead of native tabs. */
export default function AppTabs() {
  const theme = useTheme();
  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.background }}>
      <TabSlot style={styles.slot} />
      <TabList style={StyleSheet.flatten([styles.bar, { backgroundColor: theme.card, borderTopColor: theme.border }])}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <TabButton label={tab.label} icon={tab.icon} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    maxWidth: 120,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
