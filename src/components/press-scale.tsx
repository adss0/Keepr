import { type ReactNode, useState } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** A Pressable that shrinks slightly while held, so taps feel physical. Dims instead when Reduce Motion is on. */
export function PressScale({ style, children, onPressIn, onPressOut, ...pressableProps }: Props) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <Pressable
      pressRetentionOffset={16}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      {...pressableProps}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: pressed && !reduced ? 0.97 : 1 }],
            opacity: pressed && reduced ? 0.7 : 1,
            transitionProperty: ["transform", "opacity"],
            transitionDuration: 120,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
