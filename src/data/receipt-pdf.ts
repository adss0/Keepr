import { File } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { isPdf, mediaTypeOf } from "@/data/receipt-photos";
import { receiptReportHtml } from "@/lib/receipt-report";
import type { Receipt } from "@/types/receipt";

/** The photo as something an HTML page can show: inlined from the phone, or the web link as it is. */
async function photoSource(receipt: Receipt, photoUri: string | undefined): Promise<string | undefined> {
  if (!receipt.photo || !photoUri || isPdf(receipt.photo)) return undefined;
  if (photoUri.startsWith("http") || photoUri.startsWith("data:")) return photoUri;
  const base64 = await new File(photoUri).base64();
  return `data:${mediaTypeOf(receipt.photo)};base64,${base64}`;
}

/**
 * Makes a PDF of the receipt (details, deadlines and photo) and opens the share sheet, to email it or
 * attach it to a claim. Browsers open their print dialog instead, where "Save as PDF" is one of the options.
 */
export async function shareReceiptPdf(receipt: Receipt, today: string, photoUri?: string): Promise<void> {
  const html = receiptReportHtml(receipt, today, await photoSource(receipt, photoUri));
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Share receipt PDF" });
}
