import type { Receipt } from "@/types/receipt";

/** Where a receipt's file came from, for people to read: "From camera", "From file: order.pdf". */
export function evidenceSource(source: string): string {
  return source.startsWith("Shared") ? source : `From ${source[0].toLowerCase()}${source.slice(1)}`;
}

/** What proof of purchase a receipt has, for its PDF page: the kind of file and where it came from. */
export function evidenceText(receipt: Pick<Receipt, "photo" | "photoSource">): string {
  if (!receipt.photo) return "None kept";
  const kind = receipt.photo.toLowerCase().endsWith(".pdf") ? "Original PDF file, kept in Keepr" : "Photo of the receipt";
  return receipt.photoSource ? `${kind}, ${evidenceSource(receipt.photoSource).toLowerCase()}` : kind;
}
