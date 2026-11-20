import { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { KeptStamp } from "@/components/kept-stamp";
import { Fonts, useTheme } from "@/constants/theme";
import { todayIso } from "@/lib/deadlines";
import { formatFullDate } from "@/lib/format";

// Whether the opening receipt has finished, so screens can start their own entrance after it.
let launchDone = false;
const listeners = new Set<() => void>();

function markLaunchDone() {
  if (launchDone) return;
  launchDone = true;
  listeners.forEach((listener) => listener());
}

export function useLaunchDone(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => launchDone,
    () => launchDone,
  );
}

const PAPER_WIDTH = 216;
const PAPER_HEIGHT = 244;
const TEETH = Math.ceil(PAPER_WIDTH / 12);
/** A thermal printer advances paper a line at a time, so the feed moves in steps rather than gliding. */
const FEED_STEPS = Easing.steps(14, true);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const LINES = ["RETURNS", "REFUNDS", "WARRANTY"];

/**
 * Once per app start: a receipt prints out of a till slot and gets stamped "Kept", then the app shows through.
 * About a second long, any tap skips it, and it's left out entirely with Reduce Motion on.
 */
export function LaunchReceipt() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(!launchDone);
  const feed = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      // Nothing is drawn with Reduce Motion on; just let the app start.
      markLaunchDone();
      return;
    }
    const finish = () => setVisible(false);
    feed.set(withDelay(80, withTiming(1, { duration: 560, easing: FEED_STEPS })));
    // Then the receipt is torn off upwards and the app is there.
    const timer = setTimeout(markLaunchDone, 980);
    exit.set(
      withDelay(
        980,
        withTiming(1, { duration: 200, easing: EASE_OUT }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      ),
    );
    return () => clearTimeout(timer);
  }, [visible, reduced, feed, exit]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.get(),
    transform: [{ translateY: -exit.get() * 40 }],
  }));
  const paperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (feed.get() - 1) * PAPER_HEIGHT }],
  }));

  if (!visible || reduced) return null;

  function skip() {
    markLaunchDone();
    exit.set(withTiming(1, { duration: 120 }, (done) => {
      if (done) scheduleOnRN(setVisible, false);
    }));
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.background }, overlayStyle]}>
      <Pressable
        accessibilityLabel="Keepr is opening. Tap to skip."
        onPress={skip}
        style={styles.centre}
      >
        <View style={[styles.slot, { backgroundColor: theme.text }]} />
        <View style={styles.window}>
          <Animated.View
            style={[styles.paper, { backgroundColor: theme.card, borderColor: theme.border }, paperStyle]}
          >
            <Text style={[styles.brand, { color: theme.text }]}>Keepr</Text>
            <Text style={[styles.mono, styles.date, { color: theme.textMuted }]}>{formatFullDate(todayIso())}</Text>
            <View style={[styles.rule, { borderColor: theme.border }]} />
            {LINES.map((line) => (
              <View key={line} style={styles.line}>
                <Text style={[styles.mono, { color: theme.text }]}>{line}</Text>
                <View style={[styles.leader, { borderColor: theme.border }]} />
                <Text style={[styles.mono, { color: theme.text }]}>OK</Text>
              </View>
            ))}
            <View style={[styles.rule, { borderColor: theme.border }]} />
            <Text style={[styles.mono, styles.thanks, { color: theme.textMuted }]}>YOUR RIGHTS, ON RECORD</Text>
            {/* The stamp comes down hard once the receipt has printed. */}
            <KeptStamp pressed delay={700} style={styles.stamp} />
            <View style={styles.teeth}>
              {Array.from({ length: TEETH }, (_, index) => (
                <View key={index} style={[styles.tooth, { backgroundColor: theme.background }]} />
              ))}
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // Above the tabs and stack screens, which stack their own layers.
    zIndex: 1000,
    elevation: 1000,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  slot: {
    width: PAPER_WIDTH + 36,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  window: {
    width: PAPER_WIDTH,
    height: PAPER_HEIGHT,
    marginTop: -6,
    overflow: "hidden",
  },
  paper: {
    width: PAPER_WIDTH,
    height: PAPER_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 7,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 30,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  date: {
    textAlign: "center",
  },
  rule: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginVertical: 4,
  },
  line: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  leader: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: "dotted",
    marginBottom: 4,
  },
  thanks: {
    textAlign: "center",
    fontSize: 10,
  },
  stamp: {
    position: "absolute",
    right: 18,
    top: 82,
  },
  teeth: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tooth: {
    width: 12,
    height: 12,
    transform: [{ rotate: "45deg" }],
  },
});
