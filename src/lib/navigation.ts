import { type Href, router } from "expo-router";

/** Goes back a screen, or to `fallback` when there's nowhere to go back to (e.g. a page opened from a link). */
export function goBack(fallback: Href = "/") {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
