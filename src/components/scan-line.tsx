import { StyleSheet, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { useTheme } from "@/constants/theme";

/**
 * A line of light that passes down whatever it's laid over, to show a receipt being read. Put it inside a box with
 * `overflow: hidden`. `repeat` keeps it sweeping while Keepr waits; otherwise it passes once in `duration` ms.
 * Nothing is drawn with Reduce Motion on.
 */
export function ScanLine({ repeat = false, duration = 1400, delay = 0 }: { repeat?: boolean; duration?: number; delay?: number }) {
  const theme = useTheme();
  if (useReducedMotion()) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sweep,
        {
          // `top` is safe to animate here: the sweep is out of the layout and has no children to lay out.
          animationName: { from: { top: "-12%" }, to: { top: "100%" } },
          animationDuration: duration,
          animationDelay: delay,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: repeat ? "infinite" : 1,
          animationFillMode: "both",
        },
      ]}
    >
      <View style={[styles.glow, { backgroundColor: theme.accent }]} />
      <View style={[styles.line, { backgroundColor: theme.accent }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sweep: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "12%",
    justifyContent: "flex-end",
  },
  glow: {
    flex: 1,
    opacity: 0.12,
  },
  line: {
    height: 2,
    opacity: 0.9,
  },
});
