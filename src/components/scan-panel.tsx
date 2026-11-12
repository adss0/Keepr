import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { extractReceipt, pickReceiptPhoto } from "@/data/scan-receipt";

type Props = {
  /** Called with the raw scan result, to fill in the form. */
  onScanned: (result: unknown) => void;
};

/** "Scan a receipt" buttons at the top of the add form, or what's needed before scanning can work. */
export function ScanPanel({ onScanned }: Props) {
  const theme = useTheme();
  const { status } = useCloud();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  if (status === "not_set_up") {
    return (
      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Scan a receipt</Text>
        <Text style={[styles.text, { color: theme.textMuted }]}>
          Take a photo and Keepr fills in the product, shop, price, date and payment for you. Scanning needs a
          one-time setup first: a free Supabase project and a free Gemini API key (see docs/cloud-setup.md). Until then,
          fill in the details below by hand.
        </Text>
      </View>
    );
  }

  if (status === "signed_out") {
    return (
      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.text, { color: theme.textMuted }]}>
          Sign in to scan receipts with your camera and have the details filled in for you.
        </Text>
        <Button title="Sign in" onPress={() => router.push("/account")} />
      </View>
    );
  }

  async function scan(source: "camera" | "library") {
    setMessage(undefined);
    try {
      const photo = await pickReceiptPhoto(source);
      if (!photo) return;
      setBusy(true);
      const result = await extractReceipt(photo);
      if ((result as { is_receipt?: boolean } | null)?.is_receipt === false) {
        setMessage("That doesn't look like a receipt. Try another photo.");
        return;
      }
      onScanned(result);
      setMessage("Check the details below, then save.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.text, { color: theme.text }]}>Reading your receipt…</Text>
        </View>
      ) : (
        <>
          <Button title="Scan a receipt" variant="primary" onPress={() => scan("camera")} />
          <Button title="Choose a photo" onPress={() => scan("library")} />
        </>
      )}
      {message && <Text style={[styles.text, { color: theme.textMuted }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  busy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
