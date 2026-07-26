import { execSync } from "node:child_process";

/** Credenciales del stack de Supabase local, leídas de `supabase status`. */
export interface LocalSupabaseEnv {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

/**
 * Lee la URL y las claves del Supabase local corriendo en Docker vía
 * `supabase status -o env`, en vez de hardcodearlas: son las claves de
 * ejemplo del propio CLI, pero prefiere no repetirlas en el repo.
 */
export function getLocalSupabaseEnv(): LocalSupabaseEnv {
  let output: string;
  try {
    output = execSync("pnpm exec supabase status -o env", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(
      "No se pudo leer el estado de Supabase local con `supabase status`. " +
        "¿Está Docker corriendo y el stack levantado con `pnpm supabase start`? " +
        `Error original: ${(error as Error).message}`,
    );
  }

  const vars = new Map<string, string>();
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    if (match) vars.set(match[1], match[2]);
  }

  const apiUrl = vars.get("API_URL");
  const anonKey = vars.get("ANON_KEY");
  const serviceRoleKey = vars.get("SERVICE_ROLE_KEY");

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      "No se pudieron leer API_URL, ANON_KEY o SERVICE_ROLE_KEY de `supabase status -o env`.",
    );
  }

  return { apiUrl, anonKey, serviceRoleKey };
}
