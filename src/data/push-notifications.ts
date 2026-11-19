import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@/data/supabase";

/** This phone's Expo push token once registered, so it can be removed again on sign-out. */
let registeredToken: string | undefined;

/**
 * Registers this phone for shared-space push notifications, for the signed-in user.
 * Needs notification permission, a real device and an EAS project id (set by `eas init`); without them it does
 * nothing, and the app still shows in-app alerts while it's open.
 * Returns why it couldn't register, or undefined once registered.
 */
export async function registerForSpacePush(): Promise<string | undefined> {
  if (!supabase || Platform.OS === "web") return "Push notifications work in the phone app.";
  if (!Device.isDevice) return "Push notifications need a real phone.";
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return "Push notifications need an EAS project (run eas init).";
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return "Turn on notifications to hear about shared receipts.";
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("spaces", {
      name: "Shared spaces",
      importance: AndroidImportance.DEFAULT,
    });
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc("register_push_token", { push_token: token, device_platform: Platform.OS });
  if (error) return error.message;
  registeredToken = token;
  return undefined;
}

/** Stops this phone getting the signed-in user's notifications. Call before signing out. */
export async function forgetPushToken(): Promise<void> {
  if (!supabase || !registeredToken) return;
  const token = registeredToken;
  registeredToken = undefined;
  await supabase.from("push_tokens").delete().eq("token", token);
}

/**
 * Asks the notify-space function to tell other members about what this user just did in a space
 * (new receipts, joining, leaving). Fire and forget: if it isn't deployed yet, nothing happens.
 */
export function notifySpaceMembers(): void {
  supabase?.functions.invoke("notify-space", { body: {} }).catch(() => undefined);
}
