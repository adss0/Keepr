import { File } from "expo-file-system";
import { Platform } from "react-native";

import { localPhotoUri, PHOTO_BUCKET } from "@/data/receipt-photos";
import { sharePdf } from "@/data/share-csv";
import { supabase } from "@/data/supabase";
import { type Evidence, receiptPhotosPdf, receiptsReportPdf } from "@/lib/receipt-pdf-doc";
import type { Receipt } from "@/types/receipt";

/** Where a receipt's photo or file is backed up: the folder of whoever added it. */
type FolderFor = (receipt: Receipt) => string | undefined;

const KINDS: Record<string, Evidence["kind"]> = { pdf: "pdf", png: "png", jpg: "jpg", jpeg: "jpg" };

/** The bytes of a receipt's photo or file: from the phone if it's there, otherwise the backed-up copy. */
async function fileBytes(name: string, folder: string | undefined): Promise<Blob | Uint8Array | undefined> {
  const local = localPhotoUri(name);
  if (local) return new File(local).bytes();
  if (!supabase || !folder) return undefined;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(`${folder}/${name}`);
  if (error) throw error;
  return data ?? undefined;
}

/** Turns a WebP or HEIC photo into a JPEG, which PDFs can hold. Browsers only: phones save photos as JPEGs anyway. */
async function toJpeg(blob: Blob): Promise<Uint8Array | undefined> {
  if (Platform.OS !== "web") return undefined;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return jpeg ? new Uint8Array(await jpeg.arrayBuffer()) : undefined;
}

/** A receipt's proof of purchase, ready for a PDF. Undefined if it has none or it can't be loaded or used. */
async function loadEvidence(receipt: Receipt, folder: string | undefined): Promise<Evidence | undefined> {
  if (!receipt.photo) return undefined;
  const loaded = await fileBytes(receipt.photo, folder);
  if (!loaded) return undefined;
  const kind = KINDS[receipt.photo.split(".").pop()?.toLowerCase() ?? ""];
  if (kind) return { kind, bytes: loaded instanceof Uint8Array ? loaded : new Uint8Array(await loaded.arrayBuffer()) };
  const jpeg = loaded instanceof Blob ? await toJpeg(loaded) : undefined;
  return jpeg ? { kind: "jpg", bytes: jpeg } : undefined;
}

/** Every receipt's proof of purchase, by id. One that fails to load is left out rather than stopping the PDF. */
async function loadAllEvidence(receipts: Receipt[], folderFor: FolderFor): Promise<Record<string, Evidence>> {
  const evidence: Record<string, Evidence> = {};
  for (const receipt of receipts) {
    const loaded = await loadEvidence(receipt, folderFor(receipt)).catch(() => undefined);
    if (loaded) evidence[receipt.id] = loaded;
  }
  return evidence;
}

/** "Energy drink" → "keepr-energy-drink", for file names. */
function fileName(...parts: string[]): string {
  const slug = parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `keepr-${slug || "receipt"}.pdf`;
}

/**
 * Saves the receipt as a PDF, to email it or attach it to a claim: its photo filling the page, the file itself if it
 * was a PDF already, or its details if there's neither. Phones open the share sheet; browsers download the file.
 */
export async function shareReceiptPdf(receipt: Receipt, today: string, folder: string | undefined): Promise<void> {
  const evidence = await loadEvidence(receipt, folder).catch(() => undefined);
  const bytes =
    evidence?.kind === "pdf"
      ? evidence.bytes
      : await receiptPhotosPdf([receipt], today, evidence ? { [receipt.id]: evidence } : {});
  await sharePdf(bytes, fileName(receipt.product, receipt.retailer), "Share receipt PDF");
}

/** The chosen receipts' proof of purchase as one PDF: photos a page each, PDF files' own pages, else the details. */
export async function shareReceiptPhotosPdf(receipts: Receipt[], today: string, folderFor: FolderFor): Promise<void> {
  const bytes = await receiptPhotosPdf(receipts, today, await loadAllEvidence(receipts, folderFor));
  await sharePdf(bytes, fileName(`${receipts.length} receipts`, today), "Share receipts PDF");
}

/**
 * Several receipts as one PDF: a summary with the total for `period`, then a page each. With `withProof`, each page
 * has the receipt's photo, and a receipt kept as a PDF file has that file's pages straight after it.
 */
export async function shareReceiptsPdf(
  receipts: Receipt[],
  today: string,
  period: string,
  withProof: boolean,
  folderFor: FolderFor,
  withDeadlines = false,
): Promise<void> {
  const evidence = withProof ? await loadAllEvidence(receipts, folderFor) : {};
  const bytes = await receiptsReportPdf({ receipts, today, period, evidence, withDeadlines });
  await sharePdf(bytes, fileName("receipts", period), "Share receipts PDF");
}
