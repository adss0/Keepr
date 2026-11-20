import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from "react-native";

import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { Button } from "@/components/form";
import { ScanLine } from "@/components/scan-line";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { haptics } from "@/data/haptics";
import { extractReceipt, pickReceiptDocument, pickReceiptPhoto, type ReceiptPhoto } from "@/data/scan-receipt";
import { errorMessage } from "@/lib/format";

type Props = {
  /** Called with the raw scan result and the photo, to fill in the form. Returns how many details it filled in. */
  onScanned: (result: unknown, photo: ReceiptPhoto) => number;
  /** Open the camera straight away, for the home screen's Scan button. Ignored on the web. */
  autoStart?: boolean;
  /** A receipt shared into Keepr from another app, scanned straight away. */
  sharedPhoto?: ReceiptPhoto;
};

/** "Scan a receipt" buttons at the top of the add form, or what's needed before scanning can work. */
export function ScanPanel({ onScanned, autoStart = false, sharedPhoto }: Props) {
  const theme = useTheme();
  const { status } = useCloud();
  const reduced = useReducedMotion();
  // The photo being read, shown small with the scan line passing over it.
  const [reading, setReading] = useState<ReceiptPhoto>();
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

  const sharedRead = useRef(false);
  useEffect(() => {
    if (!sharedPhoto || !canScan || sharedRead.current) return;
    sharedRead.current = true;
    read(sharedPhoto);
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
      if (photo) await read(photo);
    } catch (error) {
      haptics.error();
      setMessage(errorMessage(error));
    }
  }

  async function read(photo: ReceiptPhoto) {
    setMessage(undefined);
    try {
      setReading(photo);
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
      setMessage(errorMessage(error));
    } finally {
      setReading(undefined);
    }
  }

  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {reading ? (
        <View style={styles.busy}>
          {reduced ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <View style={[styles.preview, { backgroundColor: theme.background, borderColor: theme.border }]}>
              {reading.mediaType.startsWith("image/") ? (
                <Image source={{ uri: `data:${reading.mediaType};base64,${reading.base64}` }} style={styles.previewImage} />
              ) : (
                // A PDF can't be drawn as a picture here, so it gets a page of faint lines instead.
                <View style={styles.page}>
                  {[70, 90, 55, 80, 65].map((width) => (
                    <View key={width} style={[styles.pageLine, { width: `${width}%`, backgroundColor: theme.border }]} />
                  ))}
                </View>
              )}
              <ScanLine repeat />
            </View>
          )}
          <Text style={[styles.text, { color: theme.text }]}>Reading your receipt…</Text>
        </View>
      ) : (
        <>
          <Button title="Scan a receipt" variant="primary" onPress={() => scan("camera")} />
          <View style={styles.row}>
            <View style={styles.half}>
              <Button title="From photos" onPress={() => scan("library")} />
            </View>
            <View style={styles.half}>
              <Button title="From files" onPress={() => scan("document")} />
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
    gap: 14,
    paddingVertical: 4,
  },
  preview: {
    width: 56,
    height: 76,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  page: {
    flex: 1,
    padding: 8,
    gap: 6,
  },
  pageLine: {
    height: 3,
    borderRadius: 2,
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
