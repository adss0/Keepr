import { Link, router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ExampleReceipt } from "@/components/example-receipt";
import { Button } from "@/components/form";
import { ReceiptCard } from "@/components/receipt-card";
import { RemindersBanner } from "@/components/reminders-banner";
import { useTheme } from "@/constants/theme";
import { usePullToSync } from "@/data/cloud";
import { useReceiptsStore } from "@/data/receipts";
import { useReminders } from "@/data/reminders";
import { shareCsv } from "@/data/share-csv";
import { daysBetween, getNextDeadline, todayIso } from "@/lib/deadlines";
import { receiptsToCsv } from "@/lib/export";
import { searchReceipts } from "@/lib/search";

/** Sort key for receipts with no upcoming deadline, so they go last. */
const NO_DEADLINE = "9999-12-31";

export default function ReceiptsScreen() {
  const theme = useTheme();
  const today = todayIso();
  const { receipts: allReceipts, ready } = useReceiptsStore();
  const [query, setQuery] = useState("");
  const reminders = useReminders();
  const pull = usePullToSync();

  const receipts = useMemo(
    () =>
      [...allReceipts].sort((a, b) => {
        const aDate = getNextDeadline(a, today)?.date ?? NO_DEADLINE;
        const bDate = getNextDeadline(b, today)?.date ?? NO_DEADLINE;
        return aDate.localeCompare(bDate);
      }),
    [allReceipts, today],
  );

  const visibleReceipts = useMemo(() => searchReceipts(receipts, query), [receipts, query]);

  const dueThisWeek = receipts.filter((receipt) => {
    const deadline = getNextDeadline(receipt, today);
    return deadline !== undefined && daysBetween(today, deadline.date) <= 7;
  }).length;

  const header = (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <Link href="/subscriptions" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Subscriptions" hitSlop={8}>
              <Text style={[styles.headerButton, { color: theme.accent }]}>Subscriptions</Text>
            </Pressable>
          </Link>
        ),
        headerRight: () => (
          <Link href="/receipt/new" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Add receipt" hitSlop={8}>
              <Text style={[styles.headerButton, { color: theme.accent }]}>Add</Text>
            </Pressable>
          </Link>
        ),
      }}
    />
  );

  /** Opens Add receipt with the camera already open, so scanning is one tap from home. */
  function scanReceipt() {
    router.push({ pathname: "/receipt/new", params: { scan: "camera" } });
  }

  if (!ready) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        {header}
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (receipts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        {header}
        <ExampleReceipt today={today} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Keep your first receipt</Text>
        <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
          Add a purchase and Keepr works out your return, refund and warranty deadlines.
        </Text>
        <View style={styles.emptyButtons}>
          <Button title="Scan a receipt" variant="primary" onPress={scanReceipt} />
          <Button title="Add one by hand" onPress={() => router.push("/receipt/new")} />
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
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={theme.accent} />}
        keyExtractor={(receipt) => receipt.id}
        renderItem={({ item }) => <ReceiptCard receipt={item} today={today} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.tagline, { color: theme.textMuted }]}>
              You keep your receipts. Keepr keeps your rights.
            </Text>
            <Text style={[styles.summary, { color: theme.text }]}>
              {dueThisWeek === 1 ? "1 deadline" : `${dueThisWeek} deadlines`} in the next 7 days
            </Text>
            <RemindersBanner permission={reminders.permission} onEnable={reminders.request} />
            <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery("")}>
                  <Text style={{ color: theme.accent, fontWeight: "600" }}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Button title="Account and sync" onPress={() => router.push("/account")} />
            <Button
              title="Export receipts (CSV)"
              onPress={() => {
                shareCsv(receiptsToCsv(allReceipts, today), `keepr-receipts-${today}.csv`).catch((error: unknown) =>
                  Alert.alert("Couldn't export receipts", error instanceof Error ? error.message : String(error)),
                );
              }}
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.noResults, { color: theme.textMuted }]}>No receipts match “{query.trim()}”.</Text>
        }
      />
      <View style={[styles.actionBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={styles.actionMain}>
          <Button title="Scan a receipt" variant="primary" onPress={scanReceipt} />
        </View>
        <Button title="Add by hand" onPress={() => router.push("/receipt/new")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  actionBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionMain: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  headerButton: {
    fontSize: 17,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  listHeader: {
    gap: 4,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 13,
  },
  summary: {
    fontSize: 17,
    fontWeight: "600",
  },
  search: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  noResults: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
  },
  footer: {
    marginTop: 20,
    gap: 10,
  },
  separator: {
    height: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptyBody: {
    fontSize: 15,
    textAlign: "center",
    maxWidth: 320,
  },
  emptyButtons: {
    marginTop: 16,
    gap: 10,
    alignSelf: "stretch",
  },
});
