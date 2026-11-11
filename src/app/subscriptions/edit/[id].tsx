import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/form";
import { SubscriptionForm } from "@/components/subscription-form";
import { useTheme } from "@/constants/theme";
import { useSubscriptions } from "@/data/subscriptions";
import { confirmAsync } from "@/lib/confirm";
import { subscriptionToInput } from "@/lib/subscription-input";

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, updateSubscription, deleteSubscription } = useSubscriptions();
  const subscription = subscriptions.find((item) => item.id === id);
  const theme = useTheme();

  if (!subscription) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted }}>This subscription doesn&apos;t exist any more.</Text>
      </View>
    );
  }

  return (
    <SubscriptionForm
      initial={subscriptionToInput(subscription)}
      submitLabel="Save changes"
      onSubmit={(fields) => {
        updateSubscription(subscription.id, fields);
        router.back();
      }}
      footer={
        <Button
          title="Delete subscription"
          variant="danger"
          onPress={async () => {
            const confirmed = await confirmAsync(
              "Delete this subscription?",
              `${subscription.name} and its reminders will be removed from Keepr. This doesn't cancel it with the provider.`,
              "Delete",
            );
            if (confirmed) {
              deleteSubscription(subscription.id);
              router.back();
            }
          }}
        />
      }
    />
  );
}
