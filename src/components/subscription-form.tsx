import { type ReactNode, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { DateField } from "@/components/date-field";
import { Button, Field, Segmented } from "@/components/form";
import { SpacePicker } from "@/components/space-picker";
import { useTheme } from "@/constants/theme";
import type { SubscriptionFields } from "@/data/subscriptions";
import {
  type SubscriptionInput,
  type SubscriptionInputErrors,
  validateSubscriptionInput,
} from "@/lib/subscription-input";
import type { BillingCycle } from "@/types/subscription";

const CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

type Props = {
  initial: SubscriptionInput;
  submitLabel: string;
  onSubmit: (fields: SubscriptionFields) => void;
  /** Extra buttons under the form, such as Delete. */
  footer?: ReactNode;
  /** The shared space it's in ("" or undefined for personal). */
  initialSpaceId?: string;
  /** False for someone else's shared subscription, which can't become your personal one. */
  allowPersonal?: boolean;
};

export function SubscriptionForm({ initial, submitLabel, onSubmit, footer, initialSpaceId, allowPersonal = true }: Props) {
  const theme = useTheme();
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<SubscriptionInputErrors>({});
  const [spaceId, setSpaceId] = useState(initialSpaceId ?? "");

  function update<K extends keyof SubscriptionInput>(key: K, value: SubscriptionInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const result = validateSubscriptionInput(input);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    onSubmit(spaceId ? { ...result.value, spaceId } : result.value);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="Name"
        placeholder="e.g. Netflix"
        value={input.name}
        onChangeText={(text) => update("name", text)}
        error={errors.name}
      />
      <Field
        label="Price (£)"
        placeholder="e.g. 10.99"
        keyboardType="decimal-pad"
        value={input.price}
        onChangeText={(text) => update("price", text)}
        error={errors.price}
      />
      <Segmented label="How often?" value={input.cycle} options={CYCLE_OPTIONS} onChange={(value) => update("cycle", value)} />
      <SpacePicker value={spaceId} onChange={setSpaceId} allowPersonal={allowPersonal} />
      <DateField
        label="Next payment"
        hint="Keepr moves it on automatically after each payment."
        value={input.nextRenewal}
        onChange={(date) => update("nextRenewal", date)}
        error={errors.nextRenewal}
      />
      <DateField
        label="Free trial ends"
        hint="Optional. You'll be reminded before you start paying."
        value={input.trialEnds}
        onChange={(date) => update("trialEnds", date)}
        clearable
        error={errors.trialEnds}
      />
      <Button title={submitLabel} variant="primary" onPress={submit} />
      {footer}
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
