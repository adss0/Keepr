import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { isPdf, mediaTypeOf, photosStoredLocally, usePhotoUri } from "@/data/receipt-photos";
import { useReceipt } from "@/data/receipts";

/** The receipt's photo, full screen, with a Share button (to print it or send it with a claim). */
export default function ReceiptPhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = useReceipt(id);
  const { userId } = useCloud();
  const theme = useTheme();
  const uri = usePhotoUri(receipt?.photo, receipt?.ownerId ?? userId);

  async function share() {
    if (!uri || !receipt?.photo) return;
    try {
      await Sharing.shareAsync(uri, { mimeType: mediaTypeOf(receipt.photo), dialogTitle: "Share receipt" });
    } catch (error) {
      Alert.alert("Couldn't share the receipt", error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: "#000" }]}>
      <Stack.Screen
        options={{
          title: receipt?.product ?? "Receipt",
          headerRight: () =>
            uri && photosStoredLocally ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Share receipt" hitSlop={10} onPress={share}>
                <Icon name="share" size={22} color={theme.accent} />
              </Pressable>
            ) : null,
        }}
      />
      {!receipt?.photo ? (
        <Text style={styles.message}>This receipt has no photo.</Text>
      ) : !uri ? (
        <ActivityIndicator color="#fff" />
      ) : isPdf(receipt.photo) ? (
        <View style={styles.pdf}>
          <Icon name="receipts" size={48} color="#fff" />
          <Text style={styles.message}>PDF receipt. Use Share to open, print or send it.</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          accessibilityLabel={`Photo of the receipt for ${receipt.product}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  pdf: {
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  message: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
  },
});
