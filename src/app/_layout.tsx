import { Stack } from "expo-router";

import { useTheme } from "@/constants/theme";

export default function RootLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Your receipts" }} />
      <Stack.Screen name="receipt/[id]" options={{ title: "Receipt" }} />
    </Stack>
  );
}
