import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";

import { usePersistedList } from "@/data/persisted-list";
import { mergeById } from "@/lib/cloud-rows";
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
  updateReceipt: (id: string, fields: ReceiptFields) => void;
  deleteReceipt: (id: string) => void;
  /** Puts a deleted receipt back, with its original id (for Undo). */
  restoreReceipt: (receipt: Receipt) => void;
  /** Adds items saved in the cloud that aren't on this phone yet. */
  mergeFromCloud: (remote: Receipt[]) => void;
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
    setReceipts((current) => current.map((receipt) => (receipt.id === id ? { id, ...fields } : receipt)));
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

  const mergeFromCloud = useCallback(
    // Old samples are skipped here too, so a sync can't bring back the ones just cleaned up (the next push deletes them).
    // shortcut: a real purchase with exactly a sample's product, shop and price would also be skipped; drop this filter
    // once every phone has run the clean-up.
    (remote: Receipt[]) => setReceipts((current) => mergeById(current, remote.filter((receipt) => !isOldSample(receipt)))),
    [setReceipts],
  );

  const value = useMemo(
    () => ({ receipts, ready, addReceipt, updateReceipt, deleteReceipt, restoreReceipt, mergeFromCloud }),
    [receipts, ready, addReceipt, updateReceipt, deleteReceipt, restoreReceipt, mergeFromCloud],
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
