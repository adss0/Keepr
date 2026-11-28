import { router } from "expo-router";
import { type ReactNode, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { columnWidth, useDesktop } from "@/components/desktop";
import { ExampleReceipt } from "@/components/example-receipt";
import { Button } from "@/components/form";
import { Icon, type IconName } from "@/components/icon";
import { Intro } from "@/components/intro";
import { NeedsAttention } from "@/components/needs-attention";
import { ReceiptCard } from "@/components/receipt-card";
import { ReceiptTile } from "@/components/receipt-tile";
import { RemindersBanner } from "@/components/reminders-banner";
import { ScreenHeader } from "@/components/screen-header";
import { allDates, ReceiptFilters } from "@/components/receipt-filters";
import { SwipeableReceipt } from "@/components/swipeable-receipt";
import { Fonts, useTheme } from "@/constants/theme";
import { useToast } from "@/components/toast";
import { useCloud, usePullToSync } from "@/data/cloud";
import { shareReceiptPhotosPdf } from "@/data/receipt-pdf";
import { useReceiptsStore } from "@/data/receipts";
import { useReminders } from "@/data/reminders";
import { useSettings } from "@/data/settings";
import { useSpaces } from "@/data/spaces";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { errorMessage, formatPrice } from "@/lib/format";
import { boughtIn, periodRange } from "@/lib/export-range";
import { groupByMonth, type ReceiptsView, sortReceipts } from "@/lib/receipt-views";
import { searchReceipts } from "@/lib/search";
import { needsAttention } from "@/lib/attention";

const VIEWS: { view: ReceiptsView; icon: IconName; label: string }[] = [
  { view: "list", icon: "viewList", label: "List" },
  { view: "grid", icon: "viewGrid", label: "Grid" },
  { view: "timeline", icon: "viewTimeline", label: "By month" },
];

/** Opens Add receipt with the camera already open, so scanning is one tap from home. */
function scanReceipt() {
  router.push({ pathname: "/receipt/new", params: { scan: "camera" } });
}

export default function ReceiptsScreen() {
  const theme = useTheme();
  const desktop = useDesktop();
  const today = todayIso();
  const { receipts: allReceipts, ready } = useReceiptsStore();
  const [query, setQuery] = useState("");
  const reminders = useReminders();
  const { settings, update } = useSettings();
  const view = settings.receiptsView;
  const sort = settings.receiptsSort;
  const pull = usePullToSync();
  const { userId } = useCloud();
  const { showToast } = useToast();
  /** Ticked receipts while choosing several to export; undefined when not choosing. */
  const [selected, setSelected] = useState<Set<string>>();
  const [exporting, setExporting] = useState(false);
  const { spaces } = useSpaces();
  /** "all", "mine" (personal only) or a space id. */
  const [filter, setFilter] = useState("all");
  /** Whether finished-with receipts (returned, claimed or archived) are listed too. */
  const [showDone, setShowDone] = useState(false);
  const [dates, setDates] = useState(() => allDates(today));
  // A space you've left (or that was deleted) can't stay selected.
  const activeFilter = filter === "all" || filter === "mine" || spaces.some((space) => space.id === filter) ? filter : "all";

  const receipts = useMemo(() => sortReceipts(allReceipts, sort, today), [allReceipts, sort, today]);
  const inScope = (item: { spaceId?: string }) =>
    activeFilter === "all" || (activeFilter === "mine" ? !item.spaceId : item.spaceId === activeFilter);
  const { subscriptions } = useSubscriptions();

  const filteredReceipts = useMemo(() => {
    const range = periodRange(dates.period, today, dates);
    return receipts.filter(
      (receipt) =>
        boughtIn(receipt, range) &&
        (activeFilter === "all" || (activeFilter === "mine" ? !receipt.spaceId : receipt.spaceId === activeFilter)),
    );
  }, [receipts, activeFilter, dates, today]);
  const doneCount = filteredReceipts.filter((receipt) => receipt.closed).length;
  // Searching looks through everything, finished receipts included.
  const listedReceipts = useMemo(
    () => (showDone || query.trim() ? filteredReceipts : filteredReceipts.filter((receipt) => !receipt.closed)),
    [filteredReceipts, showDone, query],
  );
  const visibleReceipts = useMemo(() => searchReceipts(listedReceipts, query), [listedReceipts, query]);
  const whoOptions = [
    { value: "all", label: "All receipts" },
    { value: "mine", label: "Just mine" },
    ...spaces.map((space) => ({ value: space.id, label: space.name })),
  ];

  const dueSoon = needsAttention(receipts.filter(inScope), subscriptions.filter(inScope), today).now.length;

  const header = (
    <Intro id="home-header">
      <ScreenHeader
        title="Receipts"
        subtitle={
          receipts.length === 0 && dueSoon === 0
            ? "You keep your receipts. Keepr keeps your rights."
            : dueSoon === 0
              ? "Nothing due soon"
              : `${dueSoon === 1 ? "1 thing" : `${dueSoon} things`} due soon`
        }
        actions={[
          { icon: "people", label: "Shared spaces", onPress: () => router.push("/spaces") },
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
        {/* Subscriptions can be due before the first receipt is added. */}
        {dueSoon > 0 && (
          <View style={styles.emptyAttention}>
            <NeedsAttention receipts={[]} subscriptions={subscriptions.filter(inScope)} today={today} />
          </View>
        )}
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
  // A wide window fits more: four tiles a row instead of two, and the list in two columns.
  const columns = view === "grid" ? (desktop ? 4 : 2) : desktop ? 2 : 1;
  const selecting = selected !== undefined;
  const toggleSelected = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  async function exportSelected() {
    const chosen = visibleReceipts.filter((receipt) => selected?.has(receipt.id));
    if (chosen.length === 0) return;
    setExporting(true);
    try {
      await shareReceiptPhotosPdf(chosen, today, (receipt) => receipt.ownerId ?? userId);
      setSelected(undefined);
    } catch (error) {
      showToast({ message: `Couldn't make the PDF: ${errorMessage(error)}` });
    } finally {
      setExporting(false);
    }
  }
  /** A receipt in the list: swipeable normally, a tick box while choosing several. */
  const row = (item: (typeof visibleReceipts)[number], tile: boolean) => {
    const content = tile ? <ReceiptTile receipt={item} today={today} /> : <ReceiptCard receipt={item} today={today} />;
    if (selecting) {
      return (
        <SelectableRow selected={selected.has(item.id)} onToggle={() => toggleSelected(item.id)} tile={tile} label={item.product}>
          {content}
        </SelectableRow>
      );
    }
    return tile ? content : <SwipeableReceipt receipt={item}>{content}</SwipeableReceipt>;
  };

  const listProps = {
    extraData: selected,
    style: { backgroundColor: theme.background },
    contentContainerStyle: styles.list,
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: "on-drag" as const,
    refreshControl: <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={theme.accent} />,
    keyExtractor: (receipt: { id: string }) => receipt.id,
    ItemSeparatorComponent: () => <View style={styles.separator} />,
    ListHeaderComponent: (
          <View style={styles.listHeader}>
            {/* Whose things it shows follows the Show filter; the Bought dates don't hide what's due. */}
            {query.length === 0 && (
              <NeedsAttention receipts={receipts.filter(inScope)} subscriptions={subscriptions.filter(inScope)} today={today} />
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
            <ReceiptFilters
              sort={sort}
              onSortChange={(receiptsSort) => update({ receiptsSort })}
              dates={dates}
              onDatesChange={setDates}
              today={today}
              who={spaces.length > 0 ? { value: activeFilter, options: whoOptions, onChange: setFilter } : undefined}
              trailing={
                <View style={styles.trailing}>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => setSelected(selecting ? undefined : new Set())}
                    style={styles.selectToggle}
                  >
                    <Text style={[styles.selectAction, { color: theme.text }]}>{selecting ? "Cancel" : "Select"}</Text>
                  </Pressable>
                  <View style={[styles.viewSwitch, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityRole="tablist">
                    {VIEWS.map((item) => {
                      const current = item.view === view;
                      return (
                        <Pressable
                          key={item.view}
                          accessibilityRole="tab"
                          accessibilityLabel={`${item.label} view`}
                          accessibilityState={{ selected: current }}
                          hitSlop={4}
                          onPress={() => update({ receiptsView: item.view })}
                          style={[styles.viewButton, current && { backgroundColor: theme.accentSoft }]}
                        >
                          <Icon name={item.icon} size={18} color={current ? theme.accent : theme.textMuted} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              }
            />
            {spaces.some((space) => space.id === activeFilter) && (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push({ pathname: "/spaces/[id]", params: { id: activeFilter } })}
                style={[styles.spaceLink, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="people" size={18} color={theme.accent} />
                <Text style={[styles.spaceLinkText, { color: theme.text }]} numberOfLines={1}>
                  Open {spaces.find((space) => space.id === activeFilter)?.name}: activity, people and settings
                </Text>
                <Icon name="chevronRight" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
    ),
    ListEmptyComponent: (
      <Text style={[styles.noResults, { color: theme.textMuted }]}>
        {query.trim()
          ? `No receipts match “${query.trim()}”.`
          : dates.period !== "all"
            ? "No receipts bought in these dates."
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
            renderItem={({ item }) => row(item, false)}
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
            key={`${view}-${columns}`}
            data={visibleReceipts}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
            renderItem={({ item }) =>
              columns > 1 ? <View style={{ width: columnWidth(columns) }}>{row(item, view === "grid")}</View> : row(item, false)
            }
          />
        )}
      </Intro>
      {selecting && (
        <View style={[styles.selectBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.selectCount, { color: theme.text }]}>
            {selected.size === 0 ? "Tap receipts to choose" : `${selected.size} chosen`}
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              setSelected(
                selected.size === visibleReceipts.length ? new Set() : new Set(visibleReceipts.map((receipt) => receipt.id)),
              )
            }
          >
            <Text style={[styles.selectAction, { color: theme.text }]}>
              {selected.size === visibleReceipts.length && selected.size > 0 ? "Select none" : "Select all"}
            </Text>
          </Pressable>
          <Button title="Export PDF" variant="primary" busy={exporting} onPress={exportSelected} />
        </View>
      )}
    </View>
  );
}

/** Wraps a receipt while choosing several: tapping ticks it rather than opening it. */
function SelectableRow({
  selected,
  onToggle,
  tile,
  label,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  tile: boolean;
  label: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      style={tile ? styles.selectTile : styles.selectRow}
    >
      {/* The card inside opens the receipt when tapped; while choosing, taps go to the tick box instead. */}
      <View pointerEvents="none" style={[!tile && styles.selectCard, !selected && styles.unselected]}>
        {children}
      </View>
      <View
        style={[
          styles.tick,
          // On a tile it sits in the photo's corner; in the list, beside the card so it covers nothing.
          tile && styles.tileTick,
          { borderColor: selected ? theme.text : theme.border, backgroundColor: selected ? theme.text : theme.card },
        ]}
      >
        {selected && <Icon name="check" size={14} color={theme.background} />}
      </View>
    </Pressable>
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
  emptyAttention: {
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  spaceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  spaceLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
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
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectToggle: {
    height: 36,
    justifyContent: "center",
  },
  selectAction: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 10,
    paddingLeft: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectCount: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  selectTile: {
    width: "100%",
  },
  unselected: {
    opacity: 0.6,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectCard: {
    flex: 1,
  },
  tileTick: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
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
