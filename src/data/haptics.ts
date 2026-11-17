import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/** Small vibrations that confirm what just happened. They do nothing on the web. */
const enabled = Platform.OS !== "web";

function ignoreErrors(promise: Promise<void>) {
  promise.catch(() => undefined);
}

export const haptics = {
  /** Something was saved or worked. */
  success() {
    if (enabled) ignoreErrors(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /** Something was removed. */
  warning() {
    if (enabled) ignoreErrors(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** Something went wrong. */
  error() {
    if (enabled) ignoreErrors(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /** An option was picked. */
  selection() {
    if (enabled) ignoreErrors(Haptics.selectionAsync());
  },
};
