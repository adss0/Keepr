import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useReceiptsStore } from "@/data/receipts";
import { useSubscriptions } from "@/data/subscriptions";
import { supabase } from "@/data/supabase";
import {
  type ReceiptRow,
  receiptToRow,
  removedIds,
  rowToReceipt,
  rowToSubscription,
  type SubscriptionRow,
  subscriptionToRow,
} from "@/lib/cloud-rows";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";

/** Wait this long after the last change before saving to the cloud. */
const PUSH_DELAY_MS = 1000;

export type CloudStatus = "not_set_up" | "signed_out" | "syncing" | "synced" | "error";

type CloudContextValue = {
  status: CloudStatus;
  email: string | undefined;
  lastSyncedAt: Date | undefined;
  error: string | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  /** Creates an account. Resolves with a message to show, such as "check your email". */
  signUp: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const CloudContext = createContext<CloudContextValue | null>(null);

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Signs in with Supabase and keeps receipts and subscriptions in step with the cloud. */
export function CloudProvider({ children }: { children: ReactNode }) {
  const { receipts, ready: receiptsReady, mergeFromCloud: mergeReceipts } = useReceiptsStore();
  const { subscriptions, ready: subscriptionsReady, mergeFromCloud: mergeSubscriptions } = useSubscriptions();

  const [session, setSession] = useState<Session | null>(null);
  const [syncState, setSyncState] = useState<"syncing" | "synced" | "error">("syncing");
  const [error, setError] = useState<string>();
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>();
  /** The user the cloud was last pulled for, and how many pulls so far. Changes are only pushed after a pull. */
  const [pulled, setPulled] = useState<{ userId: string; count: number }>();
  /** What the cloud held after the last push, to work out what was deleted on the phone. */
  const lastPushed = useRef<{ receipts: Receipt[]; subscriptions: Subscription[] }>({ receipts: [], subscriptions: [] });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const pull = useCallback(async () => {
    if (!supabase) return;
    const [receiptRows, subscriptionRows] = await Promise.all([
      supabase.from("receipts").select("*"),
      supabase.from("subscriptions").select("*"),
    ]);
    if (receiptRows.error) throw receiptRows.error;
    if (subscriptionRows.error) throw subscriptionRows.error;
    const remoteReceipts = (receiptRows.data as ReceiptRow[]).map(rowToReceipt);
    const remoteSubscriptions = (subscriptionRows.data as SubscriptionRow[]).map(rowToSubscription);
    lastPushed.current = { receipts: remoteReceipts, subscriptions: remoteSubscriptions };
    mergeReceipts(remoteReceipts);
    mergeSubscriptions(remoteSubscriptions);
  }, [mergeReceipts, mergeSubscriptions]);

  const push = useCallback(async (localReceipts: Receipt[], localSubscriptions: Subscription[]) => {
    if (!supabase) return;
    setSyncState("syncing");
    const deletedReceipts = removedIds(lastPushed.current.receipts, localReceipts);
    const deletedSubscriptions = removedIds(lastPushed.current.subscriptions, localSubscriptions);

    const results = await Promise.all([
      localReceipts.length > 0 ? supabase.from("receipts").upsert(localReceipts.map(receiptToRow)) : null,
      localSubscriptions.length > 0 ? supabase.from("subscriptions").upsert(localSubscriptions.map(subscriptionToRow)) : null,
      deletedReceipts.length > 0 ? supabase.from("receipts").delete().in("id", deletedReceipts) : null,
      deletedSubscriptions.length > 0 ? supabase.from("subscriptions").delete().in("id", deletedSubscriptions) : null,
    ]);
    const failed = results.find((result) => result?.error);
    if (failed?.error) throw failed.error;

    lastPushed.current = { receipts: localReceipts, subscriptions: localSubscriptions };
    setLastSyncedAt(new Date());
    setSyncState("synced");
    setError(undefined);
  }, []);

  // When someone signs in (or the app opens signed in), fetch what's in the cloud first.
  useEffect(() => {
    if (!supabase) return;
    if (!session) {
      lastPushed.current = { receipts: [], subscriptions: [] };
      return;
    }
    const userId = session.user.id;
    if (!receiptsReady || !subscriptionsReady) return;
    pull()
      .then(() => setPulled((current) => ({ userId, count: (current?.userId === userId ? current.count : 0) + 1 })))
      .catch((pullError: unknown) => {
        setSyncState("error");
        setError(messageOf(pullError));
      });
  }, [session, receiptsReady, subscriptionsReady, pull]);

  // After each pull, and after every later change, save to the cloud.
  useEffect(() => {
    if (!session || pulled?.userId !== session.user.id) return;
    const timer = setTimeout(() => {
      push(receipts, subscriptions).catch((pushError: unknown) => {
        setSyncState("error");
        setError(messageOf(pushError));
      });
    }, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [session, pulled, receipts, subscriptions, push]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) throw signInError;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return "";
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
    if (signUpError) throw signUpError;
    return data.session
      ? "Account created. Your receipts are now backed up."
      : "Check your email and tap the link to confirm your account, then sign in.";
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const syncNow = useCallback(async () => {
    setSyncState("syncing");
    try {
      await pull();
      const userId = session?.user.id;
      if (userId) setPulled((current) => ({ userId, count: (current?.count ?? 0) + 1 }));
    } catch (syncError) {
      setSyncState("error");
      setError(messageOf(syncError));
    }
  }, [pull, session]);

  const status: CloudStatus = !supabase ? "not_set_up" : !session ? "signed_out" : syncState;

  const value = useMemo(
    () => ({
      status,
      email: session?.user.email,
      lastSyncedAt,
      error,
      signIn,
      signUp,
      signOut,
      syncNow,
    }),
    [status, session, lastSyncedAt, error, signIn, signUp, signOut, syncNow],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const value = useContext(CloudContext);
  if (!value) throw new Error("useCloud must be used inside <CloudProvider>");
  return value;
}
