import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, Segmented } from "@/components/form";
import { Icon } from "@/components/icon";
import { ScreenHeader } from "@/components/screen-header";
import { Fonts, useTheme } from "@/constants/theme";
import { useReceipts } from "@/data/receipts";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { formatPrice } from "@/lib/format";
import { lastMonths, monthLabel, spendByMonth, spendByShop } from "@/lib/insights";
import { totalMonthlyPence, totalYearlyPence } from "@/lib/subscriptions";

const TOP_SHOPS = 5;
const CHART_HEIGHT = 140;

/** "£12" style: whole pounds for chart labels, where pence are noise. */
function shortPrice(pence: number): string {
  const pounds = Math.round(pence / 100);
  return pounds >= 1000 ? `£${(pounds / 1000).toFixed(pounds >= 10000 ? 0 : 1)}k` : `£${pounds}`;
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.textMuted }]}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export default function InsightsScreen() {
  const theme = useTheme();
  const today = todayIso();
  const receipts = useReceipts();
  const { subscriptions } = useSubscriptions();
  const [range, setRange] = useState<"6" | "12">("6");
  const months = useMemo(() => lastMonths(today, Number(range)), [today, range]);
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1]);

  const byMonth = useMemo(() => spendByMonth(receipts, months), [receipts, months]);
  const shops = useMemo(() => spendByShop(receipts, `${months[0]}-01`), [receipts, months]);
  const thisMonth = byMonth[byMonth.length - 1];
  const lastMonth = byMonth[byMonth.length - 2];
  const selected = byMonth.find((m) => m.month === selectedMonth) ?? thisMonth;
  const peak = Math.max(1, ...byMonth.map((m) => m.pence));
  const rangeTotal = byMonth.reduce((sum, m) => sum + m.pence, 0);
  const subsMonthly = totalMonthlyPence(subscriptions);

  const change =
    lastMonth && lastMonth.pence > 0 ? Math.round(((thisMonth.pence - lastMonth.pence) / lastMonth.pence) * 100) : undefined;

  const header = (
    <ScreenHeader
      title="Insights"
      subtitle={`${formatPrice(thisMonth.pence)} spent this month`}
      actions={[{ icon: "share", label: "Export spending", onPress: () => router.push("/export") }]}
    />
  );

  if (receipts.length === 0 && subscriptions.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <View style={styles.empty}>
          <Icon name="insights" size={40} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Your spending, at a glance</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Once you add receipts and subscriptions, you&apos;ll see what you spend each month and where it goes.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.primary }]}>
          <Text style={[styles.heroLabel, { color: theme.onPrimary }]}>{monthLabel(thisMonth.month)}</Text>
          <Text style={[styles.heroValue, { color: theme.onPrimary }]}>{formatPrice(thisMonth.pence + subsMonthly)}</Text>
          <Text style={[styles.heroDetail, { color: theme.onPrimary }]}>
            {formatPrice(thisMonth.pence)} on {thisMonth.count === 1 ? "1 purchase" : `${thisMonth.count} purchases`}
            {subsMonthly > 0 ? ` + ${formatPrice(subsMonthly)} subscriptions` : ""}
          </Text>
          {change !== undefined && (
            <Text style={[styles.heroChange, { color: theme.onPrimary }]}>
              {change === 0 ? "Same as" : `${Math.abs(change)}% ${change > 0 ? "more than" : "less than"}`} last month
            </Text>
          )}
        </View>

        <Card
          title="Spending by month"
          action={
            <View style={styles.rangeSwitch}>
              <Segmented
                label=""
                value={range}
                options={[
                  { value: "6", label: "6 months" },
                  { value: "12", label: "12 months" },
                ]}
                onChange={(value) => {
                  setRange(value);
                  setSelectedMonth(months[months.length - 1]);
                }}
              />
            </View>
          }
        >
          <Text style={[styles.selectedValue, { color: theme.text }]}>
            {formatPrice(selected.pence)}{" "}
            <Text style={[styles.selectedLabel, { color: theme.textMuted }]}>in {monthLabel(selected.month)}</Text>
          </Text>
          <View style={styles.chart}>
            {byMonth.map((m) => {
              const isSelected = m.month === selected.month;
              const height = m.pence === 0 ? 3 : Math.max(6, (m.pence / peak) * CHART_HEIGHT);
              return (
                <Pressable
                  key={m.month}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthLabel(m.month)}: ${formatPrice(m.pence)}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedMonth(m.month)}
                  style={styles.barColumn}
                >
                  <Text style={[styles.barValue, { color: isSelected ? theme.text : "transparent" }]}>{shortPrice(m.pence)}</Text>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: isSelected ? theme.accent : theme.accentSoft },
                    ]}
                  />
                  <Text style={[styles.barLabel, { color: isSelected ? theme.text : theme.textMuted }]}>
                    {monthLabel(m.month).slice(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.footnote, { color: theme.textMuted }]}>
            {formatPrice(rangeTotal)} over {range} months · about {formatPrice(Math.round(rangeTotal / Number(range)))} a
            month
          </Text>
        </Card>

        <Card title={`Top shops · last ${range} months`}>
          {shops.length === 0 ? (
            <Text style={[styles.footnote, { color: theme.textMuted }]}>No purchases in this period.</Text>
          ) : (
            shops.slice(0, TOP_SHOPS).map((shop) => (
              <View key={shop.shop} style={styles.shopRow}>
                <View style={styles.shopText}>
                  <Text style={[styles.shopName, { color: theme.text }]} numberOfLines={1}>
                    {shop.shop}
                  </Text>
                  <Text style={[styles.shopValue, { color: theme.text }]}>{formatPrice(shop.pence)}</Text>
                </View>
                <View style={[styles.track, { backgroundColor: theme.accentSoft }]}>
                  <View
                    style={[
                      styles.fill,
                      { backgroundColor: theme.accent, width: `${Math.max(2, (shop.pence / shops[0].pence) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.shopCount, { color: theme.textMuted }]}>
                  {shop.count === 1 ? "1 purchase" : `${shop.count} purchases`}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card title="Subscriptions">
          <View style={styles.subsRow}>
            <View style={styles.subsStat}>
              <Text style={[styles.subsValue, { color: theme.text }]}>{formatPrice(subsMonthly)}</Text>
              <Text style={[styles.subsLabel, { color: theme.textMuted }]}>a month</Text>
            </View>
            <View style={styles.subsStat}>
              <Text style={[styles.subsValue, { color: theme.text }]}>{formatPrice(totalYearlyPence(subscriptions))}</Text>
              <Text style={[styles.subsLabel, { color: theme.textMuted }]}>a year</Text>
            </View>
            <View style={styles.subsStat}>
              <Text style={[styles.subsValue, { color: theme.text }]}>{subscriptions.length}</Text>
              <Text style={[styles.subsLabel, { color: theme.textMuted }]}>active</Text>
            </View>
          </View>
          <Button title="See subscriptions" variant="ghost" onPress={() => router.navigate("/subscriptions")} />
        </Card>

        <Button
          title="Export receipts and spending"
          icon={<Icon name="share" size={18} color={theme.text} />}
          onPress={() => router.push("/export")}
        />
        <Text style={[styles.footnote, { color: theme.textMuted, textAlign: "center" }]}>
          Pick the dates, then save a PDF of the receipts, a CSV, or an Excel breakdown by month and shop.
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
    gap: 14,
  },
  hero: {
    borderRadius: 22,
    padding: 20,
    gap: 4,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.85,
  },
  heroValue: {
    fontSize: 38,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    fontFamily: Fonts.display,
  },
  heroDetail: {
    fontSize: 14,
    opacity: 0.9,
  },
  heroChange: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    opacity: 0.9,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  rangeSwitch: {
    marginTop: -6,
  },
  selectedValue: {
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    fontFamily: Fonts.display,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: CHART_HEIGHT + 40,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    height: "100%",
  },
  barValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  bar: {
    width: "100%",
    maxWidth: 36,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
  },
  shopRow: {
    gap: 6,
  },
  shopText: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  shopName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  shopValue: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  shopCount: {
    fontSize: 12,
  },
  subsRow: {
    flexDirection: "row",
  },
  subsStat: {
    flex: 1,
    gap: 2,
  },
  subsValue: {
    fontSize: 20,
    fontVariant: ["tabular-nums"],
    fontFamily: Fonts.display,
  },
  subsLabel: {
    fontSize: 13,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
});
