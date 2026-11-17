import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";

import { Button } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { haptics } from "@/data/haptics";
import { extractReceipt, pickReceiptDocument, pickReceiptPhoto, type ReceiptPhoto } from "@/data/scan-receipt";

type Props = {
  /** Called with the raw scan result and the photo, to fill in the form. Returns how many details it filled in. */
  onScanned: (result: unknown, photo: ReceiptPhoto) => number;
  /** Open the camera straight away, for the home screen's Scan button. Ignored on the web. */
  autoStart?: boolean;
};

/** "Scan a receipt" buttons at the top of the add form, or what's needed before scanning can work. */
export function ScanPanel({ onScanned, autoStart = false }: Props) {
  const theme = useTheme();
  const { status } = useCloud();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const autoStarted = useRef(false);
  const canScan = status !== "not_set_up";

  // Browsers only open the camera from a tap, so on the web the user taps Scan themselves.
  useEffect(() => {
    if (!autoStart || !canScan || autoStarted.current || Platform.OS === "web") return;
    autoStarted.current = true;
    const timer = setTimeout(() => scan("camera"), 300);
    return () => clearTimeout(timer);
  });

  if (status === "not_set_up") {
    return (
      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Scan a receipt</Text>
        <Text style={[styles.text, { color: theme.textMuted }]}>
          Take a photo (or pick a PDF or screenshot) and Keepr fills in the product, shop, price, date and payment for you. Scanning needs a
          one-time setup first: a free Supabase project and a free Gemini API key (see docs/cloud-setup.md). Until then,
          fill in the details below by hand.
        </Text>
      </View>
    );
  }

  async function scan(source: "camera" | "library" | "document") {
    setMessage(undefined);
    try {
      const photo = source === "document" ? await pickReceiptDocument() : await pickReceiptPhoto(source);
      if (!photo) return;
      setBusy(true);
      const result = await extractReceipt(photo);
      if ((result as { is_receipt?: boolean } | null)?.is_receipt === false) {
        setMessage("That doesn't look like a receipt. Try another photo.");
        return;
      }
      const filled = onScanned(result, photo);
      if (filled > 0) haptics.success();
      setMessage(
        filled > 0
          ? `Filled in ${filled} ${filled === 1 ? "detail" : "details"} from your receipt. Check them, then save.`
          : "Couldn't read any details. Try a clearer, flatter photo, or fill them in below.",
      );
    } catch (error) {
      haptics.error();
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
          <View style={styles.row}>
            <View style={styles.half}>
              <Button title="Choose a photo" onPress={() => scan("library")} />
            </View>
            <View style={styles.half}>
              <Button title="PDF or screenshot" onPress={() => scan("document")} />
            </View>
          </View>
        </>
      )}
      {message && (
        <Animated.Text key={message} entering={FadeIn.duration(200)} style={[styles.text, { color: theme.textMuted }]}>
          {message}
        </Animated.Text>
      )}
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  half: {
    flex: 1,
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
