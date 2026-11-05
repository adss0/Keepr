import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/constants/theme";
import { daysBetween, getNextDeadline } from "@/lib/deadlines";
import { formatDate, formatPrice } from "@/lib/format";
import type { Receipt } from "@/types/receipt";

/** Deadlines this close (in days) are shown as urgent or coming up soon. */
const URGENT_DAYS = 3;
const SOON_DAYS = 7;

type Props = {
  receipt: Receipt;
  today: string;
};

function describeDaysLeft(days: number): string {
  if (days === 0) return "ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function ReceiptCard({ receipt, today }: Props) {
  const theme = useTheme();
  const deadline = getNextDeadline(receipt, today);
  const daysLeft = deadline ? daysBetween(today, deadline.date) : undefined;
  const currentYear = Number(today.slice(0, 4));

  const tone =
    daysLeft === undefined || daysLeft > SOON_DAYS
      ? { bg: theme.calmBg, text: theme.calmText, border: theme.border }
      : daysLeft <= URGENT_DAYS
        ? { bg: theme.urgentBg, text: theme.urgentText, border: theme.urgentText }
        : { bg: theme.soonBg, text: theme.soonText, border: theme.soonText };

  const channel = receipt.channel === "online" ? "online" : "in store";
  const deadlineText = !deadline
    ? "No active deadlines"
    : daysLeft !== undefined && daysLeft <= SOON_DAYS
      ? `${deadline.label}: ${describeDaysLeft(daysLeft)}`
      : `${deadline.label}: until ${formatDate(deadline.date, currentYear)}`;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: tone.border }]}>
      <View style={styles.row}>
        <Text style={[styles.product, { color: theme.text }]} numberOfLines={1}>
          {receipt.product}
        </Text>
        <Text style={[styles.price, { color: theme.text }]}>{formatPrice(receipt.pricePence)}</Text>
      </View>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {receipt.retailer} · {channel} · {formatDate(receipt.purchaseDate, currentYear)}
      </Text>
      <View style={[styles.pill, { backgroundColor: tone.bg }]}>
        <Text style={[styles.pillText, { color: tone.text }]}>{deadlineText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  product: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
  },
  meta: {
    fontSize: 13,
  },
  pill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
