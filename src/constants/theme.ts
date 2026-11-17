import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

/** Warm receipt-paper neutrals, ink-dark text and a deep "kept safe" green. */
const light = {
  background: "#F3F0E8",
  card: "#FFFDF8",
  text: "#1A1915",
  textMuted: "#6E6A60",
  border: "#E4DED2",
  accent: "#1E6B52",
  accentSoft: "#DDEDE4",
  onAccent: "#FFFFFF",
  urgentBg: "#FBE7E3",
  urgentText: "#A8321F",
  soonBg: "#F8EBD3",
  soonText: "#8A5A0B",
  calmBg: "#EFEBE1",
  calmText: "#5F5B52",
  trial: "#6B4FBF",
};

const dark: typeof light = {
  background: "#0F110F",
  card: "#1A1D1A",
  text: "#F2EFE7",
  textMuted: "#A29E93",
  border: "#2C302B",
  accent: "#6FD1A6",
  accentSoft: "#183128",
  onAccent: "#062418",
  urgentBg: "#4A1712",
  urgentText: "#F6B8AD",
  soonBg: "#3E2A06",
  soonText: "#F3C978",
  calmBg: "#262823",
  calmText: "#D2CEC3",
  trial: "#C3AEFF",
};

export type Theme = typeof light;

export type Appearance = "system" | "light" | "dark";

/** The user's appearance choice from Settings. Provided by SettingsProvider. */
export const AppearanceContext = createContext<Appearance>("system");

/** "light" or "dark", following the user's choice in Settings, or the phone's setting. */
export function useColorMode(): "light" | "dark" {
  const appearance = useContext(AppearanceContext);
  const system = useColorScheme();
  if (appearance !== "system") return appearance;
  return system === "dark" ? "dark" : "light";
}

export function useTheme(): Theme {
  return useColorMode() === "dark" ? dark : light;
}
