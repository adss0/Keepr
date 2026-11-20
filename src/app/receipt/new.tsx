import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { confirm } from "@/components/confirm";
import { ReceiptForm } from "@/components/receipt-form";
import { useToast } from "@/components/toast";
import { haptics } from "@/data/haptics";
import { useCloud } from "@/data/cloud";
import { keepPhoto as storePhoto, type ReceiptPhoto } from "@/data/receipt-photos";
import { useReceiptsStore } from "@/data/receipts";
import { takeSharedReceipt } from "@/data/shared-receipt";
import { useSettings } from "@/data/settings";
import { todayIso } from "@/lib/deadlines";
import { findDuplicate } from "@/lib/duplicates";
import { formatFullDate, formatPrice } from "@/lib/format";
import { goBack } from "@/lib/navigation";
import { emptyReceiptInput } from "@/lib/receipt-input";

export default function NewReceiptScreen() {
  const { receipts, addReceipt, setReceiptPhoto } = useReceiptsStore();
  const { showToast } = useToast();
  const { scan, space } = useLocalSearchParams<{ scan?: string; space?: string }>();
  const { settings } = useSettings();
  const { userId } = useCloud();
  // Taken once, so going back and opening Add receipt again doesn't rescan it.
  const [sharedPhoto] = useState(() => (scan === "shared" ? takeSharedReceipt() : undefined));

  function keepPhoto(receiptId: string, photo: ReceiptPhoto) {
    storePhoto(receiptId, photo, userId)
      .then((name) => {
        if (name) setReceiptPhoto(receiptId, name, photo.source);
      })
      .catch((error: unknown) => {
        // The receipt itself is saved; only the photo is missing, and it can be added from the receipt screen.
        console.warn("Couldn't save the receipt photo", error);
        showToast({ message: "Receipt saved, but its photo couldn't be kept. Add it again from the receipt." });
      });
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
      initialSpaceId={space}
      sharedPhoto={sharedPhoto}
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
        function save() {
          const receipt = addReceipt(fields);
          if (photo) keepPhoto(receipt.id, photo);
          haptics.success();
          showToast({ message: "Receipt saved. Keepr will remind you before each deadline." });
          router.replace({ pathname: "/receipt/[id]", params: { id: receipt.id, kept: "1" } });
        }
        // Scanning the same receipt twice is easy to do; ask, but never stop them keeping both.
        const twin = findDuplicate(receipts, fields);
        if (!twin) return save();
        confirm(
          "Already kept?",
          `You have ${twin.product} from ${twin.retailer}, ${formatFullDate(twin.purchaseDate)}, ${formatPrice(twin.pricePence)}. Save this one as well?`,
          "Save anyway",
          save,
          false,
        );
      }}
    />
  );
}
