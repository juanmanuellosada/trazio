import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env";

/**
 * Cliente admin (clave `service_role`) para fixtures que no ejercitan el
 * flujo de auth en sí (14.4 a 14.9): crea usuarios ya confirmados, sin pasar
 * por Mailpit, para no repetir el flujo completo de correo en cada test que
 * solo necesita "una cuenta que ya funciona". El flujo de correo real
 * (registro, confirmación, reset) se prueba aparte en `auth.ts`/14.1 y en
 * `full-flow.spec.ts`/14.11, que sí son los criterios que lo piden.
 *
 * Nunca sale de acá ni se usa fuera de `e2e/`: es exactamente la clave que
 * `.claude/rules/database.md` prohíbe exponer al cliente de la app.
 */
function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createConfirmedUser(options: { email: string; password: string; fullName: string }) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
    user_metadata: { full_name: options.fullName },
  });
  if (error) throw error;
  return data.user;
}

/**
 * Escribe `options` directo en `view_preferences` (bypass de RLS con
 * `service_role`), para sembrar un estado que la aplicación ya no escribe
 * por su cuenta —como `groupBy: "nada"` en la clave de un proyecto, el
 * valor guardado antes de la migración de `lista-con-mas-agrupadores`
 * (D49)— y comprobar en el navegador que el código lo maneja bien. No pasa
 * por `parseViewOptions`: `options` viaja tal cual al `jsonb`.
 */
export async function setViewPreferences(userId: string, viewKey: string, options: Record<string, unknown>) {
  const admin = createAdminClient();
  const { error } = await admin.from("view_preferences").upsert({ user_id: userId, view_key: viewKey, options });
  if (error) throw error;
}
