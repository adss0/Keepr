import { Alert, Platform } from "react-native";

/** Asks before going ahead with `action`. Browsers get their own confirm box. */
export function confirm(title: string, message: string, action: string, onConfirm: () => void, destructive = true) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: action, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}
