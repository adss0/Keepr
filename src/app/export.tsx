import { type ReactNode, useState } from "react";
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
import { errorMessage, formatFullDate, formatPrice } from "@/lib/format";
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
  const [withDeadlines, setWithDeadlines] = useState(false);
  const [csvDeadlines, setCsvDeadlines] = useState(false);
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
      showToast({ message: `Couldn't export: ${errorMessage(error)}` });
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
      </View>

      <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Icon name="receipts" size={20} color={theme.textMuted} />
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
        <>
          {/* Each format with only the choices that apply to it, then its button. */}
          <Format title="PDF" hint="A summary with the total, then a page for each receipt.">
            <Toggle
              label="Proof of purchase"
              hint="Each receipt's photo, and the pages of any receipt kept as a PDF."
              value={withPhotos}
              onChange={setWithPhotos}
            />
            <Toggle
              label="Deadlines"
              hint="Return, refund and warranty dates, with what each one means."
              value={withDeadlines}
              onChange={setWithDeadlines}
              divided
            />
            <Button
              title="Save PDF"
              variant="primary"
              busy={busy === "pdf"}
              onPress={() =>
                run("pdf", () =>
                  shareReceiptsPdf(chosen, today, label, withPhotos, (receipt) => receipt.ownerId ?? userId, withDeadlines),
                )
              }
            />
          </Format>

          <Format title="Spreadsheet (CSV)" hint="One row per receipt, for Excel, Numbers or Google Sheets.">
            <Toggle label="Next deadline" value={csvDeadlines} onChange={setCsvDeadlines} />
            <Button
              title="Save CSV"
              busy={busy === "csv"}
              onPress={() =>
                run("csv", () => shareCsv(receiptsToCsv(chosen, today, csvDeadlines), `keepr-receipts-${suffix}.csv`))
              }
            />
          </Format>

          <Format title="Spending breakdown (Excel)" hint="A summary, totals by month and by shop, and every receipt.">
            <Toggle label="Subscriptions" value={withSubscriptions} onChange={setWithSubscriptions} />
            <Button
              title="Save Excel file"
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
          </Format>
        </>
      )}
    </ScrollView>
  );
}

function Format({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, styles.format, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.formatTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
      <View style={styles.formatBody}>{children}</View>
    </View>
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
  format: {
    paddingTop: 14,
    paddingBottom: 14,
    gap: 2,
  },
  formatBody: {
    gap: 8,
  },
  formatTitle: {
    fontSize: 17,
    fontWeight: "700",
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
    borderWidth: StyleSheet.hairlineWidth,
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
});
