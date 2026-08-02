const STORAGE_KEY = "trazio:recent-tasks";
const MAX_RECENT = 10;

/**
 * Tareas vistas recientemente (buscador-como-paleta, D-C): se guardan solo
 * los IDs, en `localStorage`, nunca título/datos denormalizados. El más
 * reciente va primero. Al mostrarlas, quien las consuma trae las tareas
 * actuales por esos IDs — una tarea borrada simplemente no vuelve en esa
 * consulta, sin lógica especial para detectarlo acá.
 */
export function getRecentTaskIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Marca una tarea como vista (D-C: abrir el detalle es lo que cuenta como "visto"). La mueve al frente si ya estaba, y recorta al tope. */
export function addRecentTaskId(taskId: string): void {
  if (typeof window === "undefined") return;
  const next = [taskId, ...getRecentTaskIds().filter((id) => id !== taskId)].slice(0, MAX_RECENT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
