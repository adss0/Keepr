import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { type PdfToPreview, setPdfPreviewer } from "@/data/pdf-preview";

/** Shows a PDF Keepr made, in the browser's own PDF viewer, with Download and Close, before anything is saved. */
export function PdfPreview() {
  const theme = useTheme();
  const [pdf, setPdf] = useState<PdfToPreview & { url: string }>();

  useEffect(() => {
    setPdfPreviewer((next) =>
      setPdf({ ...next, url: URL.createObjectURL(new Blob([next.bytes as BlobPart], { type: "application/pdf" })) }),
    );
    return () => setPdfPreviewer(undefined);
  }, []);

  // Free the file once it's closed (or replaced by another).
  useEffect(() => (pdf ? () => URL.revokeObjectURL(pdf.url) : undefined), [pdf]);

  function download() {
    if (!pdf) return;
    const link = document.createElement("a");
    link.href = pdf.url;
    link.download = pdf.fileName;
    link.click();
  }

  return (
    <Modal visible={!!pdf} animationType="fade" onRequestClose={() => setPdf(undefined)}>
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.bar, { borderBottomColor: theme.border }]}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {pdf?.fileName}
          </Text>
          <View style={styles.buttons}>
            <Button title="Close" variant="ghost" onPress={() => setPdf(undefined)} />
            <Button title="Download" variant="primary" onPress={download} />
          </View>
        </View>
        {pdf && <iframe title="PDF preview" src={pdf.url} style={{ flex: 1, border: 0, width: "100%" }} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
