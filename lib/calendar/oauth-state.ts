import { cookies } from "next/headers";

/**
 * Cookie httpOnly que guarda el `state` de la protección CSRF del flujo de
 * OAuth con Google (tarea 2.3): `app/api/auth/google/route.ts` la escribe
 * antes de mandar a Google, y `app/api/auth/google/callback/route.ts` la lee
 * y la compara con el `state` que vuelve en la URL antes de canjear el
 * código. Sin coincidencia exacta, se rechaza sin llamar a Google.
 *
 * Vive en un archivo aparte de los dos `route.ts`: Next.js solo reconoce
 * `GET`/`POST`/etc. como exports válidos de un archivo de ruta, así que
 * cualquier constante o función compartida entre rutas tiene que salir de
 * ahí.
 */
const STATE_COOKIE_NAME = "google_oauth_state";
const STATE_COOKIE_MAX_AGE_SECONDS = 600;

export async function setOAuthStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
  });
}

/** Lee y borra la cookie de `state` en un solo paso: se usa una única vez, en el callback. */
export async function consumeOAuthStateCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(STATE_COOKIE_NAME)?.value ?? null;
  cookieStore.delete({ name: STATE_COOKIE_NAME, path: "/api/auth/google" });
  return value;
}
