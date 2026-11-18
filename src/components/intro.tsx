import { type ReactNode, useEffect, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useLaunchDone } from "@/components/launch-receipt";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Parts that have already played their entrance since the app started. */
const played = new Set<string>();

/**
 * Fades a part of the screen in the first time it appears after the app opens, once the opening receipt clears,
 * then never again, so switching tabs or views stays instant. Shown at once with Reduce Motion on.
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
  const reduced = useReducedMotion();
  const [animate] = useState(() => !played.has(id) && !reduced);
  const launched = useLaunchDone();
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    played.add(id);
  }, [id]);

  useEffect(() => {
    if (!animate || !launched) return;
    progress.set(withDelay(delay, withTiming(1, { duration: rise ? 480 : 360, easing: EASE_OUT })));
  }, [animate, launched, delay, rise, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: rise ? (1 - progress.get()) * 14 : 0 }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
