import { Platform, useWindowDimensions } from "react-native";

/** From this window width the web (and the Windows app) uses the desktop layout: a sidebar and wider pages. */
export const DESKTOP_MIN_WIDTH = 900;

/** Widest a tab page grows; past it the page sits centred beside the sidebar. */
export const DESKTOP_PAGE_WIDTH = 1080;

/** Widest a single receipt, form or settings page grows on the desktop: wider is hard to read. */
export const DESKTOP_DETAIL_WIDTH = 720;

export function useDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
}

/** A column's width in a grid of `columns`, with a 3% gap between columns. */
export function columnWidth(columns: number): `${number}%` {
  return `${(100 - (columns - 1) * 3) / columns}%`;
}
