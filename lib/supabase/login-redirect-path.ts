/**
 * Arma la URL de login conservando el destino original (`redireccion-al-login`,
 * D-B/D-C): usa `URLSearchParams` para codificar `next`, igual que
 * `lib/supabase/proxy.ts` con `url.searchParams.set("next", ...)`, para que
 * el formato del parámetro sea idéntico venga del middleware o de una página.
 */
export function loginRedirectPath(next: string): string {
  const params = new URLSearchParams({ next });
  return `/login?${params.toString()}`;
}
