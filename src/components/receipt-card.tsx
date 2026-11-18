import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { DeadlinePill, toneFor } from "@/components/deadline-pill";
import { PressScale } from "@/components/press-scale";
import { useTheme } from "@/constants/theme";
import { useReceiptActions } from "@/components/swipeable-receipt";
import { useSpaces } from "@/data/spaces";
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
  const space = useSpaces().spaceName(receipt.spaceId);
  const actions = useReceiptActions(receipt);

  return (
    <Link href={{ pathname: "/receipt/[id]", params: { id: receipt.id } }} asChild>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={`${receipt.product} from ${receipt.retailer}`}
        accessibilityActions={actions.accessibilityActions}
        onAccessibilityAction={(event) => actions.onAccessibilityAction(event.nativeEvent.actionName)}
        // Link asChild rejects style arrays on its child.
        style={StyleSheet.flatten([
          styles.card,
          { backgroundColor: theme.card, borderColor: tone.border },
          receipt.closed && styles.closed,
        ])}
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
        {space && (
          <Text style={[styles.space, { color: theme.accent }]} numberOfLines={1}>
            Shared · {space}
          </Text>
        )}
        <View style={[styles.tear, { borderColor: theme.border }]} />
        <View style={styles.pill}>
          <DeadlinePill deadline={deadline} today={today} closed={receipt.closed} />
        </View>
      </PressScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  tear: {
    // Dashed on iOS and the web; Android draws single-side dashes as a solid hairline, which still reads fine.
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginTop: 10,
    marginHorizontal: -16,
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
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  meta: {
    fontSize: 13,
  },
  space: {
    fontSize: 12,
    fontWeight: "600",
  },
  pill: {
    marginTop: 8,
  },
  closed: {
    opacity: 0.7,
  },
});
