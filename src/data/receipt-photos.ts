import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { supabase } from "@/data/supabase";

/** A photo (or PDF) of a receipt, as picked or scanned. */
export type ReceiptPhoto = { base64: string; mediaType: string };

/** Private Supabase Storage bucket. Objects live at "<user id>/<file name>". */
export const PHOTO_BUCKET = "receipt-photos";
const UPLOADED_KEY = "keepr.uploadedPhotos.v1";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/** Photos are kept as files on the phone. Browsers have no app folder, so the web only shows backed-up photos. */
export const photosStoredLocally = Platform.OS !== "web";

export function isPdf(name: string | undefined): boolean {
  return name?.toLowerCase().endsWith(".pdf") ?? false;
}

export function mediaTypeOf(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return Object.entries(EXTENSIONS).find(([, value]) => value === ext)?.[0] ?? "image/jpeg";
}

function photoDirectory(): Directory {
  const directory = new Directory(Paths.document, "receipt-photos");
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function photoFile(name: string): File {
  return new File(photoDirectory(), name);
}

/** Saves the photo for a receipt on the phone. Returns its file name, or undefined on the web. */
export function savePhoto(receiptId: string, photo: ReceiptPhoto): string | undefined {
  if (!photosStoredLocally) return undefined;
  const name = `${receiptId}.${EXTENSIONS[photo.mediaType] ?? "jpg"}`;
  const file = photoFile(name);
  if (file.exists) file.delete();
  file.create();
  file.write(photo.base64, { encoding: "base64" });
  forgetUpload(name);
  return name;
}

/** The photo's file on the phone, if it's there. */
export function localPhotoUri(name: string): string | undefined {
  if (!photosStoredLocally) return undefined;
  const file = photoFile(name);
  return file.exists ? file.uri : undefined;
}

/** Removes photo files that no receipt uses any more (for example after a delete). */
export function removeUnusedPhotos(usedNames: Set<string>) {
  if (!photosStoredLocally) return;
  try {
    for (const entry of photoDirectory().list()) {
      if (entry instanceof File && !usedNames.has(entry.name)) entry.delete();
    }
  } catch (error) {
    console.warn("Couldn't tidy up receipt photos", error);
  }
}

/** A replaced photo keeps its name, so forget that it was backed up, and the next sync uploads the new one. */
function forgetUpload(name: string) {
  readUploaded()
    .then((uploaded) => {
      const kept = [...uploaded].filter((key) => !key.endsWith(`/${name}`));
      if (kept.length !== uploaded.size) return AsyncStorage.setItem(UPLOADED_KEY, JSON.stringify(kept));
    })
    .catch((error: unknown) => console.warn("Couldn't update photo backup list", error));
}

async function readUploaded(): Promise<Set<string>> {
  const stored = await AsyncStorage.getItem(UPLOADED_KEY).catch(() => null);
  return new Set(stored ? (JSON.parse(stored) as string[]) : []);
}

/** Backs up photos that are on this phone but not in the cloud yet. Failures are retried on the next sync. */
export async function uploadNewPhotos(userId: string, names: string[]): Promise<void> {
  if (!supabase || !photosStoredLocally) return;
  const uploaded = await readUploaded();
  let changed = false;
  for (const name of names) {
    const key = `${userId}/${name}`;
    if (uploaded.has(key)) continue;
    const file = photoFile(name);
    if (!file.exists) continue;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(key, await file.bytes(), { contentType: mediaTypeOf(name), upsert: true });
    if (error) {
      console.warn(`Couldn't back up photo ${name}`, error);
      continue;
    }
    uploaded.add(key);
    changed = true;
  }
  if (changed) await AsyncStorage.setItem(UPLOADED_KEY, JSON.stringify([...uploaded]));
}

/** Deletes backed-up photos of receipts that were deleted. */
export async function deleteRemotePhotos(userId: string, names: string[]): Promise<void> {
  if (!supabase || names.length === 0) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(names.map((name) => `${userId}/${name}`));
  if (error) console.warn("Couldn't delete backed-up photos", error);
}

/**
 * A URI to show a receipt's photo: the file on the phone, or else the backed-up copy
 * (downloaded to the phone, or a short-lived link on the web). Undefined while loading or if there's none.
 */
export function usePhotoUri(name: string | undefined, userId: string | undefined): string | undefined {
  const [remoteUri, setRemoteUri] = useState<string>();
  const local = name ? localPhotoUri(name) : undefined;

  useEffect(() => {
    if (!name || local || !userId || !supabase) return;
    let cancelled = false;
    const client = supabase;
    (async () => {
      const key = `${userId}/${name}`;
      if (photosStoredLocally) {
        const { data, error } = await client.storage.from(PHOTO_BUCKET).download(key);
        if (error || !data) return;
        const file = photoFile(name);
        if (!file.exists) file.create();
        file.write(new Uint8Array(await data.arrayBuffer()));
        if (!cancelled) setRemoteUri(file.uri);
      } else {
        const { data } = await client.storage.from(PHOTO_BUCKET).createSignedUrl(key, 60 * 60);
        if (!cancelled && data) setRemoteUri(data.signedUrl);
      }
    })().catch((error: unknown) => console.warn("Couldn't load receipt photo", error));
    return () => {
      cancelled = true;
    };
  }, [name, local, userId]);

  return local ?? remoteUri;
}
