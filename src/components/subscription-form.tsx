import { type ReactNode, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Button, Field, Segmented } from "@/components/form";
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
};

export function SubscriptionForm({ initial, submitLabel, onSubmit, footer }: Props) {
  const theme = useTheme();
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<SubscriptionInputErrors>({});

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
    onSubmit(result.value);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="Name"
        placeholder="Netflix"
        value={input.name}
        onChangeText={(text) => update("name", text)}
        error={errors.name}
      />
      <Field
        label="Price (£)"
        placeholder="10.99"
        keyboardType="decimal-pad"
        value={input.price}
        onChangeText={(text) => update("price", text)}
        error={errors.price}
      />
      <Segmented label="How often?" value={input.cycle} options={CYCLE_OPTIONS} onChange={(value) => update("cycle", value)} />
      <Field
        label="Next payment"
        placeholder="2026-12-01"
        hint="YYYY-MM-DD. Keepr moves it on automatically after each payment."
        value={input.nextRenewal}
        onChangeText={(text) => update("nextRenewal", text)}
        error={errors.nextRenewal}
      />
      <Field
        label="Free trial ends"
        placeholder="2026-11-30"
        hint="Optional. You'll be reminded before you start paying."
        value={input.trialEnds}
        onChangeText={(text) => update("trialEnds", text)}
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
