import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ExampleReceipt } from "@/components/example-receipt";
import { Button } from "@/components/form";
import { Icon } from "@/components/icon";
import { NextDeadlineCard } from "@/components/next-deadline-card";
import { ReceiptCard } from "@/components/receipt-card";
import { RemindersBanner } from "@/components/reminders-banner";
import { ScreenHeader } from "@/components/screen-header";
import { useTheme } from "@/constants/theme";
import { usePullToSync } from "@/data/cloud";
import { useReceiptsStore } from "@/data/receipts";
import { useReminders } from "@/data/reminders";
import { useSettings } from "@/data/settings";
import { useSpaces } from "@/data/spaces";
import { daysBetween, getNextDeadline, todayIso } from "@/lib/deadlines";
import { searchReceipts } from "@/lib/search";

/** Sort key for receipts with no upcoming deadline, so they go last. */
const NO_DEADLINE = "9999-12-31";

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
  const { settings } = useSettings();
  const pull = usePullToSync();
  const { spaces } = useSpaces();
  /** "all", "mine" (personal only) or a space id. */
  const [filter, setFilter] = useState("all");
  // A space you've left (or that was deleted) can't stay selected.
  const activeFilter = filter === "all" || filter === "mine" || spaces.some((space) => space.id === filter) ? filter : "all";

  const receipts = useMemo(
    () =>
      [...allReceipts].sort((a, b) => {
        const aDate = getNextDeadline(a, today)?.date ?? NO_DEADLINE;
        const bDate = getNextDeadline(b, today)?.date ?? NO_DEADLINE;
        return aDate.localeCompare(bDate);
      }),
    [allReceipts, today],
  );

  const filteredReceipts = useMemo(
    () =>
      activeFilter === "all"
        ? receipts
        : receipts.filter((receipt) => (activeFilter === "mine" ? !receipt.spaceId : receipt.spaceId === activeFilter)),
    [receipts, activeFilter],
  );
  const visibleReceipts = useMemo(() => searchReceipts(filteredReceipts, query), [filteredReceipts, query]);
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
        <View style={styles.centered}>
          <ExampleReceipt today={today} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Keep your first receipt</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Snap a receipt and Keepr works out your return, refund and warranty deadlines, then reminds you before they
            pass.
          </Text>
          <View style={styles.emptyButtons}>
            <Button title="Scan a receipt" variant="primary" icon={<Icon name="camera" size={18} color={theme.onAccent} />} onPress={scanReceipt} />
            <Button title="Add one by hand" onPress={() => router.push("/receipt/new")} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {header}
      <FlatList
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.list}
        data={visibleReceipts}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={theme.accent} />}
        keyExtractor={(receipt) => receipt.id}
        renderItem={({ item }) => <ReceiptCard receipt={item} today={today} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
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
                placeholder="Search by product or shop"
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
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.noResults, { color: theme.textMuted }]}>
            {query.trim() ? `No receipts match “${query.trim()}”.` : "No receipts here yet."}
          </Text>
        }
      />
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
  listHeader: {
    gap: 12,
    marginBottom: 16,
  },
  chips: {
    gap: 8,
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
    fontWeight: "700",
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
