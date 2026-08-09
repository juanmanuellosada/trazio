import { describe, expect, it, vi } from "vitest";
import { seedExampleContentIfNeeded } from "./seed-example-content";

/**
 * Mock mínimo de `createClient()` (`lib/supabase/server.ts`), tallado a las
 * llamadas exactas que hace `seedExampleContentIfNeeded`: un `update` con
 * `.eq().is().select().maybeSingle()` sobre `user_preferences` para
 * reclamar la marca, e `insert` sobre el resto de las tablas — algunos
 * encadenados con `.select().single()` (cuando el sembrado necesita el id
 * generado) y otros esperados directo (cuando no).
 *
 * `claim` controla qué devuelve la reclamación de `seeded_at`: cuántas
 * veces se puede "ganar la carrera" antes de que las siguientes reclamas
 * encuentren la fila ya tomada — así se simula tanto la cuenta ya sembrada
 * (0) como dos entradas simultáneas (1, para que solo una de las dos gane).
 * La atomicidad real de la reclamación es una garantía de Postgres (un solo
 * `update ... where seeded_at is null`, D-B): este mock verifica que el
 * código de `seedExampleContentIfNeeded` respeta lo que esa reclamación
 * devuelve, no reemplaza la verificación contra la base real.
 */
function createSeedSupabaseMock(wins: number) {
  let remainingWins = wins;
  const inserted: Record<string, unknown[]> = {};
  let nextId = 0;

  const from = vi.fn((table: string) => {
    if (table === "user_preferences") {
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(() => {
                  if (remainingWins <= 0) return Promise.resolve({ data: null, error: null });
                  remainingWins -= 1;
                  return Promise.resolve({
                    data: { timezone: "America/Argentina/Buenos_Aires", week_starts_on: 1 },
                    error: null,
                  });
                }),
              })),
            })),
          })),
        })),
      };
    }

    return {
      insert: vi.fn((payload: unknown) => {
        inserted[table] = [...(inserted[table] ?? []), payload];
        const settled = Promise.resolve({ data: null, error: null });
        return Object.assign(settled, {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: `id-${++nextId}` }, error: null })),
          })),
        });
      }),
    };
  });

  return { from, inserted };
}

describe("seedExampleContentIfNeeded", () => {
  it("una cuenta con seeded_at no nulo no siembra nada (tarea 3.4)", async () => {
    const mock = createSeedSupabaseMock(0);

    await seedExampleContentIfNeeded(mock as never, "user-1");

    expect(mock.from).toHaveBeenCalledTimes(1); // solo la reclamación sobre user_preferences
    expect(mock.inserted).toEqual({});
  });

  it("dos entradas simultáneas siembran una sola vez (tarea 3.3)", async () => {
    const mock = createSeedSupabaseMock(1); // solo una de las dos reclamaciones puede ganar

    await Promise.all([
      seedExampleContentIfNeeded(mock as never, "user-1"),
      seedExampleContentIfNeeded(mock as never, "user-1"),
    ]);

    expect(mock.inserted.projects).toHaveLength(1);
    expect(mock.inserted.habits).toHaveLength(1);
    expect(mock.inserted.filters).toHaveLength(1);
  });

  it("sembrando, crea un proyecto de ejemplo con cuatro tareas de primer nivel, tres subtareas, una etiqueta, un hábito y un filtro", async () => {
    const mock = createSeedSupabaseMock(1);

    await seedExampleContentIfNeeded(mock as never, "user-1");

    // Cuatro llamadas de `insert` para las tareas de primer nivel, más una
    // quinta con el array de las tres subtareas de una de ellas.
    const taskRows = mock.inserted.tasks.flatMap((payload) => (Array.isArray(payload) ? payload : [payload]));
    expect(mock.inserted.projects).toHaveLength(1);
    expect(mock.inserted.tasks).toHaveLength(5);
    expect(taskRows).toHaveLength(4 + 3);
    expect(mock.inserted.labels).toHaveLength(1);
    expect(mock.inserted.task_labels).toHaveLength(1);
    expect(mock.inserted.habits).toHaveLength(1);
    expect(mock.inserted.filters).toHaveLength(1);
    expect((mock.inserted.filters[0] as { is_favorite: boolean }).is_favorite).toBe(true);
  });
});
