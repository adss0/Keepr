import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { ReceiptCard } from "@/components/receipt-card";
import { useTheme } from "@/constants/theme";
import { useReceipts } from "@/data/receipts";
import { daysBetween, getNextDeadline, todayIso } from "@/lib/deadlines";

/** Sort key for receipts with no upcoming deadline, so they go last. */
const NO_DEADLINE = "9999-12-31";

export default function ReceiptsScreen() {
  const theme = useTheme();
  const today = todayIso();
  const allReceipts = useReceipts();

  const receipts = useMemo(
    () =>
      [...allReceipts].sort((a, b) => {
        const aDate = getNextDeadline(a, today)?.date ?? NO_DEADLINE;
        const bDate = getNextDeadline(b, today)?.date ?? NO_DEADLINE;
        return aDate.localeCompare(bDate);
      }),
    [allReceipts, today],
  );

  const dueThisWeek = receipts.filter((receipt) => {
    const deadline = getNextDeadline(receipt, today);
    return deadline !== undefined && daysBetween(today, deadline.date) <= 7;
  }).length;

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.list}
      data={receipts}
      keyExtractor={(receipt) => receipt.id}
      renderItem={({ item }) => <ReceiptCard receipt={item} today={today} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.tagline, { color: theme.textMuted }]}>
            You keep your receipts. Keepr keeps your rights.
          </Text>
          <Text style={[styles.summary, { color: theme.text }]}>
            {dueThisWeek === 1 ? "1 deadline" : `${dueThisWeek} deadlines`} in the next 7 days
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
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
  separator: {
    height: 10,
  },
});
