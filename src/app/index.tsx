import { Link, router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/form";
import { ReceiptCard } from "@/components/receipt-card";
import { useTheme } from "@/constants/theme";
import { useReceiptsStore } from "@/data/receipts";
import { daysBetween, getNextDeadline, todayIso } from "@/lib/deadlines";
import { searchReceipts } from "@/lib/search";

/** Sort key for receipts with no upcoming deadline, so they go last. */
const NO_DEADLINE = "9999-12-31";

export default function ReceiptsScreen() {
  const theme = useTheme();
  const today = todayIso();
  const { receipts: allReceipts, ready, addSampleReceipts } = useReceiptsStore();
  const [query, setQuery] = useState("");

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
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Keep your first receipt</Text>
        <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
          Add a purchase and Keepr works out your return, refund and warranty deadlines.
        </Text>
        <View style={styles.emptyButtons}>
          <Button title="Add a receipt" variant="primary" onPress={() => router.push("/receipt/new")} />
          <Button title="Try it with sample receipts" onPress={addSampleReceipts} />
        </View>
      </View>
    );
  }

  return (
    <>
      {header}
      <FlatList
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.list}
        data={visibleReceipts}
        keyboardShouldPersistTaps="handled"
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
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by product or shop"
              placeholderTextColor={theme.textMuted}
              accessibilityLabel="Search receipts"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={[styles.search, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.noResults, { color: theme.textMuted }]}>No receipts match “{query.trim()}”.</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
