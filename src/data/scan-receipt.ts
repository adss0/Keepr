import { FunctionsHttpError } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/data/supabase";

export type ReceiptPhoto = { base64: string; mediaType: string };

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

/** Sends the photo to the extract-receipt function, which reads it with Claude. Returns its raw JSON. */
export async function extractReceipt(photo: ReceiptPhoto): Promise<unknown> {
  if (!supabase) throw new Error("Receipt scanning isn't set up yet.");
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
