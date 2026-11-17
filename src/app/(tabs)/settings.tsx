import Constants from "expo-constants";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Segmented } from "@/components/form";
import { Icon, type IconName } from "@/components/icon";
import { PressScale } from "@/components/press-scale";
import { ScreenHeader } from "@/components/screen-header";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { useReceipts } from "@/data/receipts";
import { useReminders } from "@/data/reminders";
import { useSettings } from "@/data/settings";
import { shareCsv, shareXlsx } from "@/data/share-csv";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { receiptsToCsv } from "@/lib/export";
import { spendingWorkbook } from "@/lib/spending-workbook";
import { buildXlsx } from "@/lib/xlsx";
import { STATUS_TEXT } from "@/lib/cloud-status";

function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.textMuted }]}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: theme.textMuted }]}>{footer}</Text> : null}
    </View>
  );
}

function LinkRow({ icon, title, value, onPress }: { icon: IconName; title: string; value?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.linkRow}>
      <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
        <Icon name={icon} size={18} color={theme.accent} />
      </View>
      <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
      {value ? (
        <Text style={[styles.rowValue, { color: theme.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Icon name="chevronRight" size={16} color={theme.textMuted} />
    </PressScale>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, update } = useSettings();
  const cloud = useCloud();
  const reminders = useReminders();
  const receipts = useReceipts();
  const { subscriptions } = useSubscriptions();
  const r = settings.reminders;

  function exportCsv() {
    const today = todayIso();
    shareCsv(receiptsToCsv(receipts, today), `keepr-receipts-${today}.csv`).catch((error: unknown) =>
      Alert.alert("Couldn't export receipts", error instanceof Error ? error.message : String(error)),
    );
  }

  function exportExcel() {
    const today = todayIso();
    shareXlsx(buildXlsx(spendingWorkbook(receipts, subscriptions, today)), `keepr-spending-${today}.xlsx`).catch(
      (error: unknown) => Alert.alert("Couldn't export spending", error instanceof Error ? error.message : String(error)),
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Account">
          <LinkRow icon="account" title="Account and sync" value={cloud.email ?? STATUS_TEXT[cloud.status]} onPress={() => router.push("/account")} />
        </Section>

        <Section
          title="Reminders"
          footer={
            reminders.permission === "unsupported"
              ? "Reminders work in the phone app, not in the browser."
              : "Reminders for return windows, warranties, renewals and free trials."
          }
        >
          {(reminders.permission === "undetermined" || reminders.permission === "denied") && (
            <LinkRow
              icon="bell"
              title={reminders.permission === "denied" ? "Turn on notifications in Settings" : "Turn on reminders"}
              onPress={reminders.permission === "denied" ? () => Linking.openSettings() : reminders.request}
            />
          )}
          <View style={styles.control}>
            <Segmented
              label="Remind me before"
              value={String(r.daysBefore)}
              options={[
                { value: "1", label: "1 day" },
                { value: "3", label: "3 days" },
                { value: "7", label: "1 week" },
                { value: "14", label: "2 weeks" },
              ]}
              onChange={(value) => update({ reminders: { ...r, daysBefore: Number(value) } })}
            />
          </View>
          <View style={[styles.switchRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Also on the last day</Text>
            <Switch
              accessibilityLabel="Also remind me on the last day"
              value={r.onLastDay}
              onValueChange={(onLastDay) => update({ reminders: { ...r, onLastDay } })}
              trackColor={{ true: theme.accent, false: theme.border }}
            />
          </View>
          <View style={[styles.control, styles.divided, { borderTopColor: theme.border }]}>
            <Segmented
              label="Time of day"
              value={String(r.hour)}
              options={[
                { value: "8", label: "8am" },
                { value: "9", label: "9am" },
                { value: "12", label: "Noon" },
                { value: "18", label: "6pm" },
              ]}
              onChange={(value) => update({ reminders: { ...r, hour: Number(value) } })}
            />
          </View>
        </Section>

        <Section title="New receipts" footer="These are filled in for you when you add a receipt. You can still change them each time.">
          <View style={styles.control}>
            <Segmented
              label="Usually bought"
              value={settings.defaultChannel}
              options={[
                { value: "in_store", label: "In store" },
                { value: "online", label: "Online" },
              ]}
              onChange={(defaultChannel) => update({ defaultChannel })}
            />
          </View>
          <View style={[styles.control, styles.divided, { borderTopColor: theme.border }]}>
            <Segmented
              label="Usually paid by"
              value={settings.defaultPaymentMethod}
              options={[
                { value: "debit_card", label: "Debit card" },
                { value: "credit_card", label: "Credit card" },
                { value: "cash", label: "Cash" },
                { value: "other", label: "Other" },
              ]}
              onChange={(defaultPaymentMethod) => update({ defaultPaymentMethod })}
            />
          </View>
        </Section>

        <Section title="Appearance">
          <View style={styles.control}>
            <Segmented
              label="Theme"
              value={settings.appearance}
              options={[
                { value: "system", label: "Automatic" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={(appearance) => update({ appearance })}
            />
          </View>
        </Section>

        <Section title="Your data">
          <LinkRow icon="insights" title="Spending breakdown (Excel)" onPress={exportExcel} />
          <View style={[styles.divided, { borderTopColor: theme.border }]} />
          <LinkRow icon="share" title="Export receipts (CSV)" onPress={exportCsv} />
        </Section>

        <Text style={[styles.about, { color: theme.textMuted }]}>
          Keepr {Constants.expoConfig?.version ?? ""}
          {"\n"}You keep your receipts. Keepr keeps your rights.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
  },
  rowValue: {
    fontSize: 14,
    maxWidth: "45%",
  },
  control: {
    padding: 14,
  },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  about: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
  },
});
