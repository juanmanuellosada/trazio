import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Tarea 3.8, requirement "Las tareas y los hábitos de Trazio no se publican
 * en Google": la conexión es de un solo sentido para tareas y hábitos —
 * Trazio lee y edita eventos que ya existen en Google, pero crear, editar,
 * completar o eliminar una tarea o un hábito nunca dispara una llamada a
 * Google.
 *
 * Se verifica de la única forma que no se vuelve a romper en silencio: si
 * ningún archivo bajo `lib/tasks/`, `lib/habits/`, `components/tasks/` o
 * `components/habits/` importa nada de `lib/calendar/`, no hay ningún
 * camino de código por el que una tarea o un hábito termine llamando a la
 * API de Google. Mismo criterio de escaneo que
 * `lib/calendar/google-client-secret-server-only.test.ts` usa para
 * `GOOGLE_CLIENT_SECRET`.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WATCHED_DIRS = ["lib/tasks", "lib/habits", "components/tasks", "components/habits"];
const CALENDAR_IMPORT_RE = /from\s+["']@\/lib\/calendar\//;

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("las tareas y los hábitos de Trazio nunca se publican en Google", () => {
  const sourceFiles = WATCHED_DIRS.flatMap((dir) => listSourceFiles(join(REPO_ROOT, dir)));

  it("hay archivos para inspeccionar (si esto falla, el test no está mirando nada)", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it("ningún archivo de tareas o hábitos importa de lib/calendar/", () => {
    const offenders = sourceFiles.filter((file) => CALENDAR_IMPORT_RE.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
