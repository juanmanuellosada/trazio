"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Sun } from "lucide-react";
import { isTaskCompletedToday, isTaskDueToday, isTaskOverdue } from "@/lib/dates/today";
import { useHoyTasks } from "@/lib/tasks/use-hoy-tasks";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { cn } from "@/lib/utils";
import { TaskListEmptyState } from "./task-list-empty-state";
import { TaskQuickAddRow } from "./task-quick-add-row";
import { TaskRow } from "./task-row";

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
 */
export function HoyView({
  userId,
  timezone,
  inboxProjectId,
  initialTasks,
  nowIso,
  todayDate,
}: {
  userId: string;
  timezone: string;
  inboxProjectId: string | null;
  initialTasks: TaskRowData[];
  nowIso: string;
  todayDate: string;
}) {
  const { data } = useHoyTasks(userId, timezone, initialTasks);
  const [showCompleted, setShowCompleted] = useState(false);
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const tasks = data ?? [];

  const overdue = tasks.filter((t) => !t.completed_at && isTaskOverdue(t, timezone, now));
  const today = tasks.filter((t) => !t.completed_at && isTaskDueToday(t, timezone, now));
  const completedToday = tasks.filter((t) => t.completed_at && isTaskCompletedToday(t, timezone, now));
  const isEmpty = overdue.length === 0 && today.length === 0;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex w-full max-w-content items-center gap-2">
          <Sun aria-hidden className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Hoy</h1>
        </div>
      </header>
      <div className="w-full max-w-content flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
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
                <ul className="flex flex-col">
                  {overdue.map((task) => (
                    <TaskRow key={task.id} task={task} allTasks={tasks} siblings={[]} depth={0} variant="flat" />
                  ))}
                </ul>
              </section>
            )}

            {today.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Hoy</h2>
                <ul className="flex flex-col">
                  {today.map((task) => (
                    <TaskRow key={task.id} task={task} allTasks={tasks} siblings={[]} depth={0} variant="flat" />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {completedToday.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              aria-expanded={showCompleted}
              className="flex items-center gap-1 text-sm font-medium text-text-secondary outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", showCompleted && "rotate-180")} aria-hidden />
              {showCompleted ? "Ocultar" : "Mostrar"} completadas de hoy ({completedToday.length})
            </button>
            {showCompleted && (
              <ul className="mt-2 flex flex-col">
                {completedToday.map((task) => (
                  <TaskRow key={task.id} task={task} allTasks={tasks} siblings={[]} depth={0} variant="flat" />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
