import { Link, router, Stack } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { useSubscriptions } from "@/data/subscriptions";
import { daysBetween, todayIso } from "@/lib/deadlines";
import { formatDate, formatPrice } from "@/lib/format";
import { nextRenewalOnOrAfter, sortByNextCharge, totalMonthlyPence, totalYearlyPence } from "@/lib/subscriptions";
import type { BillingCycle, Subscription } from "@/types/subscription";

const CYCLE_SUFFIX: Record<BillingCycle, string> = { weekly: "/week", monthly: "/month", yearly: "/year" };

function SubscriptionRow({ subscription, today }: { subscription: Subscription; today: string }) {
  const theme = useTheme();
  const currentYear = Number(today.slice(0, 4));
  const onTrial = subscription.trialEnds !== undefined && subscription.trialEnds >= today;
  const nextDate = onTrial ? subscription.trialEnds! : nextRenewalOnOrAfter(subscription, today);
  const daysLeft = daysBetween(today, nextDate);
  const soon = daysLeft <= 3;

  return (
    <Link href={{ pathname: "/subscriptions/edit/[id]", params: { id: subscription.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${subscription.name}, ${formatPrice(subscription.pricePence)}${CYCLE_SUFFIX[subscription.cycle]}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: theme.card,
            borderColor: soon ? theme.urgentText : theme.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {subscription.name}
          </Text>
          <Text style={[styles.price, { color: theme.text }]}>
            {formatPrice(subscription.pricePence)}
            <Text style={{ color: theme.textMuted }}>{CYCLE_SUFFIX[subscription.cycle]}</Text>
          </Text>
        </View>
        <Text style={{ color: soon ? theme.urgentText : theme.textMuted, fontSize: 13 }}>
          {onTrial ? "Free trial ends" : "Renews"} {daysLeft === 0 ? "today" : formatDate(nextDate, currentYear)}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function SubscriptionsScreen() {
  const theme = useTheme();
  const today = todayIso();
  const { subscriptions, ready } = useSubscriptions();
  const sorted = useMemo(() => sortByNextCharge(subscriptions, today), [subscriptions, today]);

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Link href="/subscriptions/new" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Add subscription" hitSlop={8}>
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

  if (subscriptions.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        {header}
        <Text style={[styles.emptyTitle, { color: theme.text }]}>All your subscriptions in one place</Text>
        <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
          Add streaming, apps, gyms and memberships to see what you spend, and get a reminder before each payment
          and before free trials end.
        </Text>
        <View style={styles.emptyButton}>
          <Button title="Add a subscription" variant="primary" onPress={() => router.push("/subscriptions/new")} />
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
        data={sorted}
        keyExtractor={(subscription) => subscription.id}
        renderItem={({ item }) => <SubscriptionRow subscription={item} today={today} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={[styles.totals, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.total}>
              <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Per month</Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>{formatPrice(totalMonthlyPence(subscriptions))}</Text>
            </View>
            <View style={styles.total}>
              <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Per year</Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>{formatPrice(totalYearlyPence(subscriptions))}</Text>
            </View>
          </View>
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
  totals: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  total: {
    flex: 1,
    gap: 2,
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
  },
  separator: {
    height: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 15,
    textAlign: "center",
    maxWidth: 320,
  },
  emptyButton: {
    marginTop: 16,
    alignSelf: "stretch",
  },
});
