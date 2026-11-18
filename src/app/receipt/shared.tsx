import { router } from "expo-router";
import { clearSharedPayloads, useIncomingShare } from "expo-sharing";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { readSharedReceipt, setSharedReceipt } from "@/data/shared-receipt";
import { HOME } from "@/lib/navigation";

/**
 * Where a photo, screenshot or PDF shared into Keepr from another app lands (see +native-intent).
 * It's handed straight to Add receipt, which scans it.
 */
export default function SharedReceiptScreen() {
  const theme = useTheme();
  const { resolvedSharedPayloads, isResolving, error } = useIncomingShare();
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    if (isResolving) return;
    let cancelled = false;
    readSharedReceipt(resolvedSharedPayloads)
      .then((photo) => {
        if (cancelled) return;
        clearSharedPayloads();
        if (!photo) {
          setProblem("Keepr can read photos, screenshots and PDFs of receipts. Share one of those instead.");
          return;
        }
        setSharedReceipt(photo);
        router.replace({ pathname: "/receipt/new", params: { scan: "shared" } });
      })
      .catch((readError: unknown) => {
        if (!cancelled) setProblem(readError instanceof Error ? readError.message : String(readError));
      });
    return () => {
      cancelled = true;
    };
  }, [isResolving, resolvedSharedPayloads]);

  const message = problem ?? (error ? "Couldn't open what was shared. Try sharing it again." : undefined);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {message ? (
        <>
          <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
          <Button title="Go to receipts" onPress={() => router.replace(HOME)} />
        </>
      ) : (
        <>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.text, { color: theme.textMuted }]}>Opening your receipt…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
});
