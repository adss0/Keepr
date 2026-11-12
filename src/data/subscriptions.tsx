import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";

import { usePersistedList } from "@/data/persisted-list";
import { mergeById } from "@/lib/cloud-rows";
import type { Subscription } from "@/types/subscription";

const STORAGE_KEY = "keepr.subscriptions.v1";

export type SubscriptionFields = Omit<Subscription, "id">;

type SubscriptionsContextValue = {
  subscriptions: Subscription[];
  ready: boolean;
  addSubscription: (fields: SubscriptionFields) => Subscription;
  updateSubscription: (id: string, fields: SubscriptionFields) => void;
  deleteSubscription: (id: string) => void;
  /** Adds items saved in the cloud that aren't on this phone yet. */
  mergeFromCloud: (remote: Subscription[]) => void;
};

const SubscriptionsContext = createContext<SubscriptionsContextValue | null>(null);

export function SubscriptionsProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions, ready] = usePersistedList<Subscription>(STORAGE_KEY);

  const addSubscription = useCallback(
    (fields: SubscriptionFields) => {
      const subscription: Subscription = { id: randomUUID(), ...fields };
      setSubscriptions((current) => [...current, subscription]);
      return subscription;
    },
    [setSubscriptions],
  );

  const updateSubscription = useCallback(
    (id: string, fields: SubscriptionFields) => {
      setSubscriptions((current) => current.map((item) => (item.id === id ? { id, ...fields } : item)));
    },
    [setSubscriptions],
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      setSubscriptions((current) => current.filter((item) => item.id !== id));
    },
    [setSubscriptions],
  );

  const mergeFromCloud = useCallback(
    (remote: Subscription[]) => setSubscriptions((current) => mergeById(current, remote)),
    [setSubscriptions],
  );

  const value = useMemo(
    () => ({ subscriptions, ready, addSubscription, updateSubscription, deleteSubscription, mergeFromCloud }),
    [subscriptions, ready, addSubscription, updateSubscription, deleteSubscription, mergeFromCloud],
  );

  return <SubscriptionsContext.Provider value={value}>{children}</SubscriptionsContext.Provider>;
}

export function useSubscriptions(): SubscriptionsContextValue {
  const value = useContext(SubscriptionsContext);
  if (!value) throw new Error("useSubscriptions must be used inside <SubscriptionsProvider>");
  return value;
}
