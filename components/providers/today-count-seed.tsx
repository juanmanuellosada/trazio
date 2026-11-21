"use client";

import { usePendingTodayCount } from "@/lib/pending-count/pending-today-count";
import type { Habit } from "@/lib/habits/use-habits";

/**
 * Siembra el caché de `usePendingTodayCount` (mismo hook que ya alimenta el
 * badge del ícono y el título del documento, `use-pending-today-sync.ts`)
 * con lo que ya trajo el Server Component del layout (`getTodayCountSeed`),
 * igual patrón que `AllSectionsSeed`/`HoyEventsSeed`. Tiene que montarse
 * antes que `AppSidebar`/`MobileNav`/`AppBadgeSync` (primer hijo de
 * `PreferencesProvider` en el layout): la siembra (`initialData`) solo
 * aplica la primera vez que TanStack Query crea la consulta para esa
 * clave, así que si el panel lateral la creara primero sin datos, esta
 * siembra llegaría tarde y el badge arrancaría vacío igual — que es
 * exactamente el parpadeo que vino a evitar (bug
 * `hoy-congelado-en-el-sidebar`).
 */
export function TodayCountSeed({ initialTaskCount, initialHabits }: { initialTaskCount: number; initialHabits: Habit[] }) {
  usePendingTodayCount(initialTaskCount, initialHabits);
  return null;
}
