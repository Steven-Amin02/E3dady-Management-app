'use client';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createAppStore, type AppState, type AppStore } from '@/lib/appStore';
import { selectionSnapshot } from '@/lib/storeSelection';
const AppContext = createContext<AppStore | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createAppStore);
  useEffect(() => store.start(), [store]);
  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}
const identity = (state: AppState) => state;
export function useApp<T = AppState>(selector: (state: AppState) => T = identity as (state: AppState) => T): T {
  const store = useContext(AppContext);
  if (!store) throw new Error('useApp must be used within AppProvider');
  const getSelection = useMemo(() => selectionSnapshot(store.getSnapshot, selector), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}
