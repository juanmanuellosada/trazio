import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// 127.0.0.1, no "localhost": tiene que ser textualmente igual a `site_url`
// de `supabase/config.toml` (y a `http://127.0.0.1:3000/**` en
// `additional_redirect_urls`), o el link de confirmación/reset de Mailpit
// vuelve a `site_url` sin código y el callback no arma sesión.
const SITE_URL = "http://127.0.0.1:3000";

/**
 * Credenciales del Supabase local (Docker), nunca de producción:
 * `.env.local` apunta al proyecto remoto y esta función no lo lee ni lo
 * toca. Todo sale de `supabase status`, que solo tiene datos si el stack ya
 * está arriba (`pnpm supabase start`).
 */
function localSupabaseEnv(): Record<string, string> {
  let raw: string;
  try {
    raw = execSync("pnpm supabase status -o json", { encoding: "utf-8", cwd: __dirname });
  } catch {
    throw new Error(
      'No se pudo leer el estado de Supabase local. Ejecutá "pnpm supabase start" antes de "pnpm test:e2e".',
    );
  }
  const status = JSON.parse(raw) as Record<string, string>;

  if (!/^http:\/\/127\.0\.0\.1/.test(status.API_URL ?? "")) {
    throw new Error(
      `Supabase local no apunta a 127.0.0.1 (API_URL="${status.API_URL}"). Los tests e2e nunca corren contra un proyecto remoto.`,
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    MAILPIT_URL: status.MAILPIT_URL,
  };
}

const supabaseEnv = localSupabaseEnv();
// Mutar `process.env` en la evaluación del config (antes de que Playwright
// bifurque los workers) es lo que permite que `e2e/helpers/env.ts` lea
// estas mismas variables con `process.env.X` desde cualquier test.
Object.assign(process.env, supabaseEnv);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: SITE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Build de producción real (criterio 14.*: nada de esto vale contra
    // `next dev`). `next start` sin script propio en package.json: se
    // invoca directo para no sumar un script que nadie más pidió.
    command: "pnpm build && pnpm exec next start",
    url: SITE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: supabaseEnv,
  },
});
