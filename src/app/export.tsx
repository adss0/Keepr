import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Button, Segmented } from "@/components/form";
import { Icon } from "@/components/icon";
import { useToast } from "@/components/toast";
import { Fonts, useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { shareReceiptsPdf } from "@/data/receipt-pdf";
import { useReceipts } from "@/data/receipts";
import { shareCsv, shareXlsx } from "@/data/share-csv";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { receiptsToCsv } from "@/lib/export";
import { type ExportPeriod, PERIOD_OPTIONS, periodRange, rangeFileSuffix, receiptsInRange } from "@/lib/export-range";
import { formatFullDate, formatPrice } from "@/lib/format";
import { spendingWorkbook } from "@/lib/spending-workbook";
import { buildXlsx } from "@/lib/xlsx";

/** Choose which receipts to export (dates, finished ones, photos) and in which format. */
export default function ExportScreen() {
  const theme = useTheme();
  const today = todayIso();
  const receipts = useReceipts();
  const { subscriptions } = useSubscriptions();
  const { userId } = useCloud();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<ExportPeriod>("year");
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);
  const [includeFinished, setIncludeFinished] = useState(true);
  const [withPhotos, setWithPhotos] = useState(true);
  const [withSubscriptions, setWithSubscriptions] = useState(true);
  const [busy, setBusy] = useState<"pdf" | "csv" | "excel">();

  const range = periodRange(period, today, { from, to });
  const chosen = receiptsInRange(receipts, range, includeFinished);
  const total = chosen.reduce((sum, receipt) => sum + receipt.pricePence, 0);
  const label =
    period === "all"
      ? "All receipts"
      : `${formatFullDate(range.from ?? today)} to ${formatFullDate(range.to ?? today)}`;
  const suffix = rangeFileSuffix(range, today);

  async function run(kind: "pdf" | "csv" | "excel", task: () => Promise<void>) {
    setBusy(kind);
    try {
      await task();
    } catch (error) {
      // A toast rather than an alert, which does nothing in browsers.
      showToast({ message: `Couldn't export: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Segmented label="Which dates?" value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
      {period === "custom" && (
        <View style={styles.dates}>
          <DateField label="From" value={from} onChange={setFrom} maximumDate={today} />
          <DateField label="To" value={to} onChange={setTo} maximumDate={today} />
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Toggle
          label="Include finished receipts"
          hint="Returned, claimed and archived ones."
          value={includeFinished}
          onChange={setIncludeFinished}
        />
        <Toggle label="Add receipt photos to the PDF" value={withPhotos} onChange={setWithPhotos} divided />
        <Toggle
          label="Add subscriptions to the Excel file"
          value={withSubscriptions}
          onChange={setWithSubscriptions}
          divided
        />
      </View>

      <View style={[styles.summary, { backgroundColor: theme.accentSoft }]}>
        <Icon name="receipts" size={20} color={theme.accent} />
        <View style={styles.summaryText}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            {chosen.length === 1 ? "1 receipt" : `${chosen.length} receipts`} · {formatPrice(total)}
          </Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>{label}</Text>
        </View>
      </View>

      {chosen.length === 0 ? (
        <Text style={[styles.hint, styles.center, { color: theme.textMuted }]}>
          No receipts in these dates. Pick a longer period.
        </Text>
      ) : (
        <View style={styles.buttons}>
          <Button
            title="PDF of these receipts"
            variant="primary"
            busy={busy === "pdf"}
            onPress={() =>
              run("pdf", () =>
                shareReceiptsPdf(chosen, today, label, withPhotos, (receipt) => receipt.ownerId ?? userId),
              )
            }
          />
          <Button
            title="Spreadsheet (CSV)"
            busy={busy === "csv"}
            onPress={() => run("csv", () => shareCsv(receiptsToCsv(chosen, today), `keepr-receipts-${suffix}.csv`))}
          />
          <Button
            title="Spending breakdown (Excel)"
            busy={busy === "excel"}
            onPress={() =>
              run("excel", () =>
                shareXlsx(
                  buildXlsx(spendingWorkbook(chosen, withSubscriptions ? subscriptions : [], today)),
                  `keepr-spending-${suffix}.xlsx`,
                ),
              )
            }
          />
        </View>
      )}
    </ScrollView>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
  divided,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  divided?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.toggle, divided && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
      <View style={styles.summaryText}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  dates: {
    gap: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  center: {
    textAlign: "center",
  },
  buttons: {
    gap: 10,
  },
});
