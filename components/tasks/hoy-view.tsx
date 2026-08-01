"use client";

import { useMemo } from "react";
import { AlertTriangle, Sun } from "lucide-react";
import { isTaskCompletedToday, isTaskDueToday, isTaskOverdue } from "@/lib/dates/today";
import { useHoyTasks } from "@/lib/tasks/use-hoy-tasks";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import type { ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import type { Habit } from "@/lib/habits/habit-columns";
import { HabitsTodayBlock } from "@/components/habits/habits-today-block";
import { TodayEventsBlock } from "@/components/calendar/today-events-block";
import { TaskGroupList } from "./task-group-list";
import { TaskListEmptyState } from "./task-list-empty-state";
import { TaskQuickAddRow } from "./task-quick-add-row";

const VIEW_KEY = "hoy";

/**
 * Vista Hoy (bloque 8.2): atrasadas destacadas, tareas de hoy, y —
 * solo si el usuario lo pide — completadas de hoy, en ese orden fijo. Un
 * único caché cruza proyectos (`useHoyTasks`); el bucketing en bloques se
 * recalcula acá en memoria con `lib/dates/today.ts`, así que completar una
 * tarea la reubica de bloque sola, sin tocar tres cachés distintos.
 *
 * `nowIso` viene del Server Component (bloque 8, D1): usar el mismo
 * instante que ya usó el servidor evita que el bucketing del primer render
 * del cliente diverja por el simple paso del reloj entre el render y la
 * hidratación.
 *
 * Bloque 6 (`opciones-de-vista`): sin selector de forma de ver ni de días
 * adelante acá (no hay modo panel en Hoy, y la ventana es de Próximos). El
 * control "mostrar completadas" de la barra reemplaza al botón propio que
 * tenía antes esta vista para el bloque de completadas de hoy — ahora
 * persiste en `view_preferences` en vez de resetear al recargar.
 *
 * Bloque de hábitos del día (fase 3, tareas 4.1-4.5, spec `vistas-lista`
 * "Vista Hoy"): entre las tareas de hoy y los eventos, detrás del control
 * "mostrar hábitos" (`options.showHabits`, ya existente en el esquema desde
 * la fase 2). `HabitsTodayBlock` trae su propio hook y se devuelve `null`
 * sola si no hay ningún hábito para hoy, así que acá solo hace falta el
 * `if` de la opción. Un hábito no participa de la selección múltiple (tarea
 * 4.4): no usa `SelectionCheckbox` ni entra en `candidateTasks`.
 *
 * Bloque de eventos de hoy (fase 4, bloque 7.8): entre hábitos y
 * completadas, el orden que fija el spec. Igual que `HabitsTodayBlock`,
 * `TodayEventsBlock` trae su propio hook y se devuelve `null` sola cuando no
 * hay nada que mostrar (sin conexión, o conectado pero sin eventos hoy).
 */
export function HoyView({
  userId,
  timezone,
  inboxProjectId,
  initialTasks,
  initialHabits,
  nowIso,
  todayDate,
  initialOptions,
}: {
  userId: string;
  timezone: string;
  inboxProjectId: string | null;
  initialTasks: TaskRowData[];
  initialHabits: Habit[];
  nowIso: string;
  todayDate: string;
  initialOptions: ViewOptions;
}) {
  const { data } = useHoyTasks(userId, timezone, initialTasks);
  const { options } = useViewOptions(VIEW_KEY, initialOptions);
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const tasks = data ?? [];

  const overdueRaw = tasks.filter((t) => !t.completed_at && isTaskOverdue(t, timezone, now));
  const todayRaw = tasks.filter((t) => !t.completed_at && isTaskDueToday(t, timezone, now));
  const completedTodayRaw = tasks.filter((t) => t.completed_at && isTaskCompletedToday(t, timezone, now));

  const overdue = orderTasks(applyQuickFilters(overdueRaw, options.quickFilters, true), options.order, timezone);
  const today = orderTasks(applyQuickFilters(todayRaw, options.quickFilters, true), options.order, timezone);
  const completedToday = options.showCompleted
    ? orderTasks(applyQuickFilters(completedTodayRaw, options.quickFilters, true), options.order, timezone)
    : [];
  const isEmpty = overdue.length === 0 && today.length === 0;
  // Selección múltiple (bloque 7.10-7.13): cualquier tarea visible de Hoy es
  // candidata, atrasada, de hoy o completada de hoy por igual.
  const candidateTasks = [...overdue, ...today, ...completedToday].map((t) => ({ id: t.id, projectId: t.project_id }));

  return (
    <SelectionProvider>
      <div className="flex h-full flex-col">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex w-full max-w-content mx-auto items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sun aria-hidden className="size-5 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">Hoy</h1>
            </div>
            <ViewOptionsBar viewKey={VIEW_KEY} initialOptions={initialOptions} showViewShape={false} showDaysAhead={false} />
          </div>
        </header>
        <div className="w-full max-w-content mx-auto flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {inboxProjectId && (
            <TaskQuickAddRow projectId={inboxProjectId} sectionId={null} parentId={null} defaultDueDate={todayDate} />
          )}

          {isEmpty ? (
            <TaskListEmptyState
              icon={Sun}
              title="No tenés tareas para hoy."
              description="Acá van a aparecer las tareas atrasadas y las que venzan hoy. Usá el botón de arriba para agregar una."
            />
          ) : (
            <>
              {overdue.length > 0 && (
                <section>
                  {/* No usa el rojo de marca (#EC1E2A): ese color queda reservado
                      para prioridad Urgente y el ícono de la app
                      (docs/design-system.md §1). "Atrasadas" usa --warning, el
                      token semántico pensado para esto. */}
                  <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-warning">
                    <AlertTriangle aria-hidden className="size-4" />
                    Atrasadas
                  </h2>
                  <TaskGroupList tasks={overdue} allTasks={tasks} groupBy={options.groupBy} />
                </section>
              )}

              {today.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Hoy</h2>
                  <TaskGroupList tasks={today} allTasks={tasks} groupBy={options.groupBy} />
                </section>
              )}
            </>
          )}

          {options.showHabits && (
            <HabitsTodayBlock timezone={timezone} now={now} todayDate={todayDate} initialHabits={initialHabits} />
          )}

          <TodayEventsBlock todayDate={todayDate} timezone={timezone} />

          {completedToday.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">
                Completadas de hoy ({completedToday.length})
              </h2>
              <TaskGroupList tasks={completedToday} allTasks={tasks} groupBy={options.groupBy} />
            </section>
          )}
        </div>

        <SelectionActionBar candidateTasks={candidateTasks} />
      </div>
    </SelectionProvider>
  );
}
