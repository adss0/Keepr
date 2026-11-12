import { router } from "expo-router";

import { ReceiptForm } from "@/components/receipt-form";
import { useReceiptsStore } from "@/data/receipts";
import { todayIso } from "@/lib/deadlines";
import { emptyReceiptInput } from "@/lib/receipt-input";

export default function NewReceiptScreen() {
  const { addReceipt } = useReceiptsStore();

  return (
    <ReceiptForm
      initial={emptyReceiptInput(todayIso())}
      submitLabel="Save receipt"
      allowScan
      onSubmit={(fields) => {
        const receipt = addReceipt(fields);
        router.replace({ pathname: "/receipt/[id]", params: { id: receipt.id } });
      }}
    />
  );
}
