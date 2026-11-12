import { Stack } from "expo-router";

import { useTheme } from "@/constants/theme";
import { ReceiptsProvider } from "@/data/receipts";
import { RemindersProvider } from "@/data/reminders";

export default function RootLayout() {
  const theme = useTheme();

  return (
    <ReceiptsProvider>
      <RemindersProvider>
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
          <Stack.Screen name="receipt/rights/[id]" options={{ title: "Your rights" }} />
        </Stack>
      </RemindersProvider>
    </ReceiptsProvider>
  );
}
