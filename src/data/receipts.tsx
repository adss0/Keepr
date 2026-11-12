import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
};

const ReceiptsContext = createContext<ReceiptsContextValue | null>(null);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && stored) setReceipts(JSON.parse(stored) as Receipt[]);
      })
      .catch((error: unknown) => console.warn("Couldn't load saved receipts", error))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(receipts)).catch((error: unknown) =>
      console.warn("Couldn't save receipts", error),
    );
  }, [receipts, ready]);

  const addReceipt = useCallback((fields: ReceiptFields) => {
    const receipt: Receipt = { id: randomUUID(), ...fields };
    setReceipts((current) => [...current, receipt]);
    return receipt;
  }, []);

  const updateReceipt = useCallback((id: string, fields: ReceiptFields) => {
    setReceipts((current) => current.map((receipt) => (receipt.id === id ? { id, ...fields } : receipt)));
  }, []);

  const deleteReceipt = useCallback((id: string) => {
    setReceipts((current) => current.filter((receipt) => receipt.id !== id));
  }, []);

  const addSampleReceipts = useCallback(() => {
    setReceipts((current) => [
      ...current,
      ...sampleReceipts.map(({ id: _sampleId, ...fields }) => ({ id: randomUUID(), ...fields })),
    ]);
  }, []);

  const value = useMemo(
    () => ({ receipts, ready, addReceipt, updateReceipt, deleteReceipt, addSampleReceipts }),
    [receipts, ready, addReceipt, updateReceipt, deleteReceipt, addSampleReceipts],
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
