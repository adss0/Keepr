import { File } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { isPdf, localPhotoUri, mediaTypeOf, PHOTO_BUCKET } from "@/data/receipt-photos";
import { supabase } from "@/data/supabase";
import { receiptReportHtml, receiptsReportHtml } from "@/lib/receipt-report";
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
  await sharePdf(html, "Share receipt PDF");
}

async function sharePdf(html: string, dialogTitle: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle });
}

/** A receipt photo for a report: inlined from the phone, or a short-lived link to the backed-up copy. */
async function reportPhoto(receipt: Receipt, folder: string | undefined): Promise<string | undefined> {
  if (!receipt.photo || isPdf(receipt.photo)) return undefined;
  const local = localPhotoUri(receipt.photo);
  if (local) return photoSource(receipt, local);
  if (!supabase || !folder) return undefined;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(`${folder}/${receipt.photo}`, 60 * 60);
  return data?.signedUrl;
}

/**
 * One PDF of several receipts (a summary with the total, then a page each) for `period`, shared like a single
 * receipt's PDF. With `withPhotos`, each receipt's photo is added; `folderFor` gives the cloud folder of its owner.
 * Photos that can't be loaded are left out rather than stopping the export.
 */
export async function shareReceiptsPdf(
  receipts: Receipt[],
  today: string,
  period: string,
  withPhotos: boolean,
  folderFor: (receipt: Receipt) => string | undefined,
): Promise<void> {
  const photos: Record<string, string> = {};
  if (withPhotos) {
    for (const receipt of receipts) {
      const source = await reportPhoto(receipt, folderFor(receipt)).catch(() => undefined);
      if (source) photos[receipt.id] = source;
    }
  }
  const html = receiptsReportHtml(receipts, today, period, photos);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  await sharePdf(html, "Share receipts PDF");
}
