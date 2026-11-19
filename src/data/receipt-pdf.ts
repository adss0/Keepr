import { File } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { isPdf, localPhotoUri, mediaTypeOf, PHOTO_BUCKET } from "@/data/receipt-photos";
import { supabase } from "@/data/supabase";
import { receiptPhotosHtml, receiptReportHtml, receiptsReportHtml } from "@/lib/receipt-report";
import type { Receipt } from "@/types/receipt";

/** The photo as something an HTML page can show: inlined from the phone, or the web link as it is. */
async function photoSource(receipt: Receipt, photoUri: string | undefined): Promise<string | undefined> {
  if (!receipt.photo || !photoUri || isPdf(receipt.photo)) return undefined;
  if (photoUri.startsWith("http") || photoUri.startsWith("data:")) return photoUri;
  const base64 = await new File(photoUri).base64();
  return `data:${mediaTypeOf(receipt.photo)};base64,${base64}`;
}

/**
 * Saves the receipt as a PDF and opens the share sheet, to email it or attach it to a claim: the photo of the
 * receipt filling the page, the file itself if it was a PDF already, or its details if there's no photo.
 * Browsers open their print dialog instead, where "Save as PDF" is one of the options.
 */
export async function shareReceiptPdf(receipt: Receipt, today: string, photoUri?: string): Promise<void> {
  if (isPdf(receipt.photo) && photoUri) {
    if (Platform.OS === "web") {
      window.open(photoUri, "_blank", "noopener");
      return;
    }
    await Sharing.shareAsync(photoUri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Share receipt PDF" });
    return;
  }
  const photo = await photoSource(receipt, photoUri);
  const html = photo ? receiptPhotosHtml([receipt], today, { [receipt.id]: photo }) : receiptReportHtml(receipt, today);
  if (Platform.OS === "web") {
    await printOnWeb(html);
    return;
  }
  await sharePdf(html, "Share receipt PDF");
}

/**
 * One PDF of the chosen receipts' photos, a page each, shared like a single receipt's PDF. Receipts without a
 * photo (or kept as a PDF) get a page of their details. `folderFor` gives the cloud folder of each one's owner.
 */
export async function shareReceiptPhotosPdf(
  receipts: Receipt[],
  today: string,
  folderFor: (receipt: Receipt) => string | undefined,
): Promise<void> {
  const photos: Record<string, string> = {};
  for (const receipt of receipts) {
    const source = await reportPhoto(receipt, folderFor(receipt)).catch(() => undefined);
    if (source) photos[receipt.id] = source;
  }
  const html = receiptPhotosHtml(receipts, today, photos);
  if (Platform.OS === "web") {
    await printOnWeb(html);
    return;
  }
  await sharePdf(html, "Share receipts PDF");
}

/**
 * Prints `html` from the browser, whose print dialog has "Save as PDF". expo-print's web version ignores the HTML
 * and prints the app's screen, so the page goes into a hidden frame (photos loaded) and that frame is printed.
 */
function printOnWeb(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0;";
    frame.onload = () => {
      const view = frame.contentWindow;
      if (!view) {
        frame.remove();
        reject(new Error("The browser blocked printing."));
        return;
      }
      // Leave the frame until printing is over; some browsers return from print() before the dialog closes.
      view.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 1000));
      view.focus();
      view.print();
      resolve();
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
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
  withDeadlines = false,
): Promise<void> {
  const photos: Record<string, string> = {};
  if (withPhotos) {
    for (const receipt of receipts) {
      const source = await reportPhoto(receipt, folderFor(receipt)).catch(() => undefined);
      if (source) photos[receipt.id] = source;
    }
  }
  const html = receiptsReportHtml(receipts, today, period, photos, withDeadlines);
  if (Platform.OS === "web") {
    await printOnWeb(html);
    return;
  }
  await sharePdf(html, "Share receipts PDF");
}
