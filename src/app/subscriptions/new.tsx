import { router } from "expo-router";

import { SubscriptionForm } from "@/components/subscription-form";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { emptySubscriptionInput } from "@/lib/subscription-input";

export default function NewSubscriptionScreen() {
  const { addSubscription } = useSubscriptions();

  return (
    <SubscriptionForm
      initial={emptySubscriptionInput(todayIso())}
      submitLabel="Save subscription"
      onSubmit={(fields) => {
        addSubscription(fields);
        router.back();
      }}
    />
  );
}
