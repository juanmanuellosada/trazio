import { describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { fetchCompletedTasks } from "./use-completed-tasks";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

/**
 * Completado (D25) ya ordena por `completed_at` descendente en la consulta
 * —no por `position`, que entre proyectos distintos no es comparable—. Este
 * test fija ese contrato: si alguien lo cambia sin querer (por ejemplo,
 * volviendo a `position`), se rompe acá.
 */
describe("fetchCompletedTasks — orden (D25)", () => {
  it("pide a la base el orden por completed_at descendente, la más reciente primero", async () => {
    const order = vi.fn(() => chainAfterOrder);
    const chainAfterOrder = { range: vi.fn(() => Promise.resolve({ data: [], error: null })) };
    const eq = vi.fn(() => ({ not: vi.fn(() => ({ order })) }));
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    });

    await fetchCompletedTasks("user-1", 50);

    expect(order).toHaveBeenCalledWith("completed_at", { ascending: false });
  });
});
