import { router, useLocalSearchParams } from "expo-router";

import { ReceiptForm } from "@/components/receipt-form";
import { useToast } from "@/components/toast";
import { haptics } from "@/data/haptics";
import { type ReceiptPhoto, savePhoto } from "@/data/receipt-photos";
import { useReceiptsStore } from "@/data/receipts";
import { useSettings } from "@/data/settings";
import { todayIso } from "@/lib/deadlines";
import { goBack } from "@/lib/navigation";
import { emptyReceiptInput } from "@/lib/receipt-input";

export default function NewReceiptScreen() {
  const { addReceipt, setReceiptPhoto } = useReceiptsStore();
  const { showToast } = useToast();
  const { scan } = useLocalSearchParams<{ scan?: string }>();
  const { settings } = useSettings();

  function keepPhoto(receiptId: string, photo: ReceiptPhoto) {
    try {
      const name = savePhoto(receiptId, photo);
      if (name) setReceiptPhoto(receiptId, name);
    } catch (error) {
      // The receipt itself is saved; only the photo is missing, and it can be added from the receipt screen.
      console.warn("Couldn't save the receipt photo", error);
    }
  }

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
      onSubmitMany={(fieldsList, photo) => {
        for (const fields of fieldsList) {
          const receipt = addReceipt(fields);
          if (photo) keepPhoto(receipt.id, photo);
        }
        haptics.success();
        showToast({ message: `Added ${fieldsList.length} receipts. Keepr will remind you before each deadline.` });
        goBack();
      }}
      onSubmit={(fields, photo) => {
        const receipt = addReceipt(fields);
        if (photo) keepPhoto(receipt.id, photo);
        haptics.success();
        showToast({ message: "Receipt saved. Keepr will remind you before each deadline." });
        router.replace({ pathname: "/receipt/[id]", params: { id: receipt.id } });
      }}
    />
  );
}
