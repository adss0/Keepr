import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance as RNAppearance, Platform } from "react-native";

import { type Appearance, AppearanceContext } from "@/constants/theme";
import type { ReceiptsSort, ReceiptsView } from "@/lib/receipt-views";
import { DEFAULT_REMINDER_OPTIONS, type ReminderOptions } from "@/lib/reminders";
import type { PaymentMethod, PurchaseChannel } from "@/types/receipt";

const STORAGE_KEY = "keepr.settings.v1";

export type Settings = {
  reminders: ReminderOptions;
  /** Pre-filled on the Add receipt form. */
  defaultChannel: PurchaseChannel;
  defaultPaymentMethod: PaymentMethod;
  appearance: Appearance;
  /** How the Receipts tab shows receipts, and in what order. */
  receiptsView: ReceiptsView;
  receiptsSort: ReceiptsSort;
  /** Whether the "Capture, keep, find" intro has been shown (or skipped) on this phone. */
  introSeen: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  reminders: DEFAULT_REMINDER_OPTIONS,
  defaultChannel: "in_store",
  defaultPaymentMethod: "debit_card",
  appearance: "system",
  receiptsView: "list",
  receiptsSort: "deadline",
  introSeen: false,
};

type SettingsContextValue = {
  settings: Settings;
  ready: boolean;
  update: (changes: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Saved settings merged over the defaults, so settings added in later versions get their default value. */
function withDefaults(saved: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    reminders: { ...DEFAULT_SETTINGS.reminders, ...saved.reminders },
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setSettings(withDefaults(JSON.parse(stored) as Partial<Settings>));
      })
      .catch((error: unknown) => console.warn("Couldn't load settings", error))
      .finally(() => setReady(true));
  }, []);

  // Native date pickers, alerts and the status bar follow the app's appearance too.
  useEffect(() => {
    if (Platform.OS === "web") return;
    RNAppearance.setColorScheme(settings.appearance === "system" ? "unspecified" : settings.appearance);
  }, [settings.appearance]);

  const update = useCallback((changes: Partial<Settings>) => {
    setSettings((current) => {
      const next = withDefaults({ ...current, ...changes });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((error: unknown) =>
        console.warn("Couldn't save settings", error),
      );
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);

  return (
    <SettingsContext.Provider value={value}>
      <AppearanceContext.Provider value={settings.appearance}>{children}</AppearanceContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside <SettingsProvider>");
  return value;
}
