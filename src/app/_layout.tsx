import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ToastProvider } from "@/components/toast";
import { useColorMode, useTheme } from "@/constants/theme";
import { CloudProvider } from "@/data/cloud";
import { ReceiptsProvider } from "@/data/receipts";
import { RemindersProvider } from "@/data/reminders";
import { SettingsProvider } from "@/data/settings";
import { SubscriptionsProvider } from "@/data/subscriptions";

function AppStack() {
  const theme = useTheme();
  const mode = useColorMode();

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
        <Stack.Screen name="receipt/new" options={{ title: "Add receipt", presentation: "modal" }} />
        <Stack.Screen name="receipt/edit/[id]" options={{ title: "Edit receipt", presentation: "modal" }} />
        <Stack.Screen name="receipt/rights/[id]" options={{ title: "Your rights" }} />
        <Stack.Screen name="subscriptions/new" options={{ title: "Add subscription", presentation: "modal" }} />
        <Stack.Screen name="subscriptions/edit/[id]" options={{ title: "Edit subscription", presentation: "modal" }} />
        <Stack.Screen name="account" options={{ title: "Account and sync" }} />
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
            <RemindersProvider>
              <ToastProvider>
                <AppStack />
              </ToastProvider>
            </RemindersProvider>
          </CloudProvider>
        </SubscriptionsProvider>
      </ReceiptsProvider>
    </SettingsProvider>
  );
}
