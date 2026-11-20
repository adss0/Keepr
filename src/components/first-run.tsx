import { useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "@/components/form";
import { Icon } from "@/components/icon";
import { KeptStamp } from "@/components/kept-stamp";
import { useLaunchDone } from "@/components/launch-receipt";
import { ScanLine } from "@/components/scan-line";
import { Fonts, useTheme } from "@/constants/theme";
import { useReceiptsStore } from "@/data/receipts";
import { useSettings } from "@/data/settings";
import { todayIso } from "@/lib/deadlines";
import { formatFullDate } from "@/lib/format";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const PAPER_WIDTH = 228;
const TEETH = Math.ceil(PAPER_WIDTH / 12);
const SEARCH = "kettle";

/**
 * When each part plays, in milliseconds from the start. About three seconds in all, and Get started works throughout.
 * Change these to retime the intro; Settings → How Keepr works plays it again.
 */
const TIMING = {
  scanFrom: 250,
  scanFor: 900,
  keep: 1250,
  find: 2100,
  typeEvery: 70,
};

const BEATS = [
  { word: "Capture", text: "Snap a receipt, or pick a photo or PDF. Keepr reads it for you." },
  { word: "Keep", text: "It's kept safe, with its return, refund and warranty deadlines worked out." },
  { word: "Find", text: "Search when you need it: at the till, for a refund or a warranty claim." },
];

const ITEMS: [string, string][] = [
  ["KETTLE 1.7L", "£34.99"],
  ["MUGS ×2", "£12.00"],
  ["TEA TOWEL", "£4.50"],
];

// Lets Settings play the intro again.
let replaying = false;
const listeners = new Set<() => void>();
function setReplaying(next: boolean) {
  replaying = next;
  listeners.forEach((listener) => listener());
}
export function replayIntro() {
  setReplaying(true);
}

/**
 * "Capture, keep, find": shown once, to someone opening Keepr with no receipts yet, after the opening receipt.
 * A receipt is scanned, stamped and found by a search, then they land on the real Receipts screen.
 */
export function FirstRun() {
  const { settings, ready: settingsReady, update } = useSettings();
  const { receipts, ready: receiptsReady } = useReceiptsStore();
  const replay = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => replaying,
    () => replaying,
  );
  const launched = useLaunchDone();
  const firstTime = settingsReady && receiptsReady && !settings.introSeen && receipts.length === 0;

  if (!(firstTime || replay) || !launched) return null;
  return (
    <Intro
      onDone={() => {
        update({ introSeen: true });
        setReplaying(false);
      }}
    />
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const today = todayIso();
  // With Reduce Motion on, the finished picture is shown straight away.
  const [beat, setBeat] = useState(reduced ? 2 : 0);
  const [typed, setTyped] = useState(reduced ? SEARCH : "");
  const enter = useSharedValue(reduced ? 1 : 0);
  const ink = useSharedValue(reduced ? 1 : 0);
  const archive = useSharedValue(reduced ? 1 : 0);
  const find = useSharedValue(reduced ? 1 : 0);
  const highlight = useSharedValue(reduced ? 1 : 0);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    enter.set(withTiming(1, { duration: 360, easing: EASE_OUT }));
    // The print sharpens as the scan line passes over it.
    ink.set(withDelay(TIMING.scanFrom, withTiming(1, { duration: TIMING.scanFor, easing: EASE_IN_OUT })));
    // Once it's kept, it joins the others.
    archive.set(withDelay(TIMING.keep + 100, withTiming(1, { duration: 320, easing: EASE_OUT })));
    find.set(withDelay(TIMING.find, withTiming(1, { duration: 240, easing: EASE_OUT })));
    // The matching line lights up once the search is typed.
    const typedBy = TIMING.find + 200 + SEARCH.length * TIMING.typeEvery;
    highlight.set(withDelay(typedBy, withTiming(1, { duration: 200, easing: EASE_OUT })));
    const timers = [
      setTimeout(() => setBeat(1), TIMING.keep),
      setTimeout(() => setBeat(2), TIMING.find),
      ...Array.from(SEARCH, (_, index) =>
        setTimeout(() => setTyped(SEARCH.slice(0, index + 1)), TIMING.find + 200 + index * TIMING.typeEvery),
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced, enter, ink, archive, find, highlight]);

  function close() {
    exit.set(
      withTiming(1, { duration: 200, easing: EASE_OUT }, (done) => {
        if (done) scheduleOnRN(onDone);
      }),
    );
  }

  const screenStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }));
  const paperStyle = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: (1 - enter.get()) * 16 }, { scale: 0.97 + enter.get() * 0.03 + find.get() * 0.02 }],
  }));
  const inkStyle = useAnimatedStyle(() => ({ opacity: 0.3 + ink.get() * 0.7 }));
  // The other receipts sit behind, then step back while the one searched for comes forward.
  const leftBack = useAnimatedStyle(() => ({
    opacity: archive.get() * (1 - find.get() * 0.45),
    transform: [{ translateX: -16 }, { translateY: 10 + (1 - archive.get()) * 14 }, { rotate: "-4deg" }],
  }));
  const rightBack = useAnimatedStyle(() => ({
    opacity: archive.get() * (1 - find.get() * 0.45),
    transform: [{ translateX: 14 }, { translateY: 10 + (1 - archive.get()) * 14 }, { rotate: "3deg" }],
  }));
  const highlightStyle = useAnimatedStyle(() => ({ opacity: highlight.get() }));
  const searchStyle = useAnimatedStyle(() => ({
    opacity: find.get(),
    transform: [{ translateY: (1 - find.get()) * -8 }],
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: theme.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 },
        screenStyle,
      ]}
    >
      <Text style={[styles.brand, { color: theme.text }]} accessibilityRole="header">
        Keepr
      </Text>

      <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }, searchStyle]}>
          <Icon name="search" size={16} color={theme.textMuted} />
          <Text style={[styles.searchText, { color: typed ? theme.text : theme.textMuted }]}>{typed || "Search receipts"}</Text>
        </Animated.View>

        <View style={styles.pile}>
          <Animated.View style={[styles.paper, styles.back, { backgroundColor: theme.card, borderColor: theme.border }, leftBack]} />
          <Animated.View style={[styles.paper, styles.back, { backgroundColor: theme.card, borderColor: theme.border }, rightBack]} />
          <Animated.View style={[styles.paper, { backgroundColor: theme.card, borderColor: theme.border }, paperStyle]}>
            <Animated.View style={[styles.print, inkStyle]}>
              <Text style={[styles.shop, { color: theme.text }]}>The Kitchen Shop</Text>
              <Text style={[styles.mono, styles.centre, { color: theme.textMuted }]}>{formatFullDate(today)}</Text>
              <View style={[styles.rule, { borderColor: theme.border }]} />
              {ITEMS.map(([item, price], index) => (
                <View key={item} style={styles.line}>
                  {index === 0 && <Animated.View style={[styles.highlight, { backgroundColor: theme.accentSoft }, highlightStyle]} />}
                  <Text style={[styles.mono, { color: theme.text }]}>{item}</Text>
                  <Text style={[styles.mono, { color: theme.text }]}>{price}</Text>
                </View>
              ))}
              <View style={[styles.rule, { borderColor: theme.border }]} />
              <View style={styles.line}>
                <Text style={[styles.monoBold, { color: theme.text }]}>TOTAL</Text>
                <Text style={[styles.monoBold, { color: theme.text }]}>£51.49</Text>
              </View>
              <Text style={[styles.mono, { color: theme.textMuted }]}>CARD •••• 4821</Text>
            </Animated.View>
            {beat >= 1 && <KeptStamp pressed={!reduced} style={styles.stamp} />}
            <View style={styles.teeth}>
              {Array.from({ length: TEETH }, (_, index) => (
                <View key={index} style={[styles.tooth, { backgroundColor: theme.background }]} />
              ))}
            </View>
            {/* The scan passes once; the paper clips it. */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <ScanLine delay={TIMING.scanFrom} duration={TIMING.scanFor} />
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={styles.words}>
        {BEATS.map((item, index) => (
          <Text
            key={item.word}
            style={[styles.word, { color: index <= beat ? (index === beat ? theme.text : theme.textMuted) : theme.border }]}
          >
            {item.word}
          </Text>
        ))}
      </View>
      <View style={styles.explain}>
        <Animated.Text
          key={beat}
          entering={reduced ? undefined : FadeIn.duration(200)}
          style={[styles.explainText, { color: theme.textMuted }]}
        >
          {BEATS[beat].text}
        </Animated.Text>
      </View>

      <View style={styles.action}>
        <Button title="Get started" variant="primary" onPress={close} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // Under the opening receipt, over everything else.
    zIndex: 999,
    elevation: 999,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  search: {
    width: PAPER_WIDTH + 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchText: {
    fontSize: 15,
  },
  pile: {
    width: PAPER_WIDTH,
  },
  paper: {
    width: PAPER_WIDTH,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 18,
    // A blank strip at the foot, where the stamp lands.
    paddingBottom: 52,
    overflow: "hidden",
  },
  back: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  print: {
    gap: 7,
  },
  shop: {
    fontFamily: Fonts.display,
    fontSize: 20,
    textAlign: "center",
  },
  centre: {
    textAlign: "center",
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  monoBold: {
    fontFamily: Fonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  rule: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginVertical: 3,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  highlight: {
    position: "absolute",
    top: -3,
    bottom: -3,
    left: -6,
    right: -6,
    borderRadius: 4,
  },
  stamp: {
    position: "absolute",
    right: 14,
    bottom: 14,
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
  words: {
    flexDirection: "row",
    gap: 18,
  },
  word: {
    fontFamily: Fonts.display,
    fontSize: 24,
  },
  explain: {
    // Room for two lines, so the button doesn't move as the words change.
    minHeight: 44,
    maxWidth: 340,
    marginTop: 8,
    marginBottom: 20,
  },
  explainText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  action: {
    alignSelf: "stretch",
    maxWidth: 420,
    width: "100%",
  },
});
