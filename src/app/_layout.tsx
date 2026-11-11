import { Stack } from "expo-router";

import { useTheme } from "@/constants/theme";
import { ReceiptsProvider } from "@/data/receipts";

export default function RootLayout() {
  const theme = useTheme();

  return (
    <ReceiptsProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Your receipts" }} />
        <Stack.Screen name="receipt/[id]" options={{ title: "Receipt" }} />
        <Stack.Screen name="receipt/new" options={{ title: "Add receipt", presentation: "modal" }} />
        <Stack.Screen name="receipt/edit/[id]" options={{ title: "Edit receipt", presentation: "modal" }} />
      </Stack>
    </ReceiptsProvider>
  );
}
