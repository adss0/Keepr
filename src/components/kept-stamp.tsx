import { useEffect } from "react";
import { type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Fonts, useTheme } from "@/constants/theme";
import { haptics } from "@/data/haptics";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * The till stamp Keepr presses onto a receipt once it's kept. With `pressed` it lands on its own after `delay`
 * (no fade, just a quick press from slightly bigger); without, it's simply there.
 */
export function KeptStamp({
  pressed = false,
  delay = 0,
  silent = false,
  style,
}: {
  pressed?: boolean;
  delay?: number;
  /** No tap as it lands, when the action that stamped it has already been felt. */
  silent?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const press = useSharedValue(pressed && !reduced ? 0 : 1);

  useEffect(() => {
    if (!pressed || reduced) return;
    // A light tap as it lands, so the stamp is felt as well as seen.
    const land = () => {
      if (!silent) haptics.selection();
    };
    press.set(
      withDelay(
        delay,
        withTiming(1, { duration: 90, easing: EASE_OUT }, (done) => {
          if (done) scheduleOnRN(land);
        }),
      ),
    );
  }, [pressed, reduced, delay, silent, press]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: press.get() > 0 ? 1 : 0,
    transform: [{ rotate: "-9deg" }, { scale: 1.12 - press.get() * 0.12 }],
  }));

  return (
    <Animated.View
      accessibilityLabel="Kept"
      style={[styles.stamp, { borderColor: theme.accent }, style, animatedStyle]}
    >
      <Text style={[styles.text, { color: theme.accent }]}>KEPT</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    borderWidth: 2.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontFamily: Fonts.monoBold,
    fontSize: 20,
    letterSpacing: 3,
  },
});
