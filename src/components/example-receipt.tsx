import { BlurTargetView, BlurView } from "expo-blur";
import { type ComponentRef, useRef } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

import { ReceiptCard } from "@/components/receipt-card";
import { useTheme } from "@/constants/theme";
import { addDays } from "@/lib/deadlines";
import type { Receipt } from "@/types/receipt";

/** A blurred preview of what a saved receipt looks like, for the empty home screen. Not tappable or read aloud. */
export function ExampleReceipt({ today }: { today: string }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const target = useRef<ComponentRef<typeof View>>(null);
  const example: Receipt = {
    id: "example",
    product: "Wireless headphones",
    retailer: "Your favourite shop",
    pricePence: 7999,
    purchaseDate: addDays(today, -10),
    channel: "online",
    paymentMethod: "credit_card",
  };

  return (
    <View
      style={styles.wrapper}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BlurTargetView ref={target}>
        <ReceiptCard receipt={example} today={today} />
      </BlurTargetView>
      <BlurView
        intensity={18}
        tint={scheme === "dark" ? "dark" : "light"}
        blurTarget={target}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.badgeRow}>
        <Text style={[styles.badge, { backgroundColor: theme.card, color: theme.textMuted, borderColor: theme.border }]}>
          Example
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "stretch",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  badgeRow: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
