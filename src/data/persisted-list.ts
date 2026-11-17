import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

/**
 * A list kept in React state and saved on the phone under `storageKey`.
 * `ready` is false until the saved copy has been read, and nothing is written before then.
 * If the saved copy can't be read, nothing is ever written, so a bad read can't wipe the real data.
 */
export function usePersistedList<T>(storageKey: string): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const loadFailed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!cancelled && stored) setItems(JSON.parse(stored) as T[]);
      })
      .catch((error: unknown) => {
        loadFailed.current = true;
        console.warn(`Couldn't load ${storageKey}, so changes won't be saved this session`, error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!ready || loadFailed.current) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(items)).catch((error: unknown) =>
      console.warn(`Couldn't save ${storageKey}`, error),
    );
  }, [items, ready, storageKey]);

  return [items, setItems, ready];
}
