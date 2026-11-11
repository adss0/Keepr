import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Button, Field, Segmented } from "@/components/form";
import { useTheme } from "@/constants/theme";
import type { ReceiptFields } from "@/data/receipts";
import { todayIso } from "@/lib/deadlines";
import { type ReceiptInput, type ReceiptInputErrors, validateReceiptInput } from "@/lib/receipt-input";
import type { PaymentMethod, PurchaseChannel } from "@/types/receipt";

const CHANNEL_OPTIONS: { value: PurchaseChannel; label: string }[] = [
  { value: "in_store", label: "In store" },
  { value: "online", label: "Online" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "debit_card", label: "Debit card" },
  { value: "credit_card", label: "Credit card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

type Props = {
  initial: ReceiptInput;
  submitLabel: string;
  onSubmit: (fields: ReceiptFields) => void;
};

export function ReceiptForm({ initial, submitLabel, onSubmit }: Props) {
  const theme = useTheme();
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<ReceiptInputErrors>({});

  function update<K extends keyof ReceiptInput>(key: K, value: ReceiptInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const result = validateReceiptInput(input, todayIso());
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.value);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="What did you buy?"
        placeholder="Sony headphones"
        value={input.product}
        onChangeText={(text) => update("product", text)}
        error={errors.product}
      />
      <Field
        label="Shop"
        placeholder="Currys"
        value={input.retailer}
        onChangeText={(text) => update("retailer", text)}
        error={errors.retailer}
      />
      <Field
        label="Price (£)"
        placeholder="79.99"
        keyboardType="decimal-pad"
        value={input.price}
        onChangeText={(text) => update("price", text)}
        error={errors.price}
      />
      <Field
        label="Date bought"
        placeholder="2026-11-11"
        hint="YYYY-MM-DD. For online orders, use the delivery date."
        value={input.purchaseDate}
        onChangeText={(text) => update("purchaseDate", text)}
        error={errors.purchaseDate}
      />
      <Segmented
        label="Where did you buy it?"
        value={input.channel}
        options={CHANNEL_OPTIONS}
        onChange={(value) => update("channel", value)}
      />
      <Segmented
        label="How did you pay?"
        value={input.paymentMethod}
        options={PAYMENT_OPTIONS}
        onChange={(value) => update("paymentMethod", value)}
      />
      <Field
        label="Shop return window (days)"
        placeholder="28"
        hint="Optional. Check the receipt or the shop's returns policy."
        keyboardType="number-pad"
        value={input.returnWindowDays}
        onChangeText={(text) => update("returnWindowDays", text)}
        error={errors.returnWindowDays}
      />
      <Field
        label="Warranty (months)"
        placeholder="12"
        hint="Optional. Most electronics come with 12 months."
        keyboardType="number-pad"
        value={input.warrantyMonths}
        onChangeText={(text) => update("warrantyMonths", text)}
        error={errors.warrantyMonths}
      />
      <Button title={submitLabel} variant="primary" onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
});
