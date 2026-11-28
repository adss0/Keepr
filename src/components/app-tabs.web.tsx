import { type Href } from "expo-router";
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DESKTOP_PAGE_WIDTH, useDesktop } from "@/components/desktop";
import { Icon, type IconName } from "@/components/icon";
import { Fonts, useTheme } from "@/constants/theme";
import { HOME } from "@/lib/navigation";

const TABS: { name: string; href: Href; label: string; icon: IconName }[] = [
  { name: "index", href: HOME, label: "Receipts", icon: "receipts" },
  { name: "calendar", href: "/calendar", label: "Calendar", icon: "calendar" },
  { name: "subscriptions", href: "/subscriptions", label: "Subscriptions", icon: "subscriptions" },
  { name: "insights", href: "/insights", label: "Insights", icon: "insights" },
  { name: "settings", href: "/settings", label: "Settings", icon: "settings" },
];

type ButtonProps = TabTriggerSlotProps & { label: string; icon: IconName; side?: boolean };

// The trigger's ref isn't needed for a plain button, and its type doesn't match Pressable's.
function TabButton({ isFocused, label, icon, side, ref: _ref, ...props }: ButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textMuted;
  if (side) {
    return (
      <Pressable
        {...props}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        style={({ hovered }) => [
          styles.sideTab,
          isFocused ? { backgroundColor: theme.accentSoft } : hovered && { backgroundColor: theme.calmBg },
        ]}
      >
        <Icon name={icon} size={20} color={color} />
        <Text style={[styles.sideLabel, { color: isFocused ? theme.accent : theme.text }]}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} style={styles.tab}>
      <View style={[styles.pill, isFocused && { backgroundColor: theme.accentSoft }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Browsers have no system tab bar, so the web gets its own: along the bottom on a phone-sized window, and as a
 * sidebar with the pages centred beside it on a wide one (the desktop app).
 */
export default function AppTabs() {
  const theme = useTheme();
  const desktop = useDesktop();

  const triggers = TABS.map((tab) => (
    <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
      <TabButton label={tab.label} icon={tab.icon} side={desktop} />
    </TabTrigger>
  ));

  if (desktop) {
    return (
      <Tabs style={StyleSheet.flatten([styles.desktop, { backgroundColor: theme.background }])}>
        <TabList style={StyleSheet.flatten([styles.sidebar, { backgroundColor: theme.card, borderRightColor: theme.border }])}>
          <Text style={[styles.brand, { color: theme.text }]}>Keepr</Text>
          {triggers}
        </TabList>
        <View style={styles.main}>
          <TabSlot style={styles.page} />
        </View>
      </Tabs>
    );
  }

  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.background }}>
      <TabSlot style={styles.slot} />
      <TabList style={StyleSheet.flatten([styles.bar, { backgroundColor: theme.card, borderTopColor: theme.border }])}>
        {triggers}
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
  desktop: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 232,
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  sideTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sideLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  main: {
    flex: 1,
    alignItems: "center",
  },
  page: {
    flex: 1,
    width: "100%",
    maxWidth: DESKTOP_PAGE_WIDTH,
  },
});
