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
 */
export function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}
