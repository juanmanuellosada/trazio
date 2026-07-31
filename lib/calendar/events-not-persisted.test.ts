import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Tarea 3.3, D-C, requirement "Los eventos no dejan rastro en Postgres":
 * ninguna migración crea una tabla ni una columna para guardar eventos de
 * Google Calendar. `calendar_connections` (grupo 1) guarda la conexión —
 * `refresh_token`, `enabled_calendar_ids`, `status`—, no los eventos en sí.
 *
 * Es un escaneo de `supabase/migrations/`, mismo criterio que
 * `lib/calendar/google-client-secret-server-only.test.ts` usa para
 * `GOOGLE_CLIENT_SECRET`: una verificación automática y duradera en vez de
 * una mirada puntual que nadie repite en la próxima migración.
 */

const MIGRATIONS_DIR = fileURLToPath(new URL("../../supabase/migrations", import.meta.url));

// Nombres de tabla que indicarían que se está guardando el evento en sí
// (no la conexión con Google). `calendar_connections` queda afuera a
// propósito: es la tabla del grupo 1, y es la única de `calendar_*`
// esperada en todo este esquema.
const FORBIDDEN_TABLE_NAME_RE = /create table\s+public\.(calendar_events|google_events|events)\b/i;

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => join(MIGRATIONS_DIR, name));
}

describe("los eventos de Google Calendar no se guardan en la base de Trazio", () => {
  const migrationFiles = listMigrationFiles();

  it("hay migraciones para inspeccionar (si esto falla, el test no está mirando nada)", () => {
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  it("ninguna migración crea una tabla de eventos", () => {
    const offenders = migrationFiles.filter((file) => FORBIDDEN_TABLE_NAME_RE.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("`calendar_connections` (la única tabla de `calendar_*`) no tiene columnas de contenido de evento", () => {
    const connectionMigration = migrationFiles.find((file) => readFileSync(file, "utf8").includes("create table public.calendar_connections"));
    expect(connectionMigration).toBeDefined();

    const contents = readFileSync(connectionMigration!, "utf8");
    for (const eventField of ["summary", "event_title", "event_start", "event_end", "google_event_id"]) {
      expect(contents.toLowerCase()).not.toContain(eventField);
    }
  });
});
