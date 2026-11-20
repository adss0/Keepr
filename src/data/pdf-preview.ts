/** A PDF waiting to be looked at before it's downloaded (the website only; phones show it in the share sheet). */
export type PdfToPreview = { bytes: Uint8Array; fileName: string };

let show: ((pdf: PdfToPreview) => void) | undefined;

/** Called by the preview on screen, so PDFs made anywhere in the app can open in it. */
export function setPdfPreviewer(previewer: ((pdf: PdfToPreview) => void) | undefined) {
  show = previewer;
}

/** Opens the PDF in the preview. False if there's no preview on screen, so the caller can download it instead. */
export function previewPdf(pdf: PdfToPreview): boolean {
  if (!show) return false;
  show(pdf);
  return true;
}
