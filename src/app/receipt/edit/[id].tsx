import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { ReceiptForm } from "@/components/receipt-form";
import { useToast } from "@/components/toast";
import { haptics } from "@/data/haptics";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { useSpaces } from "@/data/spaces";
import { useReceipt, useReceiptsStore } from "@/data/receipts";
import { receiptToInput } from "@/lib/receipt-input";
import { goBack } from "@/lib/navigation";

export default function EditReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = useReceipt(id);
  const { updateReceipt } = useReceiptsStore();
  const { showToast } = useToast();
  const theme = useTheme();
  const { userId } = useCloud();
  const { canChange } = useSpaces();

  if (!receipt) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted }}>This receipt doesn&apos;t exist any more.</Text>
      </View>
    );
  }

  if (!canChange(receipt)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted, textAlign: "center" }}>
          Only whoever added this receipt, or the space&apos;s owner and admins, can change it.
        </Text>
      </View>
    );
  }

  return (
    <ReceiptForm
      initial={receiptToInput(receipt)}
      initialSpaceId={receipt.spaceId}
      allowPersonal={!receipt.ownerId || receipt.ownerId === userId}
      submitLabel="Save changes"
      onSubmit={(fields) => {
        updateReceipt(receipt.id, fields);
        haptics.success();
        showToast({ message: "Changes saved" });
        goBack();
      }}
    />
  );
}
