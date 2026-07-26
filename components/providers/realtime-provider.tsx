"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useQueryClient,
  type MutationCacheNotifyEvent,
  type QueryCacheNotifyEvent,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { subscribeToRealtime, type RealtimeStatus } from "@/lib/realtime/subscribe";
import { computeOffline } from "@/lib/realtime/connectivity";
import { isNetworkError } from "@/lib/realtime/network-error";
import { useNavigatorOnline } from "@/hooks/use-navigator-online";

type ConnectivityContextValue = { isOffline: boolean };

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

/** `true`/`false`/`null` (falla de red, éxito, o evento que no informa nada sobre la conexión). */
function networkOutcomeOf(event: QueryCacheNotifyEvent | MutationCacheNotifyEvent): boolean | null {
  if (event.type !== "updated") return null;
  const { action } = event;
  if (action.type === "success") return false;
  if (action.type === "error") return isNetworkError(action.error);
  return null;
}

/**
 * Bloque 10: monta la suscripción de Realtime de las tres tablas de fase 1
 * (`lib/realtime/subscribe.ts`) una sola vez por sesión de layout, con
 * cleanup al desmontar — que es lo que pasa al cerrar sesión, porque
 * `app/(app)/layout.tsx` deja de montarse. También combina las tres
 * señales de D4 (`lib/realtime/connectivity.ts`) y expone el resultado por
 * `useConnectivity()` para el cartel (`OfflineBanner`) y el límite
 * `inert` (`OfflineBoundary`).
 */
export function RealtimeProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigatorOnline = useNavigatorOnline();
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [recentNetworkFailure, setRecentNetworkFailure] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const statuses = new Map<string, RealtimeStatus>();
    const unsubscribe = subscribeToRealtime(supabase, queryClient, userId, (table, status) => {
      statuses.set(table, status);
      setRealtimeConnected([...statuses.values()].some((s) => s === "SUBSCRIBED"));
    });
    return unsubscribe;
  }, [queryClient, userId]);

  useEffect(() => {
    const handleEvent = (event: QueryCacheNotifyEvent | MutationCacheNotifyEvent) => {
      const outcome = networkOutcomeOf(event);
      if (outcome !== null) setRecentNetworkFailure(outcome);
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe(handleEvent);
    const unsubscribeMutations = queryClient.getMutationCache().subscribe(handleEvent);
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient]);

  const isOffline = computeOffline({ navigatorOnline, recentNetworkFailure, realtimeConnected });
  const value = useMemo<ConnectivityContextValue>(() => ({ isOffline }), [isOffline]);

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity(): ConnectivityContextValue {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error("useConnectivity se tiene que usar dentro de <RealtimeProvider>.");
  }
  return context;
}
