import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, Pressable, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

import { LaunchReceipt } from "@/components/launch-receipt";
import { ToastProvider } from "@/components/toast";
import { Fonts, useColorMode, useTheme } from "@/constants/theme";
import { goBack } from "@/lib/navigation";
import { CloudProvider } from "@/data/cloud";
import { ReceiptsProvider } from "@/data/receipts";
import { RemindersProvider } from "@/data/reminders";
import { SettingsProvider } from "@/data/settings";
import { SpacesProvider } from "@/data/spaces";
import { SubscriptionsProvider } from "@/data/subscriptions";

// The splash stays up until Keepr's fonts are ready, then fades (iOS) into the opening receipt.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: 300 });

function AppStack() {
  const theme = useTheme();
  const mode = useColorMode();
  // Forms open as modals. Phones can swipe them away, but the web has no gesture, so every form gets Cancel.
  const modal = (title: string) => ({
    title,
    presentation: "modal" as const,
    // Centred like an iOS sheet, so the title doesn't run into Cancel on Android and the web.
    headerTitleAlign: "center" as const,
    headerLeft: () => (
      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => goBack()}
        // iOS already insets header buttons; the web doesn't.
        style={{ marginLeft: Platform.OS === "web" ? 16 : 0 }}
      >
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
          headerTitleStyle: { color: theme.text, fontFamily: Fonts.display },
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
        <Stack.Screen name="export" options={modal("Export")} />
        <Stack.Screen name="spaces/index" options={{ title: "Shared spaces" }} />
        <Stack.Screen name="spaces/[id]" options={{ title: "Space" }} />
        <Stack.Screen name="reset-password" options={{ title: "Reset password" }} />
      </Stack>
      <LaunchReceipt />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  const fontsReady = fontsLoaded || !!fontsError;

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  // If the fonts fail to load the app still opens, in the system font.
  if (!fontsReady) return null;

  return (
    // Swipeable rows need gestures handled from the root.
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
