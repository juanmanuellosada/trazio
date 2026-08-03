// Puerto fijo del servidor simulado de Google Calendar (tarea 8.11):
// compartido entre `playwright.config.ts` (que lo levanta y setea
// `GOOGLE_API_BASE_URL` con este valor) y `google-calendar-mock-server.ts`
// (que escucha acá). Un solo lugar para no repetir el número.
export const MOCK_GOOGLE_PORT = 5601;
export const MOCK_GOOGLE_BASE_URL = `http://127.0.0.1:${MOCK_GOOGLE_PORT}`;

// Origen real de la app durante los e2e (`SITE_URL` de `playwright.config.ts`):
// el mock lo usa para armar la vuelta del "consentimiento" de Google, en vez
// de confiar en `redirect_uri` tal cual la manda `google-client.ts` (que sale
// de `GOOGLE_REDIRECT_URI` en `.env.local`, pensada para `pnpm dev` en
// `localhost`, un host distinto de `127.0.0.1` a efectos de cookies).
export const E2E_APP_ORIGIN = process.env.E2E_APP_ORIGIN ?? "http://127.0.0.1:3000";
