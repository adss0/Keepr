import { type ReactNode, useEffect, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Parts that have already played their entrance since the app started. */
const played = new Set<string>();

/**
 * Fades a part of the screen in the first time it appears after the app opens, then never again,
 * so switching tabs or views stays instant. Reduced motion is respected by Reanimated.
 */
export function Intro({
  id,
  rise = false,
  delay = 0,
  style,
  children,
}: {
  id: string;
  rise?: boolean;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [animate] = useState(() => !played.has(id));
  useEffect(() => {
    played.add(id);
  }, [id]);
  const entering = rise
    ? FadeInDown.duration(480)
        .delay(delay)
        .easing(EASE_OUT)
        .withInitialValues({ transform: [{ translateY: 14 }] })
    : FadeIn.duration(360).delay(delay).easing(EASE_OUT);
  return (
    <Animated.View style={style} entering={animate ? entering : undefined}>
      {children}
    </Animated.View>
  );
}
