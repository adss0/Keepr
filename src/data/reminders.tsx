import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

import { useReceiptsStore } from "@/data/receipts";
import { useSubscriptions } from "@/data/subscriptions";
import { planReminders } from "@/lib/reminders";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

const CHANNEL_ID = "deadlines";

/** Phone notifications aren't available in the web preview. */
export const remindersSupported = Platform.OS !== "web";

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Deadline reminders",
    importance: AndroidImportance.HIGH,
  });
}

export type ReminderPermission = "granted" | "denied" | "undetermined" | "unsupported";

function useReminderPermission() {
  const [permission, setPermission] = useState<ReminderPermission>(
    remindersSupported ? "undetermined" : "unsupported",
  );

  useEffect(() => {
    if (!remindersSupported) return;
    Notifications.getPermissionsAsync().then((result) => setPermission(result.status as ReminderPermission));
  }, []);

  const request = useCallback(async () => {
    if (!remindersSupported) return;
    await ensureAndroidChannel();
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    setPermission(result.status as ReminderPermission);
  }, []);

  return { permission, request };
}

/** Keeps the phone's scheduled reminders in step with the saved receipts and subscriptions. */
function useReminderSync(
  receipts: Receipt[],
  subscriptions: Subscription[],
  ready: boolean,
  permission: ReminderPermission,
) {
  useEffect(() => {
    if (!ready || permission !== "granted") return;
    let cancelled = false;

    async function sync() {
      await ensureAndroidChannel();
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const reminder of planReminders(receipts, new Date(), subscriptions)) {
        if (cancelled) return;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: reminder.body,
            data: { receiptId: reminder.receiptId ?? null, subscriptionId: reminder.subscriptionId ?? null },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.date,
            channelId: CHANNEL_ID,
          },
        });
      }
    }

    sync().catch((error: unknown) => console.warn("Couldn't schedule reminders", error));
    return () => {
      cancelled = true;
    };
  }, [receipts, subscriptions, ready, permission]);
}

type RemindersContextValue = {
  permission: ReminderPermission;
  /** Asks the user to allow notifications. */
  request: () => Promise<void>;
};

const RemindersContext = createContext<RemindersContextValue | null>(null);

/** Schedules reminders for every saved receipt and subscription once notifications are allowed. */
/** Tapping a reminder opens the receipt or subscription it's about, including when it starts the app. */
function useOpenRemindersOnTap() {
  useEffect(() => {
    if (!remindersSupported) return;

    function open(notification: Notifications.Notification) {
      const data = notification.request.content.data as { receiptId?: unknown; subscriptionId?: unknown } | undefined;
      if (typeof data?.receiptId === "string") {
        router.push({ pathname: "/receipt/[id]", params: { id: data.receiptId } });
      } else if (typeof data?.subscriptionId === "string") {
        router.push({ pathname: "/subscriptions/edit/[id]", params: { id: data.subscriptionId } });
      }
      Notifications.clearLastNotificationResponse();
    }

    // Wait a moment on a cold start, so the screens exist before navigating.
    const last = Notifications.getLastNotificationResponse();
    const timer = last?.notification ? setTimeout(() => open(last.notification), 300) : undefined;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => open(response.notification));
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, []);
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { receipts, ready: receiptsReady } = useReceiptsStore();
  const { subscriptions, ready: subscriptionsReady } = useSubscriptions();
  const { permission, request } = useReminderPermission();
  useReminderSync(receipts, subscriptions, receiptsReady && subscriptionsReady, permission);
  useOpenRemindersOnTap();

  return <RemindersContext.Provider value={{ permission, request }}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const value = useContext(RemindersContext);
  if (!value) throw new Error("useReminders must be used inside <RemindersProvider>");
  return value;
}
