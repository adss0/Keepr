import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

/**
 * "Thermal print": receipt paper, near-black ink and a tomato-red accent like a till stamp.
 * Every value is a step from Radix Colors (https://www.radix-ui.com/colors, MIT licence), named alongside, so light
 * and dark stay matched and text keeps its contrast. Solid buttons and hero cards are ink (`primary`); red is kept
 * for highlights, the selected tab, links and urgent deadlines.
 */
const light = {
  background: "#F9F9F8", // sand 2
  card: "#FDFDFC", // sand 1
  text: "#21201C", // sand 12
  textMuted: "#63635E", // sand 11
  border: "#DAD9D6", // sand 6
  primary: "#21201C", // sand 12
  onPrimary: "#FDFDFC", // sand 1
  accent: "#D13415", // tomato 11
  accentSoft: "#FEEBE7", // tomato 3
  onAccent: "#FFFFFF",
  urgentBg: "#FEEBE7", // tomato 3
  urgentText: "#D13415", // tomato 11
  soonBg: "#FFF7C2", // amber 3
  soonText: "#AB6400", // amber 11
  calmBg: "#F1F0EF", // sand 3
  calmText: "#63635E", // sand 11
  trial: "#3A5BC7", // indigo 11
};

const dark: typeof light = {
  background: "#111110", // sand 1
  card: "#191918", // sand 2
  text: "#EEEEEC", // sand 12
  textMuted: "#B5B3AD", // sand 11
  border: "#3B3A37", // sand 6
  primary: "#EEEEEC", // sand 12
  onPrimary: "#111110", // sand 1
  accent: "#FF977D", // tomato 11
  accentSoft: "#391714", // tomato 3
  onAccent: "#111110",
  urgentBg: "#391714", // tomato 3
  urgentText: "#FF977D", // tomato 11
  soonBg: "#302008", // amber 3
  soonText: "#FFCA16", // amber 11
  calmBg: "#222221", // sand 3
  calmText: "#B5B3AD", // sand 11
  trial: "#9EB1FF", // indigo 11
};

export type Theme = typeof light;

/**
 * Keepr's own type: Fraunces (a soft serif) for titles and big figures, IBM Plex Mono for prices and dates, like a
 * till receipt. Body text stays in the phone's system font. Loaded in the root layout; set no fontWeight with these,
 * as each name is already one weight.
 */
export const Fonts = {
  display: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  mono: "IBMPlexMono_500Medium",
  monoBold: "IBMPlexMono_600SemiBold",
} as const;

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
