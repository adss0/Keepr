import { FunctionsHttpError } from "@supabase/supabase-js";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import type { ReceiptPhoto } from "@/data/receipt-photos";
import { supabase } from "@/data/supabase";

export type { ReceiptPhoto };

/** Lets the user take or choose a photo of a receipt. Undefined if they cancel. */
export async function pickReceiptPhoto(source: "camera" | "library"): Promise<ReceiptPhoto | undefined> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.5, base64: true };

  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Allow camera access in Settings to scan receipts.");
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return undefined;

  const asset = result.assets[0];
  if (!asset.base64) throw new Error("Couldn't read that photo. Try another one.");
  return { base64: asset.base64, mediaType: asset.mimeType ?? "image/jpeg" };
}

/** The scan function accepts up to about 5 MB. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** Lets the user pick a PDF or screenshot of a receipt or order confirmation. Undefined if they cancel. */
export async function pickReceiptDocument(): Promise<ReceiptPhoto | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return undefined;

  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > MAX_DOCUMENT_BYTES) {
    throw new Error("That file is over 5 MB. Try a smaller PDF or a screenshot.");
  }
  const mediaType = asset.mimeType ?? (asset.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png");
  // Browsers hand over the file as base64 already; on phones it's read from the copy in the cache.
  const base64 = Platform.OS === "web" ? asset.base64?.replace(/^data:[^,]*,/, "") : await new File(asset.uri).base64();
  if (!base64) throw new Error("Couldn't read that file. Try another one.");
  return { base64, mediaType };
}

/** Sends the photo to the extract-receipt function, which reads it with Google Gemini. Returns its raw JSON. */
export async function extractReceipt(photo: ReceiptPhoto): Promise<unknown> {
  if (!supabase) throw new Error("Receipt scanning isn't set up yet.");
  // Signed-out users get an anonymous Supabase session, so the function can still tell real app users from bots.
  const { data: current } = await supabase.auth.getSession();
  if (!current.session) {
    const { error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) throw new Error("Couldn't start scanning. Sign in, or try again later.");
  }
  const { data, error } = await supabase.functions.invoke("extract-receipt", {
    body: { image: photo.base64, mediaType: photo.mediaType },
  });
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => undefined);
    throw new Error(body?.error ?? "Couldn't scan that receipt.");
  }
  if (error) throw new Error("Couldn't reach the scanning service. Check your connection.");
  return data;
}
