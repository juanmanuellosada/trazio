/**
 * Evita el open redirect: solo se acepta un destino interno (`/algo`), nunca
 * una URL absoluta ni un `//` que el navegador interprete como protocolo
 * relativo. Lo usan el callback de OAuth/reset y las pantallas que leen
 * `?next=` de la URL (login, registro) antes de propagarlo a Google o a un
 * redirect propio.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/bandeja"): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return fallback;
}

/** Arma el link a otra pantalla de auth, propagando `next` solo si no es el default. */
export function appendNext(path: string, next: string, fallback = "/bandeja"): string {
  return next === fallback ? path : `${path}?next=${encodeURIComponent(next)}`;
}
