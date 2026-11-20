import { type ComponentRef, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Button, Field, Segmented } from "@/components/form";
import { Icon } from "@/components/icon";
import { ScanPanel } from "@/components/scan-panel";
import { SpacePicker } from "@/components/space-picker";
import { useToast } from "@/components/toast";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { canKeepPhotos, type ReceiptPhoto } from "@/data/receipt-photos";
import { haptics } from "@/data/haptics";
import { pickReceiptPhoto } from "@/data/scan-receipt";
import type { ReceiptFields } from "@/data/receipts";
import { todayIso } from "@/lib/deadlines";
import { type ReceiptInput, type ReceiptInputErrors, validateReceiptInput } from "@/lib/receipt-input";
import { formatPrice } from "@/lib/format";
import { usualReturnDays } from "@/lib/return-policies";
import {
  countChangedFields,
  penceToInput,
  type ScannedItem,
  scannedItems,
  scannedText,
  scanResultToInput,
} from "@/lib/scan-result";
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
  /** Saves every item from a multi-item scan as its own receipt. Without it, only one item can be picked. */
  onSubmitMany?: (fieldsList: ReceiptFields[], photo?: ReceiptPhoto) => void;
  /** Show the "Scan a receipt" buttons (for new receipts). */
  allowScan?: boolean;
  /** Open the camera as soon as the form appears (with allowScan). */
  autoScan?: boolean;
  /** A receipt shared from another app, scanned as the form opens. */
  sharedPhoto?: ReceiptPhoto;
  /** The shared space it's in ("" or undefined for personal). */
  initialSpaceId?: string;
  /** False for someone else's shared receipt, which can't become your personal one. */
  allowPersonal?: boolean;
};

export function ReceiptForm({
  initial,
  submitLabel,
  onSubmit,
  onSubmitMany,
  allowScan = false,
  autoScan = false,
  sharedPhoto,
  initialSpaceId,
  allowPersonal = true,
}: Props) {
  const theme = useTheme();
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<ReceiptInputErrors>({});
  // A shared receipt is kept as proof of purchase even if scanning it fails.
  const [photo, setPhoto] = useState<ReceiptPhoto | undefined>(sharedPhoto);
  const keepsPhotos = canKeepPhotos(useCloud().userId);
  const { showToast } = useToast();

  /** Keeps a photo as proof of purchase without reading it, for receipts added by hand. */
  async function attachPhoto(source: "camera" | "library") {
    try {
      const picked = await pickReceiptPhoto(source);
      if (picked) {
        setPhoto(picked);
        haptics.success();
      }
    } catch (error) {
      // A toast rather than an alert, which does nothing in browsers.
      showToast({ message: error instanceof Error ? error.message : "Couldn't add the photo." });
    }
  }
  const [items, setItems] = useState<ScannedItem[]>([]);
  /** The scan's name and total for the whole receipt, to switch back to after picking one item. */
  const [whole, setWhole] = useState<{ name: string; price: string }>();
  const [spaceId, setSpaceId] = useState(initialSpaceId ?? "");
  /** The receipt's printed words from the last scan, saved with it so search can find them. */
  const [printedText, setPrintedText] = useState<string>();
  const withSpace = (fields: ReceiptFields): ReceiptFields => ({
    ...fields,
    ...(spaceId && { spaceId }),
    ...(printedText && { printedText }),
  });
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  /** Errors sit next to their fields near the top, so bring them into view. */
  function showErrors(next: ReceiptInputErrors) {
    setErrors(next);
    haptics.error();
    scroll.current?.scrollTo({ y: 0, animated: true });
  }

  /** The return window Keepr filled in from the shop's usual policy, while the user hasn't changed it. */
  const [usualDays, setUsualDays] = useState<string>();

  /** Sets the shop, and fills in its usual return window unless the user typed their own. */
  function updateShop(text: string) {
    const ours = input.returnWindowDays.trim() === "" || input.returnWindowDays === usualDays;
    const usual = usualReturnDays(text)?.toString();
    setInput({ ...input, retailer: text, ...(ours && { returnWindowDays: usual ?? "" }) });
    setErrors((current) => ({ ...current, retailer: undefined, ...(ours && { returnWindowDays: undefined }) }));
    if (ours) setUsualDays(usual);
  }

  function update<K extends keyof ReceiptInput>(key: K, value: ReceiptInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const result = validateReceiptInput(input, todayIso());
    if (result.errors) {
      showErrors(result.errors);
      return;
    }
    onSubmit(withSpace(result.value), photo);
  }

  function pickItem(item: ScannedItem) {
    setInput((current) => ({
      ...current,
      product: item.name,
      price: item.pricePence !== undefined ? penceToInput(item.pricePence) : current.price,
    }));
    setErrors((current) => ({ ...current, product: undefined, price: undefined }));
  }

  /** Every scanned item as its own receipt, sharing the shop, date and payment details. */
  function submitAll() {
    const today = todayIso();
    const values: ReceiptFields[] = [];
    for (const item of items) {
      const price = item.pricePence !== undefined ? penceToInput(item.pricePence) : input.price;
      const result = validateReceiptInput({ ...input, product: item.name, price }, today);
      if (result.errors) {
        // A shared detail (shop, date) needs fixing, or an item has no price.
        showErrors(result.errors.price ? { ...result.errors, price: `Enter a price for ${item.name}` } : result.errors);
        return;
      }
      values.push(withSpace(result.value));
    }
    onSubmitMany?.(values, photo);
  }

  return (
    <ScrollView
      ref={scroll}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {allowScan && (
        <ScanPanel
          autoStart={autoScan}
          sharedPhoto={sharedPhoto}
          onScanned={(result, scannedPhoto) => {
            setPhoto(scannedPhoto);
            setItems(scannedItems(result));
            setPrintedText(scannedText(result));
            const read = scanResultToInput(result, input);
            if (!read) return 0;
            const usual = read.returnWindowDays.trim() ? undefined : usualReturnDays(read.retailer)?.toString();
            const scanned = usual ? { ...read, returnWindowDays: usual } : read;
            setUsualDays(usual);
            setInput(scanned);
            setWhole({ name: scanned.product, price: scanned.price });
            setErrors({});
            return countChangedFields(input, scanned);
          }}
        />
      )}
      {photo && keepsPhotos && (
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
      {!photo && keepsPhotos && (
        <View style={[styles.photoRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.photoIcon, { backgroundColor: theme.accentSoft }]}>
            <Icon name="camera" size={18} color={theme.accent} />
          </View>
          <View style={styles.photoText}>
            <Text style={[styles.photoTitle, { color: theme.text }]}>Add a photo of the receipt</Text>
            <Text style={[styles.photoHint, { color: theme.textMuted }]}>Proof of purchase for returns and claims.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take a photo of the receipt"
            hitSlop={8}
            onPress={() => attachPhoto("camera")}
            style={styles.photoAction}
          >
            <Icon name="camera" size={20} color={theme.accent} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a photo of the receipt"
            hitSlop={8}
            onPress={() => attachPhoto("library")}
            style={styles.photoAction}
          >
            <Icon name="photo" size={20} color={theme.accent} />
          </Pressable>
        </View>
      )}
      {items.length > 1 && (
        <View style={[styles.items, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.photoTitle, { color: theme.text }]}>{items.length} items on this receipt</Text>
          <Text style={[styles.photoHint, { color: theme.textMuted }]}>
            Keep it as one receipt for everything, or pick the item it&apos;s for
            {onSubmitMany ? ", or add each item separately." : "."}
          </Text>
          <View accessibilityRole="radiogroup" style={styles.itemList}>
            {whole && (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: input.product === whole.name }}
                onPress={() => pickItem({ name: whole.name, pricePence: Math.round(Number(whole.price) * 100) })}
                style={[
                  styles.item,
                  {
                    borderColor: input.product === whole.name ? theme.accent : theme.border,
                    backgroundColor: input.product === whole.name ? theme.accentSoft : "transparent",
                  },
                ]}
              >
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
                  Whole receipt: {whole.name}
                </Text>
                {whole.price ? <Text style={[styles.itemPrice, { color: theme.text }]}>£{whole.price}</Text> : null}
              </Pressable>
            )}
            {items.map((item, index) => {
              const selected = input.product === item.name;
              return (
                <Pressable
                  key={`${item.name}-${index}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => pickItem(item)}
                  style={[
                    styles.item,
                    {
                      borderColor: selected ? theme.accent : theme.border,
                      backgroundColor: selected ? theme.accentSoft : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.pricePence !== undefined && (
                    <Text style={[styles.itemPrice, { color: theme.text }]}>{formatPrice(item.pricePence)}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          {onSubmitMany && <Button title={`Add all ${items.length} as separate receipts`} onPress={submitAll} />}
        </View>
      )}
      <Field
        label="What did you buy?"
        placeholder="e.g. Sony headphones"
        value={input.product}
        onChangeText={(text) => update("product", text)}
        error={errors.product}
      />
      <Field
        label="Shop"
        placeholder="e.g. Currys"
        value={input.retailer}
        onChangeText={updateShop}
        error={errors.retailer}
      />
      <Field
        label="Price (£)"
        placeholder="e.g. 79.99"
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
      <SpacePicker value={spaceId} onChange={setSpaceId} allowPersonal={allowPersonal} />
      <Field
        label="Shop return window (days)"
        placeholder="e.g. 28"
        hint={
          usualDays && input.returnWindowDays === usualDays
            ? `Filled in from ${input.retailer.trim()}'s usual policy. Check your receipt: some items differ.`
            : "Optional. Check the receipt or the shop's returns policy."
        }
        keyboardType="number-pad"
        value={input.returnWindowDays}
        onChangeText={(text) => update("returnWindowDays", text)}
        error={errors.returnWindowDays}
      />
      <Field
        label="Warranty (months)"
        placeholder="e.g. 12"
        hint="Optional. Most electronics come with 12 months."
        keyboardType="number-pad"
        value={input.warrantyMonths}
        onChangeText={(text) => update("warrantyMonths", text)}
        error={errors.warrantyMonths}
      />
      {input.warrantyMonths.trim() !== "" && (
        <Button title="No warranty" variant="ghost" onPress={() => update("warrantyMonths", "")} />
      )}
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
  photoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
  items: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  itemList: {
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
