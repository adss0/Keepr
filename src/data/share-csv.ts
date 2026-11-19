import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

type FileType = { mimeType: string; uti: string; dialogTitle: string };

/** Saves `content` as a file and opens the share sheet (phone) or downloads it (web). */
async function shareFile(content: string | Uint8Array, fileName: string, type: FileType): Promise<void> {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([content as BlobPart], { type: type.mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    // Give the browser a moment to start the download before freeing the file.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device");
  }
  await Sharing.shareAsync(file.uri, { mimeType: type.mimeType, UTI: type.uti, dialogTitle: type.dialogTitle });
}

/** Saves `csv` as a file and opens the share sheet (phone) or downloads it (web). */
export function shareCsv(csv: string, fileName: string): Promise<void> {
  return shareFile(csv, fileName, {
    mimeType: "text/csv",
    uti: "public.comma-separated-values-text",
    dialogTitle: "Export receipts",
  });
}

/** Saves an Excel workbook and opens the share sheet (phone) or downloads it (web). */
export function shareXlsx(bytes: Uint8Array, fileName: string): Promise<void> {
  return shareFile(bytes, fileName, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    uti: "org.openxmlformats.spreadsheetml.sheet",
    dialogTitle: "Export spending",
  });
}
