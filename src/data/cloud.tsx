import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { useReceiptsStore } from "@/data/receipts";
import { useSubscriptions } from "@/data/subscriptions";
import { type LinkParams, recoveryParams, signInRedirectParams } from "@/lib/recovery-link";
import { forgetPushToken, notifySpaceMembers } from "@/data/push-notifications";
import { deleteRemotePhotos, uploadNewPhotos } from "@/data/receipt-photos";
import { supabase } from "@/data/supabase";
import {
  type ReceiptRow,
  changedSince,
  receiptToRow,
  removedIds,
  rowToReceipt,
  rowToSubscription,
  type SubscriptionRow,
  subscriptionToRow,
  withCloudCopies,
} from "@/lib/cloud-rows";
import type { Receipt } from "@/types/receipt";
import type { Subscription } from "@/types/subscription";
import { errorMessage } from "@/lib/format";

/** Wait this long after the last change before saving to the cloud. */
const PUSH_DELAY_MS = 1000;

export type CloudStatus = "not_set_up" | "signed_out" | "syncing" | "synced" | "error";

type CloudContextValue = {
  status: CloudStatus;
  email: string | undefined;
  /** The name others see in shared spaces: the one the user chose, else their Google name. */
  displayName: string | undefined;
  /** Saves the name others see. */
  setDisplayName: (name: string) => Promise<void>;
  /** The signed-in user's id, for their backed-up photos. */
  userId: string | undefined;
  lastSyncedAt: Date | undefined;
  error: string | undefined;
  /** Why the account was signed out when the person didn't ask, such as a sign-in that couldn't be refreshed. */
  notice: string | undefined;
  /** The ways this account can sign in, such as ["email", "google"]. */
  providers: string[];
  /** Signs out every other phone and browser using this account; this one stays signed in. */
  signOutOtherDevices: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Creates an account. Resolves with a message to show, such as "check your email". */
  signUp: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  /**
   * Signs in (or signs up) with Google. On a phone it opens Google in a browser sheet and finishes there;
   * resolves false if the person closes it. On the web the page goes to Google and comes back to /account.
   */
  signInWithGoogle: () => Promise<boolean>;
  /** Finishes a Google sign-in from the address Supabase sent the browser back to. False if it holds no sign-in. */
  completeSignInRedirect: (url: string) => Promise<boolean>;
  syncNow: () => Promise<void>;
  /** Emails a link that opens Keepr's Reset password screen on this device. */
  sendPasswordResetEmail: (email: string) => Promise<void>;
  /**
   * Signs in from the reset link Keepr was opened with. Returns false if the URL isn't a reset link.
   * Throws if the link has expired or was already used.
   */
  startPasswordRecovery: (url: string) => Promise<boolean>;
  /** Sets a new password for the signed-in user. */
  updatePassword: (newPassword: string) => Promise<void>;
};

const CloudContext = createContext<CloudContextValue | null>(null);

/** After a change arrives from someone else, wait this long for more before pulling. */
const REMOTE_PULL_DELAY_MS = 800;
const SYNC_BASE_KEY = "keepr.syncBase.v1";

type SyncBase = { userId: string; receipts: Receipt[]; subscriptions: Subscription[] };

async function loadSyncBase(userId: string): Promise<SyncBase> {
  const stored = await AsyncStorage.getItem(`${SYNC_BASE_KEY}:${userId}`).catch(() => null);
  const parsed = stored ? (JSON.parse(stored) as Partial<SyncBase>) : {};
  return { userId, receipts: parsed.receipts ?? [], subscriptions: parsed.subscriptions ?? [] };
}

async function saveSyncBase(syncBase: SyncBase): Promise<void> {
  await AsyncStorage.setItem(`${SYNC_BASE_KEY}:${syncBase.userId}`, JSON.stringify(syncBase)).catch((error: unknown) =>
    console.warn("Couldn't save sync state", error),
  );
}

/**
 * Upserts rows, dropping columns the database doesn't have yet (PostgREST error PGRST204), so a phone on a newer
 * app version keeps syncing before the matching migration has run. Up to 6 missing columns.
 */
async function upsertRows<R extends Record<string, unknown>>(table: "receipts" | "subscriptions", rows: R[]) {
  let current: Record<string, unknown>[] = rows;
  for (let attempt = 0; ; attempt++) {
    const result = await supabase!.from(table).upsert(current);
    const missing = result.error?.code === "PGRST204" ? /'([^']+)' column/.exec(result.error.message)?.[1] : undefined;
    if (!missing || attempt === 6) return result;
    current = current.map(({ [missing]: _dropped, ...row }) => row);
  }
}

/** Postgres's "permission denied", which row level security gives for a row this user may not change. */
const PERMISSION_DENIED = "42501";

/**
 * After an upsert failed, saves the rows one at a time and returns the ids the database refused permission for
 * (shared items someone else added). Any other failure is thrown as before. No error: nothing refused.
 */
async function refusedRows<R extends { id: string }>(
  table: "receipts" | "subscriptions",
  error: { code?: string } | null | undefined,
  rows: R[],
): Promise<Set<string>> {
  const refused = new Set<string>();
  if (!error) return refused;
  if (error.code !== PERMISSION_DENIED) throw error;
  for (const row of rows) {
    const result = await upsertRows(table, [row]);
    if (result.error?.code === PERMISSION_DENIED) refused.add(row.id);
    else if (result.error) throw result.error;
  }
  return refused;
}

/**
 * Signs in with the tokens Supabase put in a link (a password reset, or the way back from Google).
 * False if the link holds none; throws the link's own error, such as an expired link.
 */
async function signInWithLinkTokens(params: LinkParams): Promise<boolean> {
  if (!supabase) return false;
  if (params.error) throw new Error(params.error);
  if (!params.accessToken || !params.refreshToken) return false;
  const { error } = await supabase.auth.setSession({ access_token: params.accessToken, refresh_token: params.refreshToken });
  if (error) throw error;
  return true;
}

/** Signs in with Supabase and keeps receipts and subscriptions in step with the cloud. */
export function CloudProvider({ children }: { children: ReactNode }) {
  const { receipts, ready: receiptsReady, mergeFromCloud: mergeReceipts } = useReceiptsStore();
  const { subscriptions, ready: subscriptionsReady, mergeFromCloud: mergeSubscriptions } = useSubscriptions();

  const [session, setSession] = useState<Session | null>(null);
  const [syncState, setSyncState] = useState<"syncing" | "synced" | "error">("syncing");
  const [error, setError] = useState<string>();
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>();
  const [notice, setNotice] = useState<string>();
  /** Set while the person signs out themselves, so it isn't reported as an unexpected sign-out. */
  const signingOut = useRef(false);
  /** The user the cloud was last pulled for, and how many pulls so far. Changes are only pushed after a pull. */
  const [pulled, setPulled] = useState<{ userId: string; count: number }>();
  /** Pulls and pushes run one at a time: overlapping ones could undo each other (e.g. bring back a delete). */
  const queue = useRef<Promise<void>>(Promise.resolve());
  /** What the cloud held at the last sync on this phone, saved per user. reconcile and pushes compare against it. */
  const base = useRef<SyncBase>({ userId: "", receipts: [], subscriptions: [] });

  useEffect(() => {
    if (!supabase) return;
    // An anonymous session only exists so signed-out users can scan; it never syncs or counts as signed in.
    const keepRealSession = (newSession: Session | null) => {
      const real = newSession?.user.is_anonymous ? null : newSession;
      setSession(real);
      if (real) return;
      // Signed out: what the last account synced (and any error) no longer applies.
      setLastSyncedAt(undefined);
      setError(undefined);
      setSyncState("syncing");
    };
    supabase.auth.getSession().then(({ data }) => keepRealSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" && !signingOut.current) {
        setNotice(
          "Keepr was signed out because your sign-in couldn't be renewed, usually after a while offline. Sign in again to carry on backing up. Your receipts are still here.",
        );
      }
      if (newSession && !newSession.user.is_anonymous) setNotice(undefined);
      signingOut.current = false;
      keepRealSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const pull = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      if (base.current.userId !== userId) base.current = await loadSyncBase(userId);
      const [receiptRows, subscriptionRows] = await Promise.all([
        supabase.from("receipts").select("*"),
        supabase.from("subscriptions").select("*"),
      ]);
      if (receiptRows.error) throw receiptRows.error;
      if (subscriptionRows.error) throw subscriptionRows.error;
      const remoteReceipts = (receiptRows.data as ReceiptRow[]).map(rowToReceipt);
      const remoteSubscriptions = (subscriptionRows.data as SubscriptionRow[]).map(rowToSubscription);
      mergeReceipts(remoteReceipts, base.current.receipts);
      mergeSubscriptions(remoteSubscriptions, base.current.subscriptions);
      base.current = { userId, receipts: remoteReceipts, subscriptions: remoteSubscriptions };
      await saveSyncBase(base.current);
      setLastSyncedAt(new Date());
    },
    [mergeReceipts, mergeSubscriptions],
  );

  const push = useCallback(async (localReceipts: Receipt[], localSubscriptions: Subscription[], userId: string) => {
    if (!supabase || base.current.userId !== userId) return;
    const before = base.current;
    // Only what changed since the last sync, so one person's push never overwrites another's newer edit.
    const changedReceipts = changedSince(localReceipts, before.receipts, receiptToRow);
    const changedSubscriptions = changedSince(localSubscriptions, before.subscriptions, subscriptionToRow);
    const deletedReceipts = removedIds(before.receipts, localReceipts);
    const deletedSubscriptions = removedIds(before.subscriptions, localSubscriptions);
    if (changedReceipts.length + changedSubscriptions.length + deletedReceipts.length + deletedSubscriptions.length === 0) {
      setSyncState("synced");
      return;
    }

    setSyncState("syncing");
    const [receiptsSaved, subscriptionsSaved, ...deletes] = await Promise.all([
      changedReceipts.length > 0 ? upsertRows("receipts", changedReceipts.map(receiptToRow)) : null,
      changedSubscriptions.length > 0 ? upsertRows("subscriptions", changedSubscriptions.map(subscriptionToRow)) : null,
      // A delete the database refuses removes nothing without an error, and the next pull brings the item back.
      deletedReceipts.length > 0 ? supabase.from("receipts").delete().in("id", deletedReceipts) : null,
      deletedSubscriptions.length > 0 ? supabase.from("subscriptions").delete().in("id", deletedSubscriptions) : null,
    ]);
    const failedDelete = deletes.find((result) => result?.error);
    if (failedDelete?.error) throw failedDelete.error;
    // Shared items this account isn't allowed to change: save the rest, and put those back as the cloud has them.
    const refusedReceipts = await refusedRows("receipts", receiptsSaved?.error, changedReceipts.map(receiptToRow));
    const refusedSubscriptions = await refusedRows(
      "subscriptions",
      subscriptionsSaved?.error,
      changedSubscriptions.map(subscriptionToRow),
    );
    const savedReceipts = withCloudCopies(localReceipts, before.receipts, refusedReceipts);
    const savedSubscriptions = withCloudCopies(localSubscriptions, before.subscriptions, refusedSubscriptions);
    const refused = refusedReceipts.size + refusedSubscriptions.size;
    if (refused > 0) {
      // Local is the "base" here, so only the refused items change: back to the cloud's copy.
      mergeReceipts(savedReceipts, localReceipts);
      mergeSubscriptions(savedSubscriptions, localSubscriptions);
    }
    // Tell other members about receipts and subscriptions just added to their spaces.
    if ([...changedReceipts, ...changedSubscriptions].some((item) => item.spaceId)) notifySpaceMembers();

    // Photos follow the rows: back up new ones, and remove those of deleted receipts. Failures don't block the sync.
    // A shared receipt's photo lives in the folder of whoever added it.
    const photoOf = (receipt: Receipt) => ({ folder: receipt.ownerId ?? userId, name: receipt.photo! });
    await Promise.all([
      uploadNewPhotos(localReceipts.filter((receipt) => receipt.photo).map(photoOf)),
      deleteRemotePhotos(before.receipts.filter((r) => r.photo && deletedReceipts.includes(r.id)).map(photoOf)),
    ]).catch((photoError: unknown) => console.warn("Couldn't sync receipt photos", photoError));

    // The cloud now matches the phone (anything others added since arrives with the next pull).
    base.current = { userId, receipts: savedReceipts, subscriptions: savedSubscriptions };
    await saveSyncBase(base.current);
    setLastSyncedAt(new Date());
    setSyncState("synced");
    setError(
      refused > 0
        ? `${refused === 1 ? "A change to a shared item wasn't" : `${refused} changes to shared items weren't`} saved: only whoever added an item, or the space's owner and admins, can change it. It's back as it was.`
        : undefined,
    );
  }, [mergeReceipts, mergeSubscriptions]);

  /** Adds work to the sync queue, reporting any error on the Account screen. */
  const enqueue = useCallback((work: () => Promise<void>) => {
    queue.current = queue.current.then(work).catch((syncError: unknown) => {
      setSyncState("error");
      setError(errorMessage(syncError));
    });
    return queue.current;
  }, []);

  /** Pulls the cloud's latest, then lets the push effect send anything changed here. */
  const pullNow = useCallback(
    (userId: string) =>
      enqueue(async () => {
        await pull(userId);
        setPulled((current) => ({ userId, count: (current?.userId === userId ? current.count : 0) + 1 }));
      }),
    [enqueue, pull],
  );

  // When someone signs in (or the app opens signed in), fetch what's in the cloud first.
  useEffect(() => {
    if (!supabase || !session || !receiptsReady || !subscriptionsReady) return;
    pullNow(session.user.id);
  }, [session, receiptsReady, subscriptionsReady, pullNow]);

  // Shared spaces: pull when someone else changes something (Realtime), and whenever the app comes back to the front.
  useEffect(() => {
    if (!supabase || !session || pulled?.userId !== session.user.id) return;
    const client = supabase;
    const userId = session.user.id;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Changes often arrive in bursts (and include echoes of our own pushes), so wait a moment and pull once.
    const schedulePull = () => {
      clearTimeout(timer);
      timer = setTimeout(() => pullNow(userId), REMOTE_PULL_DELAY_MS);
    };
    const channel = client
      .channel(`keepr-sync-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "receipts" }, schedulePull)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, schedulePull)
      .subscribe();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") schedulePull();
    });
    return () => {
      clearTimeout(timer);
      appState.remove();
      client.removeChannel(channel);
    };
    // Depends on the pulled user, not the pull count, so it re-subscribes per user rather than on every pull.
  }, [session, pulled?.userId, pullNow]);

  // After each pull, and after every later change, save to the cloud.
  useEffect(() => {
    if (!session || pulled?.userId !== session.user.id) return;
    const timer = setTimeout(() => {
      enqueue(() => push(receipts, subscriptions, session.user.id));
    }, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [session, pulled, receipts, subscriptions, push, enqueue]);

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
    // Stop this phone getting the account's shared-space notifications first, while still signed in.
    await forgetPushToken().catch(() => undefined);
    signingOut.current = true;
    await supabase?.auth.signOut();
  }, []);

  const signOutOtherDevices = useCallback(async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    if (signOutError) throw signOutError;
  }, []);

  const completeSignInRedirect = useCallback((url: string) => signInWithLinkTokens(signInRedirectParams(url)), []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return false;
    // Must be in Supabase's allowed redirect list (Authentication > URL Configuration), see docs/cloud-setup.md.
    const redirectTo = Platform.OS === "web" ? `${window.location.origin}/account` : Linking.createURL("/account");
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== "web" },
    });
    if (oauthError) throw oauthError;
    if (Platform.OS === "web") return false; // The page is on its way to Google.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return false;
    return completeSignInRedirect(result.url);
  }, [completeSignInRedirect]);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    if (!supabase) return;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL("/reset-password"),
    });
    if (resetError) throw resetError;
  }, []);

  const startPasswordRecovery = useCallback((url: string) => signInWithLinkTokens(recoveryParams(url)), []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    if (updateError) throw updateError;
  }, []);

  const syncNow = useCallback(async () => {
    if (!session) return;
    setSyncState("syncing");
    await pullNow(session.user.id);
  }, [pullNow, session]);

  const status: CloudStatus = !supabase ? "not_set_up" : !session ? "signed_out" : syncState;
  const metadata = session?.user.user_metadata;
  const displayName = [metadata?.display_name, metadata?.full_name, metadata?.name]
    .find((name): name is string => typeof name === "string" && name.trim() !== "")
    ?.trim();

  const value = useMemo(
    () => ({
      status,
      email: session?.user.email,
      displayName,
      setDisplayName,
      userId: session?.user.id,
      providers: (session?.user.app_metadata.providers as string[] | undefined) ?? [],
      lastSyncedAt,
      error,
      notice,
      signOutOtherDevices,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      completeSignInRedirect,
      syncNow,
      sendPasswordResetEmail,
      startPasswordRecovery,
      updatePassword,
    }),
    [
      status,
      session,
      displayName,
      setDisplayName,
      lastSyncedAt,
      error,
      notice,
      signOutOtherDevices,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      completeSignInRedirect,
      syncNow,
      sendPasswordResetEmail,
      startPasswordRecovery,
      updatePassword,
    ],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const value = useContext(CloudContext);
  if (!value) throw new Error("useCloud must be used inside <CloudProvider>");
  return value;
}

/** Pull-to-refresh for lists: syncs with the cloud when signed in, otherwise just acknowledges the pull. */
export function usePullToSync() {
  const { status, syncNow } = useCloud();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (status !== "not_set_up" && status !== "signed_out") {
        await syncNow();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } finally {
      setRefreshing(false);
    }
  }, [status, syncNow]);

  return { refreshing, onRefresh };
}
