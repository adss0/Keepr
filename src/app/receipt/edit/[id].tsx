import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { ReceiptForm } from "@/components/receipt-form";
import { useTheme } from "@/constants/theme";
import { useReceipt, useReceiptsStore } from "@/data/receipts";
import { receiptToInput } from "@/lib/receipt-input";

export default function EditReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = useReceipt(id);
  const { updateReceipt } = useReceiptsStore();
  const theme = useTheme();

  if (!receipt) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted }}>This receipt doesn&apos;t exist any more.</Text>
      </View>
    );
  }

  return (
    <ReceiptForm
      initial={receiptToInput(receipt)}
      submitLabel="Save changes"
      onSubmit={(fields) => {
        updateReceipt(receipt.id, fields);
        router.back();
      }}
    />
  );
}
