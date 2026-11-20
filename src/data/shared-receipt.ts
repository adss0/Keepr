import { File } from "expo-file-system";
import type { ResolvedSharePayload } from "expo-sharing";

import { type ReceiptPhoto, MAX_DOCUMENT_BYTES } from "@/data/scan-receipt";

/** A receipt shared into Keepr from another app, waiting for the Add receipt screen to pick it up. */
let pending: ReceiptPhoto | undefined;

export function setSharedReceipt(photo: ReceiptPhoto) {
  pending = photo;
}

/** The shared receipt, once: later calls get nothing, so it isn't scanned twice. */
export function takeSharedReceipt(): ReceiptPhoto | undefined {
  const photo = pending;
  pending = undefined;
  return photo;
}

/** The first shared photo or PDF Keepr can scan. Undefined if there's none; throws if it's too big to scan. */
export async function readSharedReceipt(payloads: ResolvedSharePayload[]): Promise<ReceiptPhoto | undefined> {
  const payload = payloads.find(
    (item) => item.contentUri && (item.contentType === "image" || item.contentMimeType === "application/pdf"),
  );
  if (!payload?.contentUri) return undefined;
  if (payload.contentSize !== null && payload.contentSize > MAX_DOCUMENT_BYTES) {
    throw new Error("That file is over 5 MB, too big to scan. Try a screenshot instead.");
  }
  const base64 = await new File(payload.contentUri).base64();
  return { base64, mediaType: payload.contentMimeType ?? "image/jpeg", source: "Shared from another app" };
}
