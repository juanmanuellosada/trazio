/**
 * Resuelve la URL base pública de la app en tiempo de ejecución. La necesitan
 * el callback de OAuth y el reset de contraseña para armar redirects
 * absolutos que Google y los links de los correos de Resend puedan visitar.
 *
 * Prioridad: `NEXT_PUBLIC_SITE_URL` (fijada al dominio propio en
 * Production) > `VERCEL_URL` (que Vercel arma solo por deploy en Preview) >
 * `localhost`, para desarrollo local. Si se hardcodeara al dominio de
 * producción, el login con Google y el link de reset se romperían en cada
 * preview, que es justo donde se prueban.
 *
 * `requestHost`, si se pasa, gana por sobre el host fijo de
 * `NEXT_PUBLIC_SITE_URL` (armalo con `getRequestHost` a partir del pedido
 * real). Producción sirve canónicamente `www.trazio.com.ar` y el apex
 * responde 308 hacia ahí, pero las cookies de sesión son host-only: si algo
 * deja a alguien en el apex antes de este redirect, o el destino del 308
 * cambia, construir la URL siempre con el mismo host fijo partiría el
 * frasco de cookies en dos. Sin `requestHost` se cae al comportamiento de
 * siempre (necesario para `metadataBase`, que no tiene un pedido del que
 * leer host).
 */
export function getSiteUrl(requestHost?: string | null): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    const fixed = siteUrl.replace(/\/$/, "");
    if (requestHost) {
      try {
        return `${new URL(fixed).protocol}//${requestHost}`;
      } catch {
        // NEXT_PUBLIC_SITE_URL mal formada: mejor el valor fijo de siempre
        // que tirar acá.
        return fixed;
      }
    }
    return fixed;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

/**
 * Host real del pedido: `x-forwarded-host` primero (el dominio que vio
 * quien navega, detrás del proxy de Vercel), `host` como respaldo. No es
 * una fuente confiable para decisiones de autorización — acá solo arma la
 * URL visible de un redirect, nunca se usa para autenticar nada.
 */
export function getRequestHost(requestHeaders: Headers): string | null {
  return requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
}
