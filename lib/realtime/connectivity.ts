export type ConnectivitySignals = {
  /** Señal 1: `navigator.onLine`. Negativo rápido y barato, pero no confiable en positivo. */
  navigatorOnline: boolean;
  /** Señal 2, autoritativa: una query o mutación de TanStack Query falló por red hace poco. */
  recentNetworkFailure: boolean;
  /** Señal 3: al menos un canal de Realtime está `SUBSCRIBED`. Confirma la pérdida como sostenida. */
  realtimeConnected: boolean;
};

/**
 * D4: combina las tres señales sin ningún healthcheck periódico. Sin
 * conexión si (1) es falsa, o si (2) falló y (3) está caído — un fallo de
 * red aislado con el canal de Realtime todavía conectado no alcanza.
 */
export function computeOffline({ navigatorOnline, recentNetworkFailure, realtimeConnected }: ConnectivitySignals): boolean {
  if (!navigatorOnline) return true;
  return recentNetworkFailure && !realtimeConnected;
}
