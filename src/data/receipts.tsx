import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";

import { usePersistedList } from "@/data/persisted-list";
import { receiptToRow, reconcile } from "@/lib/cloud-rows";
import { removeUnusedPhotos } from "@/data/receipt-photos";
import { isOldSample } from "@/lib/old-samples";
import type { Receipt } from "@/types/receipt";

/** Bump the version if the stored shape changes in a way old data can't be read. */
const STORAGE_KEY = "keepr.receipts.v1";
/** Set once the old sample receipts have been removed, so a real matching purchase is never touched later. */
const SAMPLES_REMOVED_KEY = "keepr.oldSamplesRemoved.v1";

export type ReceiptFields = Omit<Receipt, "id">;

type ReceiptsContextValue = {
  receipts: Receipt[];
  /** False until saved receipts have been read from the phone. */
  ready: boolean;
  addReceipt: (fields: ReceiptFields) => Receipt;
  /** Replaces a receipt's details. Its photo is kept unless `fields` sets one. */
  updateReceipt: (id: string, fields: ReceiptFields) => void;
  /** Attaches (or with undefined, removes) a receipt's photo file name. */
  setReceiptPhoto: (id: string, photo: string | undefined) => void;
  deleteReceipt: (id: string) => void;
  /** Puts a deleted receipt back, with its original id (for Undo). */
  restoreReceipt: (receipt: Receipt) => void;
  /** Brings in the cloud's changes. `base` is what the cloud held at the last sync (see reconcile). */
  mergeFromCloud: (remote: Receipt[], base: Receipt[]) => void;
};

const ReceiptsContext = createContext<ReceiptsContextValue | null>(null);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const [receipts, setReceipts, ready] = usePersistedList<Receipt>(STORAGE_KEY);

  const addReceipt = useCallback((fields: ReceiptFields) => {
    const receipt: Receipt = { id: randomUUID(), ...fields };
    setReceipts((current) => [...current, receipt]);
    return receipt;
  }, [setReceipts]);

  const updateReceipt = useCallback((id: string, fields: ReceiptFields) => {
    setReceipts((current) =>
      current.map((receipt) =>
        receipt.id === id ? { id, photo: receipt.photo, ownerId: receipt.ownerId, ...fields } : receipt,
      ),
    );
  }, [setReceipts]);

  const setReceiptPhoto = useCallback((id: string, photo: string | undefined) => {
    setReceipts((current) =>
      current.map((receipt) => {
        if (receipt.id !== id) return receipt;
        const { photo: _old, ...rest } = receipt;
        return photo ? { ...rest, photo } : rest;
      }),
    );
  }, [setReceipts]);

  const deleteReceipt = useCallback((id: string) => {
    setReceipts((current) => current.filter((receipt) => receipt.id !== id));
  }, [setReceipts]);

  // One-off clean-up of the sample receipts older versions could add. The deletes sync to the cloud as usual.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.getItem(SAMPLES_REMOVED_KEY)
      .then((done) => {
        if (done) return;
        setReceipts((current) => {
          const kept = current.filter((receipt) => !isOldSample(receipt));
          return kept.length === current.length ? current : kept;
        });
        return AsyncStorage.setItem(SAMPLES_REMOVED_KEY, "1");
      })
      .catch((error: unknown) => console.warn("Couldn't remove old sample receipts", error));
  }, [ready, setReceipts]);

  const restoreReceipt = useCallback(
    (receipt: Receipt) => setReceipts((current) => [...current.filter((item) => item.id !== receipt.id), receipt]),
    [setReceipts],
  );

  // Once per launch, delete photo files of receipts that were deleted (after Undo is no longer possible).
  useEffect(() => {
    if (!ready) return;
    removeUnusedPhotos(new Set(receipts.flatMap((receipt) => (receipt.photo ? [receipt.photo] : []))));
    // Only on the first load: running on every change would delete a photo while its Undo is still on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const mergeFromCloud = useCallback(
    // Old samples are skipped here too, so a sync can't bring back the ones just cleaned up (the next push deletes them).
    // shortcut: a real purchase with exactly a sample's product, shop and price would also be skipped; drop this filter
    // once every phone has run the clean-up.
    (remote: Receipt[], base: Receipt[]) =>
      setReceipts((current) =>
        reconcile(current, remote.filter((receipt) => !isOldSample(receipt)), base, receiptToRow),
      ),
    [setReceipts],
  );

  const value = useMemo(
    () => ({ receipts, ready, addReceipt, updateReceipt, setReceiptPhoto, deleteReceipt, restoreReceipt, mergeFromCloud }),
    [receipts, ready, addReceipt, updateReceipt, setReceiptPhoto, deleteReceipt, restoreReceipt, mergeFromCloud],
  );

  return <ReceiptsContext.Provider value={value}>{children}</ReceiptsContext.Provider>;
}

export function useReceiptsStore(): ReceiptsContextValue {
  const value = useContext(ReceiptsContext);
  if (!value) throw new Error("useReceiptsStore must be used inside <ReceiptsProvider>");
  return value;
}

export function useReceipts(): Receipt[] {
  return useReceiptsStore().receipts;
}

export function useReceipt(id: string | undefined): Receipt | undefined {
  return useReceipts().find((receipt) => receipt.id === id);
}
