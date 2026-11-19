import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { supabase } from "@/data/supabase";

/** A photo (or PDF) of a receipt, as picked or scanned. */
export type ReceiptPhoto = {
  base64: string;
  mediaType: string;
  /** Where it came from, kept as evidence: "Camera", "Photo library", "File: order.pdf", "Shared from another app". */
  source?: string;
};

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

/** Photos are kept as files on the phone. Browsers have no app folder, so the web keeps them only in the cloud. */
export const photosStoredLocally = Platform.OS !== "web";

/** Whether photos can be kept here: always on a phone; on the web only when signed in, as they go straight to the cloud. */
export function canKeepPhotos(userId: string | undefined): boolean {
  return photosStoredLocally || (!!supabase && !!userId);
}

/**
 * Keeps a receipt's photo and returns its name to save on the receipt: a file on the phone (backed up on the next
 * sync), or on the web an upload straight to `folder` in the cloud. Undefined when it can't be kept here.
 * `previous` is the photo it replaces, removed from the cloud on the web.
 */
export async function keepPhoto(
  receiptId: string,
  photo: ReceiptPhoto,
  folder: string | undefined,
  previous?: string,
): Promise<string | undefined> {
  if (photosStoredLocally) return savePhoto(receiptId, photo);
  if (!supabase || !folder) return undefined;
  // A new name each time, so browsers show the new photo rather than a cached copy of the old one.
  const name = `${receiptId}-${Date.now().toString(36)}.${EXTENSIONS[photo.mediaType] ?? "jpg"}`;
  const bytes = Uint8Array.from(atob(photo.base64), (char) => char.charCodeAt(0));
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(`${folder}/${name}`, bytes, { contentType: photo.mediaType, upsert: true });
  if (error) throw new Error(`Couldn't upload the photo: ${error.message}`);
  if (previous) await deleteRemotePhotos([{ folder, name: previous }]);
  return name;
}

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

/** Saves the photo for a receipt on the phone and returns its file name. */
function savePhoto(receiptId: string, photo: ReceiptPhoto): string {
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
      return kept.length === uploaded.size ? undefined : AsyncStorage.setItem(UPLOADED_KEY, JSON.stringify(kept));
    })
    .catch((error: unknown) => console.warn("Couldn't update photo backup list", error));
}

async function readUploaded(): Promise<Set<string>> {
  const stored = await AsyncStorage.getItem(UPLOADED_KEY).catch(() => null);
  return new Set(stored ? (JSON.parse(stored) as string[]) : []);
}

/** A photo in the cloud: `folder` is the user id of whoever added the receipt. */
export type RemotePhoto = { folder: string; name: string };

/** Backs up photos that are on this phone but not in the cloud yet. Failures are retried on the next sync. */
export async function uploadNewPhotos(photos: RemotePhoto[]): Promise<void> {
  if (!supabase || !photosStoredLocally) return;
  const uploaded = await readUploaded();
  let changed = false;
  for (const { folder, name } of photos) {
    const key = `${folder}/${name}`;
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
export async function deleteRemotePhotos(photos: RemotePhoto[]): Promise<void> {
  if (!supabase || photos.length === 0) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(photos.map(({ folder, name }) => `${folder}/${name}`));
  if (error) console.warn("Couldn't delete backed-up photos", error);
}

/**
 * A URI to show a receipt's photo: the file on the phone, or else the backed-up copy
 * (downloaded to the phone, or a short-lived link on the web). Undefined while loading or if there's none.
 * `folder` is the user id of whoever added the receipt (undefined when signed out).
 */
export function usePhotoUri(name: string | undefined, folder: string | undefined): string | undefined {
  const [remoteUri, setRemoteUri] = useState<string>();
  const local = name ? localPhotoUri(name) : undefined;

  useEffect(() => {
    if (!name || local || !folder || !supabase) return;
    let cancelled = false;
    const client = supabase;
    (async () => {
      const key = `${folder}/${name}`;
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
  }, [name, local, folder]);

  return local ?? remoteUri;
}
