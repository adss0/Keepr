import { router, useLocalSearchParams } from "expo-router";

import { ReceiptForm } from "@/components/receipt-form";
import { useToast } from "@/components/toast";
import { haptics } from "@/data/haptics";
import { useReceiptsStore } from "@/data/receipts";
import { useSettings } from "@/data/settings";
import { todayIso } from "@/lib/deadlines";
import { emptyReceiptInput } from "@/lib/receipt-input";

export default function NewReceiptScreen() {
  const { addReceipt } = useReceiptsStore();
  const { showToast } = useToast();
  const { scan } = useLocalSearchParams<{ scan?: string }>();
  const { settings } = useSettings();

  return (
    <ReceiptForm
      initial={{
        ...emptyReceiptInput(todayIso()),
        channel: settings.defaultChannel,
        paymentMethod: settings.defaultPaymentMethod,
      }}
      submitLabel="Save receipt"
      allowScan
      autoScan={scan === "camera"}
      onSubmit={(fields) => {
        const receipt = addReceipt(fields);
        haptics.success();
        showToast({ message: "Receipt saved. Keepr will remind you before each deadline." });
        router.replace({ pathname: "/receipt/[id]", params: { id: receipt.id } });
      }}
    />
  );
}
