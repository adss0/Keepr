import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Button, Field, Segmented } from "@/components/form";
import { ScanPanel } from "@/components/scan-panel";
import { useTheme } from "@/constants/theme";
import { photosStoredLocally, type ReceiptPhoto } from "@/data/receipt-photos";
import type { ReceiptFields } from "@/data/receipts";
import { todayIso } from "@/lib/deadlines";
import { type ReceiptInput, type ReceiptInputErrors, validateReceiptInput } from "@/lib/receipt-input";
import { countChangedFields, scanResultToInput } from "@/lib/scan-result";
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
  /** `photo` is the scanned photo to keep as proof of purchase, if any. */
  onSubmit: (fields: ReceiptFields, photo?: ReceiptPhoto) => void;
  /** Show the "Scan a receipt" buttons (for new receipts). */
  allowScan?: boolean;
  /** Open the camera as soon as the form appears (with allowScan). */
  autoScan?: boolean;
};

export function ReceiptForm({ initial, submitLabel, onSubmit, allowScan = false, autoScan = false }: Props) {
  const theme = useTheme();
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<ReceiptInputErrors>({});
  const [photo, setPhoto] = useState<ReceiptPhoto>();

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
    onSubmit(result.value, photo);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {allowScan && (
        <ScanPanel
          autoStart={autoScan}
          onScanned={(result, scannedPhoto) => {
            setPhoto(scannedPhoto);
            const scanned = scanResultToInput(result, input);
            if (!scanned) return 0;
            setInput(scanned);
            setErrors({});
            return countChangedFields(input, scanned);
          }}
        />
      )}
      {photo && photosStoredLocally && (
        <View style={[styles.photoRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {photo.mediaType.startsWith("image/") ? (
            <Image
              source={{ uri: `data:${photo.mediaType};base64,${photo.base64}` }}
              style={styles.thumb}
              contentFit="cover"
              accessibilityLabel="Receipt photo"
            />
          ) : null}
          <View style={styles.photoText}>
            <Text style={[styles.photoTitle, { color: theme.text }]}>Photo kept as proof of purchase</Text>
            <Text style={[styles.photoHint, { color: theme.textMuted }]}>Saved with the receipt.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Don't keep the photo" hitSlop={10} onPress={() => setPhoto(undefined)}>
            <Text style={{ color: theme.accent, fontWeight: "600" }}>Remove</Text>
          </Pressable>
        </View>
      )}
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
      <DateField
        label="Date bought"
        hint="For online orders, use the delivery date."
        value={input.purchaseDate}
        onChange={(date) => update("purchaseDate", date)}
        maximumDate={todayIso()}
        pastShortcuts
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
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 10,
  },
  thumb: {
    width: 48,
    height: 64,
    borderRadius: 8,
  },
  photoText: {
    flex: 1,
    gap: 2,
  },
  photoTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  photoHint: {
    fontSize: 13,
  },
});
