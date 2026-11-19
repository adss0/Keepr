/**
 * Sends things shared into Keepr from other apps (the share sheet, via expo-sharing) to the screen that scans them.
 * Every other link opens as usual.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (new URL(path).hostname === "expo-sharing") return "/receipt/shared";
    return path;
  } catch {
    // Paths without a scheme (normal in-app links) aren't URLs.
    return path;
  }
}
