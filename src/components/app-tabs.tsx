import { NativeTabs } from "expo-router/native-tabs";

import { ICONS } from "@/components/icon";
import { useTheme } from "@/constants/theme";

/** The native tab bar on iOS and Android. The web uses app-tabs.web.tsx. */
export default function AppTabs() {
  const theme = useTheme();
  return (
    <NativeTabs tintColor={theme.accent} backgroundColor={theme.card} indicatorColor={theme.accentSoft}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Receipts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} md={ICONS.receipts.android} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md={ICONS.calendar.android} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="subscriptions">
        <NativeTabs.Trigger.Label>Subscriptions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONS.subscriptions.ios} md={ICONS.subscriptions.android} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} md={ICONS.insights.android} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md={ICONS.settings.android} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
