import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/form";
import { SubscriptionForm } from "@/components/subscription-form";
import { useTheme } from "@/constants/theme";
import { useToast } from "@/components/toast";
import { haptics } from "@/data/haptics";
import { useCloud } from "@/data/cloud";
import { useSpaces } from "@/data/spaces";
import { useSubscriptions } from "@/data/subscriptions";
import { subscriptionToInput } from "@/lib/subscription-input";
import { goBack } from "@/lib/navigation";

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, updateSubscription, deleteSubscription, restoreSubscription } = useSubscriptions();
  const { showToast } = useToast();
  const subscription = subscriptions.find((item) => item.id === id);
  const { userId } = useCloud();
  const { canChange } = useSpaces();
  const theme = useTheme();

  if (!subscription) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted }}>This subscription doesn&apos;t exist any more.</Text>
      </View>
    );
  }

  if (!canChange(subscription)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted, textAlign: "center" }}>
          Only whoever added this subscription, or the space&apos;s owner and admins, can change it.
        </Text>
      </View>
    );
  }

  return (
    <SubscriptionForm
      initial={subscriptionToInput(subscription)}
      initialSpaceId={subscription.spaceId}
      allowPersonal={!subscription.ownerId || subscription.ownerId === userId}
      submitLabel="Save changes"
      onSubmit={(fields) => {
        updateSubscription(subscription.id, fields);
        haptics.success();
        showToast({ message: "Changes saved" });
        goBack("/subscriptions");
      }}
      footer={
        <Button
          title="Delete subscription"
          variant="danger"
          onPress={() => {
            const deleted = subscription;
            deleteSubscription(deleted.id);
            haptics.warning();
            showToast({
              message: `Removed ${deleted.name}. This doesn't cancel it with the provider.`,
              action: { label: "Undo", onPress: () => restoreSubscription(deleted) },
            });
            goBack("/subscriptions");
          }}
        />
      }
    />
  );
}
