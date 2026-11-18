import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Animated, { Easing, FadeInDown, FadeOut } from "react-native-reanimated";

import { useTheme } from "@/constants/theme";

/** How long a message stays on screen. Messages with an action (like Undo) stay a little longer. */
const SHOW_MS = 3000;
const SHOW_WITH_ACTION_MS = 6000;

type Toast = {
  message: string;
  action?: { label: string; onPress: () => void };
};

type ToastContextValue = {
  /** Shows a short message at the bottom of the screen, optionally with a button such as Undo. */
  showToast: (toast: Toast) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [toast, setToast] = useState<(Toast & { id: number }) | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((newToast: Toast) => {
    nextId.current += 1;
    setToast({ ...newToast, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.action ? SHOW_WITH_ACTION_MS : SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={styles.overlay}>
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(160).easing(Easing.bezier(0.23, 1, 0.32, 1))}
            exiting={FadeOut.duration(150)}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: theme.text }]}
          >
            <Text style={[styles.message, { color: theme.background }]}>{toast.message}</Text>
            {toast.action && (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
              >
                <Text style={[styles.action, { color: theme.background }]}>{toast.action.label}</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 96,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    maxWidth: 480,
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
  },
  action: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
