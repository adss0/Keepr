import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";

import { usePersistedList } from "@/data/persisted-list";
import { mergeById } from "@/lib/cloud-rows";
import { sampleReceipts } from "@/data/sample-receipts";
import type { Receipt } from "@/types/receipt";

/** Bump the version if the stored shape changes in a way old data can't be read. */
const STORAGE_KEY = "keepr.receipts.v1";

export type ReceiptFields = Omit<Receipt, "id">;

type ReceiptsContextValue = {
  receipts: Receipt[];
  /** False until saved receipts have been read from the phone. */
  ready: boolean;
  addReceipt: (fields: ReceiptFields) => Receipt;
  updateReceipt: (id: string, fields: ReceiptFields) => void;
  deleteReceipt: (id: string) => void;
  /** Adds the made-up example receipts, so the app can be tried out. */
  addSampleReceipts: () => void;
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

  const addSampleReceipts = useCallback(() => {
    setReceipts((current) => [
      ...current,
      ...sampleReceipts.map(({ id: _sampleId, ...fields }) => ({ id: randomUUID(), ...fields })),
    ]);
  }, [setReceipts]);

  const mergeFromCloud = useCallback(
    (remote: Receipt[]) => setReceipts((current) => mergeById(current, remote)),
    [setReceipts],
  );

  const value = useMemo(
    () => ({ receipts, ready, addReceipt, updateReceipt, deleteReceipt, addSampleReceipts, mergeFromCloud }),
    [receipts, ready, addReceipt, updateReceipt, deleteReceipt, addSampleReceipts, mergeFromCloud],
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
