import { Image } from "expo-image";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { DeadlinePill } from "@/components/deadline-pill";
import { PressScale } from "@/components/press-scale";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { isPdf, usePhotoUri } from "@/data/receipt-photos";
import { getNextDeadline } from "@/lib/deadlines";
import { formatPrice } from "@/lib/format";
import type { Receipt } from "@/types/receipt";

/** A receipt as a grid tile: its photo (or the shop's initial), product, price and next deadline. */
export function ReceiptTile({ receipt, today }: { receipt: Receipt; today: string }) {
  const theme = useTheme();
  const { userId } = useCloud();
  const photoUri = usePhotoUri(isPdf(receipt.photo) ? undefined : receipt.photo, receipt.ownerId ?? userId);
  const deadline = getNextDeadline(receipt, today);

  return (
    // The wrapper sets the column width: the pressable inside only stretches to fill its parent.
    <View style={styles.cell}>
      <Link href={{ pathname: "/receipt/[id]", params: { id: receipt.id } }} asChild>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={`${receipt.product} from ${receipt.retailer}, ${formatPrice(receipt.pricePence)}`}
          style={StyleSheet.flatten([styles.tile, { backgroundColor: theme.card, borderColor: theme.border }])}
        >
          <View style={[styles.cover, { backgroundColor: theme.calmBg }]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : (
              <Text style={[styles.initial, { color: theme.textMuted }]}>{receipt.retailer.trim()[0]?.toUpperCase() ?? "?"}</Text>
            )}
          </View>
          <View style={styles.body}>
            <Text style={[styles.product, { color: theme.text }]} numberOfLines={2}>
              {receipt.product}
            </Text>
            <Text style={[styles.price, { color: theme.text }]}>{formatPrice(receipt.pricePence)}</Text>
            <Text style={[styles.shop, { color: theme.textMuted }]} numberOfLines={1}>
              {receipt.retailer}
            </Text>
            <DeadlinePill deadline={deadline} today={today} closed={receipt.closed} />
          </View>
        </PressScale>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: "48.5%",
  },
  tile: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  cover: {
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontSize: 36,
    fontWeight: "800",
  },
  body: {
    padding: 10,
    gap: 4,
  },
  product: {
    fontSize: 15,
    fontWeight: "600",
    minHeight: 38,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  shop: {
    fontSize: 12,
  },
});
