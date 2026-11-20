import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Button, Chips, Segmented } from "@/components/form";
import { useToast } from "@/components/toast";
import { Fonts, useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { shareReceiptsPdf } from "@/data/receipt-pdf";
import { useReceipts } from "@/data/receipts";
import { useSpaces } from "@/data/spaces";
import { shareCsv, shareXlsx } from "@/data/share-csv";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { receiptsToCsv } from "@/lib/export";
import { type ExportPeriod, PERIOD_OPTIONS, periodRange, rangeFileSuffix, receiptsInRange } from "@/lib/export-range";
import { errorMessage, formatFullDate, formatPrice } from "@/lib/format";
import { type ReceiptStatus, STATUS_OPTIONS } from "@/lib/receipt-status";
import { spendingWorkbook } from "@/lib/spending-workbook";
import { buildXlsx } from "@/lib/xlsx";

/** "" stands for your own receipts, which aren't in any space. */
const PERSONAL = "";

type Format = "pdf" | "csv" | "excel";
type Extra = "photos" | "deadlines" | "nextDeadline" | "subscriptions";

const FORMAT_OPTIONS: { value: Format; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

/** What each format can add, and what its button says. */
const FORMATS: Record<Format, { extras: { value: Extra; label: string }[]; save: string }> = {
  pdf: {
    extras: [
      { value: "photos", label: "Receipt photos" },
      { value: "deadlines", label: "Deadlines" },
    ],
    save: "Save PDF",
  },
  csv: { extras: [{ value: "nextDeadline", label: "Next deadline" }], save: "Save CSV" },
  excel: { extras: [{ value: "subscriptions", label: "Subscriptions" }], save: "Save Excel file" },
};

/**
 * Export receipts: whose, which dates and which kinds, then one format and its save button. Opened from a shared
 * space, it starts with just that space's receipts and the dates chosen there; other spaces can be added.
 */
export default function ExportScreen() {
  const theme = useTheme();
  const today = todayIso();
  const params = useLocalSearchParams<{ space?: string; period?: string; from?: string; to?: string }>();
  const { spaces, spaceName: nameOf } = useSpaces();
  const fromSpace = nameOf(params.space) ? params.space : undefined;
  // Undefined until the user changes it, so spaces that load after the screen opens are still included.
  const [picked, setPicked] = useState<Set<string>>();
  const included = picked ?? new Set(fromSpace ? [fromSpace] : [PERSONAL, ...spaces.map((space) => space.id)]);
  const everything = spaces.length === 0 || (included.has(PERSONAL) && spaces.every((space) => included.has(space.id)));
  const inScope = (item: { spaceId?: string }) => everything || included.has(item.spaceId ?? PERSONAL);
  const receipts = useReceipts().filter(inScope);
  const subscriptions = useSubscriptions().subscriptions.filter(inScope);
  const names = [
    ...(included.has(PERSONAL) ? ["Just mine"] : []),
    ...spaces.filter((space) => included.has(space.id)).map((space) => space.name),
  ];
  const spaceName = everything || names.length === 0 ? undefined : names.join(", ");
  const { userId } = useCloud();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<ExportPeriod>(
    PERIOD_OPTIONS.some((option) => option.value === params.period) ? (params.period as ExportPeriod) : "year",
  );
  const [from, setFrom] = useState(params.from ?? `${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(params.to ?? today);
  const [statuses, setStatuses] = useState<Set<ReceiptStatus>>(() => new Set(STATUS_OPTIONS.map((option) => option.value)));
  const [format, setFormat] = useState<Format>("pdf");
  const [extras, setExtras] = useState<Set<Extra>>(() => new Set(["photos", "subscriptions"]));
  const [busy, setBusy] = useState(false);

  const range = periodRange(period, today, { from, to });
  const chosen = receiptsInRange(receipts, range, statuses);
  const total = chosen.reduce((sum, receipt) => sum + receipt.pricePence, 0);
  const dates =
    period === "all"
      ? "All receipts"
      : `${formatFullDate(range.from ?? today)} to ${formatFullDate(range.to ?? today)}`;
  const label = spaceName ? `${spaceName} · ${dates}` : dates;
  const suffix = `${spaceName ? `${spaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-` : ""}${rangeFileSuffix(range, today)}`;

  async function save() {
    setBusy(true);
    try {
      if (format === "pdf") {
        await shareReceiptsPdf(
          chosen,
          today,
          label,
          extras.has("photos"),
          (receipt) => receipt.ownerId ?? userId,
          extras.has("deadlines"),
        );
      } else if (format === "csv") {
        await shareCsv(receiptsToCsv(chosen, today, extras.has("nextDeadline")), `keepr-receipts-${suffix}.csv`);
      } else {
        const workbook = spendingWorkbook(chosen, extras.has("subscriptions") ? subscriptions : [], today);
        await shareXlsx(buildXlsx(workbook), `keepr-spending-${suffix}.xlsx`);
      }
    } catch (error) {
      // A toast rather than an alert, which does nothing in browsers.
      showToast({ message: `Couldn't export: ${errorMessage(error)}` });
    } finally {
      setBusy(false);
    }
  }

  const empty =
    names.length === 0
      ? "Choose whose receipts to export."
      : statuses.size === 0
        ? "Choose at least one kind of receipt."
        : "Nothing matches. Try other dates.";

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {fromSpace && <Stack.Screen options={{ title: `Export ${nameOf(fromSpace)}` }} />}
      {spaces.length > 0 && (
        <Chips
          label="Whose"
          value={included}
          options={[{ value: PERSONAL, label: "Just mine" }, ...spaces.map((space) => ({ value: space.id, label: space.name }))]}
          onChange={setPicked}
        />
      )}
      <Segmented label="Dates" value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
      {period === "custom" && (
        <View style={styles.dates}>
          <DateField label="From" value={from} onChange={setFrom} maximumDate={today} />
          <DateField label="To" value={to} onChange={setTo} maximumDate={today} />
        </View>
      )}
      <Chips label="Include" value={statuses} options={STATUS_OPTIONS} onChange={setStatuses} />

      <Segmented label="Format" value={format} options={FORMAT_OPTIONS} onChange={setFormat} />
      <Chips label="Add" value={extras} options={FORMATS[format].extras} onChange={setExtras} />

      <View style={[styles.summary, { borderColor: theme.border }]}>
        <Text style={[styles.count, { color: theme.text }]}>
          {chosen.length === 1 ? "1 receipt" : `${chosen.length} receipts`} · {formatPrice(total)}
        </Text>
        <Text style={[styles.hint, { color: theme.textMuted }]} numberOfLines={1}>
          {chosen.length === 0 ? empty : label}
        </Text>
      </View>
      {chosen.length > 0 && <Button title={FORMATS[format].save} variant="primary" busy={busy} onPress={save} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 18,
  },
  dates: {
    gap: 12,
  },
  summary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    gap: 2,
  },
  count: {
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
