import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/form";
import { Icon } from "@/components/icon";
import { PressScale } from "@/components/press-scale";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { haptics } from "@/data/haptics";
import { isPdf, photosStoredLocally, savePhoto, usePhotoUri } from "@/data/receipt-photos";
import { useReceiptsStore } from "@/data/receipts";
import { pickReceiptPhoto } from "@/data/scan-receipt";
import type { Receipt } from "@/types/receipt";

/** The receipt's photo as proof of purchase, with ways to add or replace it. */
export function ReceiptPhotoCard({ receipt }: { receipt: Receipt }) {
  const theme = useTheme();
  const { userId } = useCloud();
  const { setReceiptPhoto } = useReceiptsStore();
  const uri = usePhotoUri(receipt.photo, userId);
  const [busy, setBusy] = useState(false);

  async function addPhoto(source: "camera" | "library") {
    try {
      const photo = await pickReceiptPhoto(source);
      if (!photo) return;
      setBusy(true);
      const name = savePhoto(receipt.id, photo);
      if (name) {
        setReceiptPhoto(receipt.id, name);
        haptics.success();
      }
    } catch (error) {
      Alert.alert("Couldn't add the photo", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!receipt.photo) {
    if (!photosStoredLocally) return null;
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.emptyRow}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
            <Icon name="camera" size={20} color={theme.accent} />
          </View>
          <View style={styles.emptyText}>
            <Text style={[styles.title, { color: theme.text }]}>Keep the receipt</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              A photo is proof of purchase if you need to return or claim.
            </Text>
          </View>
        </View>
        {busy ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button title="Take photo" onPress={() => addPhoto("camera")} />
            </View>
            <View style={styles.button}>
              <Button title="Choose photo" onPress={() => addPhoto("library")} />
            </View>
          </View>
        )}
      </View>
    );
  }

  const pdf = isPdf(receipt.photo);
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={pdf ? "Open receipt PDF" : "View receipt photo"}
        onPress={() => router.push({ pathname: "/receipt/photo/[id]", params: { id: receipt.id } })}
        style={StyleSheet.flatten([styles.preview, { backgroundColor: theme.calmBg }])}
      >
        {pdf ? (
          <View style={styles.pdf}>
            <Icon name="receipts" size={34} color={theme.textMuted} />
            <Text style={[styles.title, { color: theme.text }]}>PDF receipt</Text>
          </View>
        ) : uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <ActivityIndicator color={theme.accent} />
        )}
      </PressScale>
      <View style={styles.footer}>
        <Text style={[styles.hint, { color: theme.textMuted }]}>Proof of purchase{userId ? " · backed up" : ""}</Text>
        {photosStoredLocally && (
          <Button title="Replace" variant="ghost" busy={busy} onPress={() => addPhoto("camera")} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 12,
    gap: 12,
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
  },
  preview: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pdf: {
    alignItems: "center",
    gap: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -6,
  },
});
