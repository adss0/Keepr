import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

/** App icons: SF Symbols on iOS, Material Symbols on Android and the web. */
export const ICONS = {
  receipts: { ios: "doc.text", android: "receipt_long", web: "receipt_long" },
  calendar: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
  subscriptions: { ios: "arrow.triangle.2.circlepath", android: "autorenew", web: "autorenew" },
  insights: { ios: "chart.bar", android: "bar_chart", web: "bar_chart" },
  settings: { ios: "gearshape", android: "settings", web: "settings" },
  add: { ios: "plus", android: "add", web: "add" },
  camera: { ios: "camera", android: "photo_camera", web: "photo_camera" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  chevronRight: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
  chevronLeft: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  share: { ios: "square.and.arrow.up", android: "ios_share", web: "ios_share" },
  account: { ios: "person.crop.circle", android: "account_circle", web: "account_circle" },
  bell: { ios: "bell", android: "notifications", web: "notifications" },
  close: { ios: "xmark.circle.fill", android: "cancel", web: "cancel" },
  people: { ios: "person.2", android: "group", web: "group" },
  viewList: { ios: "list.bullet", android: "view_list", web: "view_list" },
  viewGrid: { ios: "square.grid.2x2", android: "grid_view", web: "grid_view" },
  viewTimeline: { ios: "clock", android: "timeline", web: "timeline" },
  sort: { ios: "arrow.up.arrow.down", android: "swap_vert", web: "swap_vert" },
} as const;

export type IconName = keyof typeof ICONS;

type Props = Omit<ComponentProps<typeof SymbolView>, "name"> & { name: IconName; color?: string };

export function Icon({ name, color, size = 22, ...props }: Props) {
  // Typed loosely: each platform has its own symbol set, and these names are checked by eye against both.
  return <SymbolView name={ICONS[name] as never} tintColor={color} size={size} {...props} />;
}
