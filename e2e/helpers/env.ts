// `playwright.config.ts` deja estas variables en `process.env` al cargarse
// (antes de bifurcar los workers), con los valores de `supabase status`
// local. Nada acá lee ni referencia `.env.local` (producción).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta ${name}. Los tests e2e necesitan Supabase local corriendo: ejecutá "pnpm supabase start" antes de "pnpm test:e2e".`,
    );
  }
  return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
export const SITE_URL = required("NEXT_PUBLIC_SITE_URL");
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

if (!/^http:\/\/127\.0\.0\.1/.test(SUPABASE_URL)) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL ("${SUPABASE_URL}") no apunta a Supabase local. Los tests e2e nunca corren contra producción.`,
  );
}
