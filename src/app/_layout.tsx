import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Pressable, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ToastProvider } from "@/components/toast";
import { useColorMode, useTheme } from "@/constants/theme";
import { goBack } from "@/lib/navigation";
import { CloudProvider } from "@/data/cloud";
import { ReceiptsProvider } from "@/data/receipts";
import { RemindersProvider } from "@/data/reminders";
import { SettingsProvider } from "@/data/settings";
import { SpacesProvider } from "@/data/spaces";
import { SubscriptionsProvider } from "@/data/subscriptions";

// iOS fades the splash out instead of cutting to the first screen.
SplashScreen.setOptions({ fade: true, duration: 300 });

function AppStack() {
  const theme = useTheme();
  const mode = useColorMode();
  // Forms open as modals. Phones can swipe them away, but the web has no gesture, so every form gets Cancel.
  const modal = (title: string) => ({
    title,
    presentation: "modal" as const,
    headerLeft: () => (
      <Pressable accessibilityRole="button" hitSlop={10} onPress={() => goBack()}>
        <Text style={{ color: theme.accent, fontSize: 17 }}>Cancel</Text>
      </Pressable>
    ),
  });

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Keepr" }} />
        <Stack.Screen name="receipt/[id]" options={{ title: "Receipt" }} />
        <Stack.Screen name="receipt/new" options={modal("Add receipt")} />
        <Stack.Screen name="receipt/edit/[id]" options={modal("Edit receipt")} />
        <Stack.Screen name="receipt/rights/[id]" options={{ title: "Your rights" }} />
        <Stack.Screen
          name="receipt/photo/[id]"
          options={{ title: "Receipt photo", headerStyle: { backgroundColor: "#000" }, headerTintColor: "#fff", headerTitleStyle: { color: "#fff" } }}
        />
        <Stack.Screen name="subscriptions/new" options={modal("Add subscription")} />
        <Stack.Screen name="subscriptions/edit/[id]" options={modal("Edit subscription")} />
        <Stack.Screen name="account" options={{ title: "Account and sync" }} />
        <Stack.Screen name="spaces/index" options={{ title: "Shared spaces" }} />
        <Stack.Screen name="spaces/[id]" options={{ title: "Space" }} />
        <Stack.Screen name="reset-password" options={{ title: "Reset password" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ReceiptsProvider>
        <SubscriptionsProvider>
          <CloudProvider>
            <SpacesProvider>
              <RemindersProvider>
                <ToastProvider>
                  <AppStack />
                </ToastProvider>
              </RemindersProvider>
            </SpacesProvider>
          </CloudProvider>
        </SubscriptionsProvider>
      </ReceiptsProvider>
    </SettingsProvider>
  );
}
