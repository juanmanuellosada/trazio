import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { tasksQueryKey, type TaskRow } from "@/lib/tasks/use-tasks";
import { onTasksRealtimeEvent } from "./handlers";

/**
 * Bloque 10.7 — criterio de aceptación literal: un cambio en una pestaña
 * aparece en otra en menos de dos segundos. El round-trip real (escribir →
 * Postgres → replicación lógica → websocket de Realtime → esta pestaña) no
 * se puede fijar de forma determinista en un test sin un servidor de
 * Supabase corriendo, así que este test acota lo único que sí depende de
 * nuestro código: una vez que el evento de Realtime llega, el manejador
 * invalida de forma síncrona, sin debounce ni espera artificial propia.
 *
 * Cómo comprobar el criterio completo (los <2s de punta a punta) a mano:
 * 1. Iniciar sesión con la misma cuenta en dos pestañas (o un dispositivo
 *    distinto) sobre el mismo proyecto/vista.
 * 2. En la pestaña A, completar o editar una tarea.
 * 3. Cronometrar desde el click hasta que el cambio se ve en la pestaña B.
 *    Debería ser casi instantáneo y, en cualquier red normal, muy por
 *    debajo de dos segundos.
 */
describe("onTasksRealtimeEvent — latencia (bloque 10.7)", () => {
  it("invalida de forma síncrona apenas llega el evento, sin demora propia", () => {
    const queryClient = new QueryClient();
    const task: TaskRow = {
      id: "t1",
      project_id: "p1",
      section_id: null,
      parent_id: null,
      title: "Tarea",
      priority: 4,
      due_date: null,
      due_at: null,
      duration_minutes: null,
      deadline: null,
      completed_at: null,
      position: 1000,
      labels: [],
    };
    queryClient.setQueryData(tasksQueryKey("p1"), [task]);

    const start = performance.now();
    onTasksRealtimeEvent(queryClient);
    const elapsedMs = performance.now() - start;

    expect(queryClient.getQueryState(tasksQueryKey("p1"))?.isInvalidated).toBe(true);
    // Margen generoso: es una llamada síncrona que en la práctica dura microsegundos.
    expect(elapsedMs).toBeLessThan(50);
  });
});
