import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DeadlinePill, toneFor } from "@/components/deadline-pill";
import { useTheme } from "@/constants/theme";
import { daysBetween, getNextDeadline } from "@/lib/deadlines";
import { formatDate, formatPrice } from "@/lib/format";
import type { Receipt } from "@/types/receipt";

type Props = {
  receipt: Receipt;
  today: string;
};

export function ReceiptCard({ receipt, today }: Props) {
  const theme = useTheme();
  const deadline = getNextDeadline(receipt, today);
  const daysLeft = deadline ? daysBetween(today, deadline.date) : undefined;
  const tone = toneFor(theme, daysLeft);
  const currentYear = Number(today.slice(0, 4));
  const channel = receipt.channel === "online" ? "online" : "in store";

  return (
    <Link href={{ pathname: "/receipt/[id]", params: { id: receipt.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${receipt.product} from ${receipt.retailer}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.card, borderColor: tone.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.product, { color: theme.text }]} numberOfLines={1}>
            {receipt.product}
          </Text>
          <Text style={[styles.price, { color: theme.text }]}>{formatPrice(receipt.pricePence)}</Text>
        </View>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {receipt.retailer} · {channel} · {formatDate(receipt.purchaseDate, currentYear)}
        </Text>
        <View style={styles.pill}>
          <DeadlinePill deadline={deadline} today={today} />
        </View>
      </Pressable>
    </Link>
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
    marginTop: 6,
  },
});
