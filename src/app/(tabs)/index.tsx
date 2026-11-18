import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ExampleReceipt } from "@/components/example-receipt";
import { Button } from "@/components/form";
import { Icon, type IconName } from "@/components/icon";
import { Intro } from "@/components/intro";
import { NextDeadlineCard } from "@/components/next-deadline-card";
import { ReceiptCard } from "@/components/receipt-card";
import { ReceiptTile } from "@/components/receipt-tile";
import { RemindersBanner } from "@/components/reminders-banner";
import { ScreenHeader } from "@/components/screen-header";
import { SwipeableReceipt } from "@/components/swipeable-receipt";
import { Fonts, useTheme } from "@/constants/theme";
import { usePullToSync } from "@/data/cloud";
import { useReceiptsStore } from "@/data/receipts";
import { useReminders } from "@/data/reminders";
import { useSettings } from "@/data/settings";
import { useSpaces } from "@/data/spaces";
import { daysBetween, getNextDeadline, todayIso } from "@/lib/deadlines";
import { formatPrice } from "@/lib/format";
import { groupByMonth, type ReceiptsSort, type ReceiptsView, SORT_LABELS, sortReceipts } from "@/lib/receipt-views";
import { searchReceipts } from "@/lib/search";

const VIEWS: { view: ReceiptsView; icon: IconName; label: string }[] = [
  { view: "list", icon: "viewList", label: "List" },
  { view: "grid", icon: "viewGrid", label: "Grid" },
  { view: "timeline", icon: "viewTimeline", label: "By month" },
];
const SORTS: ReceiptsSort[] = ["deadline", "newest", "price"];

/** Opens Add receipt with the camera already open, so scanning is one tap from home. */
function scanReceipt() {
  router.push({ pathname: "/receipt/new", params: { scan: "camera" } });
}

export default function ReceiptsScreen() {
  const theme = useTheme();
  const today = todayIso();
  const { receipts: allReceipts, ready } = useReceiptsStore();
  const [query, setQuery] = useState("");
  const reminders = useReminders();
  const { settings, update } = useSettings();
  const view = settings.receiptsView;
  const sort = settings.receiptsSort;
  const pull = usePullToSync();
  const { spaces } = useSpaces();
  /** "all", "mine" (personal only) or a space id. */
  const [filter, setFilter] = useState("all");
  /** Whether finished-with receipts (returned, claimed or archived) are listed too. */
  const [showDone, setShowDone] = useState(false);
  // A space you've left (or that was deleted) can't stay selected.
  const activeFilter = filter === "all" || filter === "mine" || spaces.some((space) => space.id === filter) ? filter : "all";

  const receipts = useMemo(() => sortReceipts(allReceipts, sort, today), [allReceipts, sort, today]);

  const filteredReceipts = useMemo(
    () =>
      activeFilter === "all"
        ? receipts
        : receipts.filter((receipt) => (activeFilter === "mine" ? !receipt.spaceId : receipt.spaceId === activeFilter)),
    [receipts, activeFilter],
  );
  const doneCount = filteredReceipts.filter((receipt) => receipt.closed).length;
  // Searching looks through everything, finished receipts included.
  const listedReceipts = useMemo(
    () => (showDone || query.trim() ? filteredReceipts : filteredReceipts.filter((receipt) => !receipt.closed)),
    [filteredReceipts, showDone, query],
  );
  const visibleReceipts = useMemo(() => searchReceipts(listedReceipts, query), [listedReceipts, query]);
  const filters = [
    { id: "all", label: "All" },
    { id: "mine", label: "Just mine" },
    ...spaces.map((space) => ({ id: space.id, label: space.name })),
  ];

  const dueThisWeek = receipts.filter((receipt) => {
    const deadline = getNextDeadline(receipt, today);
    return deadline !== undefined && daysBetween(today, deadline.date) <= 7;
  }).length;

  const header = (
    <Intro id="home-header">
      <ScreenHeader
        title="Receipts"
        subtitle={
          receipts.length === 0
            ? "You keep your receipts. Keepr keeps your rights."
            : `${dueThisWeek === 1 ? "1 deadline" : `${dueThisWeek} deadlines`} in the next 7 days`
        }
        actions={[
          { icon: "add", label: "Add receipt by hand", onPress: () => router.push("/receipt/new") },
          { icon: "camera", label: "Scan a receipt", onPress: scanReceipt, primary: true },
        ]}
      />
    </Intro>
  );

  if (!ready) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} />
        </View>
      </View>
    );
  }

  if (receipts.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <Intro id="home-body" rise delay={40} style={styles.centered}>
          <ExampleReceipt today={today} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Keep your first receipt</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Snap a receipt and Keepr works out your return, refund and warranty deadlines, then reminds you before they
            pass.
          </Text>
          <View style={styles.emptyButtons}>
            <Button title="Scan a receipt" variant="primary" icon={<Icon name="camera" size={18} color={theme.onPrimary} />} onPress={scanReceipt} />
            <Button title="Add one by hand" onPress={() => router.push("/receipt/new")} />
          </View>
        </Intro>
      </View>
    );
  }

  const sections = view === "timeline" ? groupByMonth(visibleReceipts) : [];
  const listProps = {
    style: { backgroundColor: theme.background },
    contentContainerStyle: styles.list,
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: "on-drag" as const,
    refreshControl: <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={theme.accent} />,
    keyExtractor: (receipt: { id: string }) => receipt.id,
    ItemSeparatorComponent: () => <View style={styles.separator} />,
    ListHeaderComponent: (
          <View style={styles.listHeader}>
            {query.length === 0 && <NextDeadlineCard receipts={filteredReceipts} today={today} />}
            {spaces.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
                accessibilityRole="tablist"
              >
                {filters.map((item) => {
                  const selected = item.id === activeFilter;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setFilter(item.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? theme.text : theme.card,
                          borderColor: selected ? theme.text : theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? theme.background : theme.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <RemindersBanner
              permission={reminders.permission}
              onEnable={reminders.request}
              daysBefore={settings.reminders.daysBefore}
            />
            <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Icon name="search" size={18} color={theme.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search products, shops or any word on a receipt"
                placeholderTextColor={theme.textMuted}
                accessibilityLabel="Search receipts"
                autoCorrect={false}
                returnKeyType="search"
                style={[styles.searchInput, { color: theme.text }]}
              />
              {query.length > 0 && (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery("")}>
                  <Icon name="close" size={18} color={theme.textMuted} />
                </Pressable>
              )}
            </View>
            <View style={styles.toolbar}>
              <View style={[styles.viewSwitch, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityRole="tablist">
                {VIEWS.map((item) => {
                  const selected = item.view === view;
                  return (
                    <Pressable
                      key={item.view}
                      accessibilityRole="tab"
                      accessibilityLabel={`${item.label} view`}
                      accessibilityState={{ selected }}
                      hitSlop={4}
                      onPress={() => update({ receiptsView: item.view })}
                      style={[styles.viewButton, selected && { backgroundColor: theme.accentSoft }]}
                    >
                      <Icon name={item.icon} size={18} color={selected ? theme.accent : theme.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sorted by ${SORT_LABELS[sort]}. Change order`}
                onPress={() => update({ receiptsSort: SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length] })}
                style={[styles.sortButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="sort" size={16} color={theme.textMuted} />
                <Text style={[styles.sortText, { color: theme.text }]}>{SORT_LABELS[sort]}</Text>
              </Pressable>
            </View>
          </View>
    ),
    ListEmptyComponent: (
      <Text style={[styles.noResults, { color: theme.textMuted }]}>
        {query.trim()
          ? `No receipts match “${query.trim()}”.`
          : doneCount > 0
            ? "All done. Nothing to keep an eye on."
            : "No receipts here yet."}
      </Text>
    ),
    ListFooterComponent:
      doneCount > 0 && !query.trim() ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowDone((shown) => !shown)}
          style={[styles.doneToggle, { borderColor: theme.border }]}
        >
          <Icon name="archive" size={16} color={theme.textMuted} />
          <Text style={[styles.doneToggleText, { color: theme.textMuted }]}>
            {showDone ? "Hide finished receipts" : `Show ${doneCount} finished ${doneCount === 1 ? "receipt" : "receipts"}`}
          </Text>
        </Pressable>
      ) : undefined,
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {header}
      <Intro id="home-body" rise delay={40} style={styles.screen}>
        {view === "timeline" ? (
          <SectionList
            {...listProps}
            sections={sections}
            stickySectionHeadersEnabled={false}
            renderItem={({ item }) => (
              <SwipeableReceipt receipt={item}>
                <ReceiptCard receipt={item} today={today} />
              </SwipeableReceipt>
            )}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionTotal, { color: theme.textMuted }]}>
                  {formatPrice(section.totalPence)} · {section.data.length === 1 ? "1 receipt" : `${section.data.length} receipts`}
                </Text>
              </View>
            )}
          />
        ) : (
          <FlatList
            {...listProps}
            // Changing the column count needs a fresh list.
            key={view}
            data={visibleReceipts}
            numColumns={view === "grid" ? 2 : 1}
            columnWrapperStyle={view === "grid" ? styles.gridRow : undefined}
            renderItem={({ item }) =>
              view === "grid" ? (
                <ReceiptTile receipt={item} today={today} />
              ) : (
                <SwipeableReceipt receipt={item}>
                  <ReceiptCard receipt={item} today={today} />
                </SwipeableReceipt>
              )
            }
          />
        )}
      </Intro>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  doneToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listHeader: {
    gap: 12,
    marginBottom: 16,
  },
  chips: {
    gap: 8,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  viewSwitch: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  viewButton: {
    width: 40,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  sortText: {
    fontSize: 14,
    fontWeight: "600",
  },
  gridRow: {
    justifyContent: "space-between",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.display,
  },
  sectionTotal: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 16,
  },
  noResults: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
  },
  separator: {
    height: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Fonts.display,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
  emptyButtons: {
    marginTop: 16,
    gap: 10,
    alignSelf: "stretch",
  },
});
