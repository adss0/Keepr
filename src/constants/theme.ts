import { useColorScheme } from "react-native";

const light = {
  background: "#F5F5F2",
  card: "#FFFFFF",
  text: "#1C1C1A",
  textMuted: "#6B6B66",
  border: "#E2E1DC",
  accent: "#185FA5",
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
  onAccent: "#042C53",
  urgentBg: "#501313",
  urgentText: "#F7C1C1",
  soonBg: "#412402",
  soonText: "#FAC775",
  calmBg: "#2C2C2A",
  calmText: "#D3D1C7",
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
