
import { SubscriptionForm } from "@/components/subscription-form";
import { useToast } from "@/components/toast";
import { haptics } from "@/data/haptics";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { emptySubscriptionInput } from "@/lib/subscription-input";
import { goBack } from "@/lib/navigation";

export default function NewSubscriptionScreen() {
  const { addSubscription } = useSubscriptions();
  const { showToast } = useToast();

  return (
    <SubscriptionForm
      initial={emptySubscriptionInput(todayIso())}
      submitLabel="Save subscription"
      onSubmit={(fields) => {
        addSubscription(fields);
        haptics.success();
        showToast({ message: `Added ${fields.name}` });
        goBack("/subscriptions");
      }}
    />
  );
}
