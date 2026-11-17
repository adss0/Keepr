import { type Href, router } from "expo-router";

/** The Receipts tab. Typed routes list the grouped home screen only as "/index", but "/" is its real address. */
export const HOME = "/" as Href;

/** Goes back a screen, or to `fallback` when there's nowhere to go back to (e.g. a page opened from a link). */
export function goBack(fallback: Href = HOME) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
