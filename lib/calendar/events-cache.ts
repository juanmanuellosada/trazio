/**
 * Caché en memoria del servidor, 60 segundos, por combinación de usuario,
 * calendario y rango (decisión D-C, tarea 3.2). Un `Map` de proceso, no
 * Redis ni Postgres: alcanza para que moverse entre semanas no dispare una
 * llamada a Google por cada clic, y como vive en memoria desaparece solo si
 * el proceso se reinicia — no hay nada que migrar ni limpiar.
 *
 * Por D1 no hay caché offline: `getCached` nunca devuelve un valor vencido
 * como si fuera vigente, solo `undefined` para que quien llama vuelva a
 * pedirlo. En un entorno serverless con varias instancias el caché es por
 * instancia, no compartido — aceptable para una ventana de 60 segundos que
 * ya es best-effort por diseño.
 */

type Entry<T> = { expiresAt: number; value: T };

const store = new Map<string, Entry<unknown>>();

export const EVENTS_CACHE_TTL_MS = 60_000;

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number = EVENTS_CACHE_TTL_MS): void {
  store.set(key, { expiresAt: Date.now() + ttlMs, value });
}

/**
 * Descarta las entradas de un calendario puntual, para que crear, editar o
 * eliminar un evento se vea reflejado en la próxima lectura sin esperar los
 * 60 segundos completos (las claves de rango son varias por calendario, así
 * que se borran todas las que empiecen con el prefijo `userId:calendarId:`).
 */
export function invalidateCalendar(userId: string, calendarId: string): void {
  const prefix = `${userId}:${calendarId}:`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Solo para tests: vacía el caché entre casos, ya que `store` es un módulo compartido. */
export function clearEventsCacheForTests(): void {
  store.clear();
}
