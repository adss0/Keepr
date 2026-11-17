import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

const light = {
  background: "#F5F5F2",
  card: "#FFFFFF",
  text: "#1C1C1A",
  textMuted: "#6B6B66",
  border: "#E2E1DC",
  accent: "#185FA5",
  accentSoft: "#E3EDF8",
  onAccent: "#FFFFFF",
  urgentBg: "#FCEBEB",
  urgentText: "#A32D2D",
  soonBg: "#FAEEDA",
  soonText: "#854F0B",
  calmBg: "#F1EFE8",
  calmText: "#5F5E5A",
};

const dark: typeof light = {
  background: "#121211",
  card: "#1E1E1C",
  text: "#F1EFE8",
  textMuted: "#A3A29C",
  border: "#33332F",
  accent: "#85B7EB",
  accentSoft: "#1B2C3F",
  onAccent: "#042C53",
  urgentBg: "#501313",
  urgentText: "#F7C1C1",
  soonBg: "#412402",
  soonText: "#FAC775",
  calmBg: "#2C2C2A",
  calmText: "#D3D1C7",
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
