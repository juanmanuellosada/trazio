"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { isTaskOverdue, taskDueDay, todayInTimeZone } from "@/lib/dates/today";
import { useProjects } from "@/lib/projects/use-projects";
import { useUndatedTasks } from "@/lib/tasks/use-undated-tasks";
import { useUpcomingTasks } from "@/lib/tasks/use-upcoming-tasks";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { Board, type BoardColumn } from "@/components/board/board";
import { ScreenCalendar } from "@/components/calendar/screen-calendar";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { useUpdateTask } from "@/lib/tasks/mutations";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import { isDragEnabled, type ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { cn } from "@/lib/utils";
import { TaskGroupList } from "./task-group-list";
import { TaskListEmptyState } from "./task-list-empty-state";
import { TaskQuickAddRow } from "./task-quick-add-row";

const VIEW_KEY = "proximos";
const UNDATED_COLUMN_ID = "sin-fecha";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Hoy" y "Mañana" para los primeros dos días de la ventana; el resto en lenguaje natural, sin ambigüedad más allá de la semana (D-J). */
function dayGroupLabel(day: string, offset: number): string {
  if (offset === 0) return "Hoy";
  if (offset === 1) return "Mañana";
  return capitalize(format(parseISO(day), "EEEE d 'de' MMMM", { locale: es }));
}

/**
 * Vista Próximos (bloque 3.7-3.10, capacidad `vista-proximos`, extendida por
 * el bloque 6): atrasadas arriba de todo, después un grupo por cada día de
 * la ventana —"Hoy" y "Mañana" con un tratamiento más marcado que el resto
 * (D-J). Las tareas sin fecha quedan afuera de la lista; en el modo panel
 * (bloque 6.9) tienen su propia columna "Sin fecha", donde el arrastre sirve
 * para darles fecha. La ventana (`daysAhead`) y el resto de las opciones
 * (orden, agrupar, filtros rápidos, mostrar completadas) vienen de la barra
 * de opciones de vista, persistidas por `view_key: "proximos"`.
 *
 * `nowIso` viaja del Server Component por el mismo motivo que en `HoyView`
 * (D1): mismo instante entre el primer render del cliente y el del
 * servidor.
 */
export function ProximosView({
  userId,
  timezone,
  inboxProjectId,
  initialTasks,
  nowIso,
  initialOptions,
}: {
  userId: string;
  timezone: string;
  inboxProjectId: string | null;
  initialTasks: TaskRowData[];
  nowIso: string;
  initialOptions: ViewOptions;
}) {
  const { options } = useViewOptions(VIEW_KEY, initialOptions);
  const { weekStartsOn, timeFormat } = useUserPreferences();
  const { data: projects } = useProjects();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const projectColorById = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, resolveProjectColorHex(p.color, theme)] as const)),
    [projects, theme],
  );
  const resolveTaskColor = (task: TaskRowData) => projectColorById.get(task.project_id) ?? resolveProjectColorHex(null, theme);
  const windowDays = options.daysAhead;
  const { data } = useUpcomingTasks(userId, timezone, windowDays, initialTasks, options.showCompleted);
  const { data: undatedData } = useUndatedTasks(userId, undefined, options.showCompleted);
  const updateTask = useUpdateTask();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const tasks = applyQuickFilters(data ?? [], options.quickFilters, options.showCompleted);
  const undatedTasks = applyQuickFilters(undatedData ?? [], options.quickFilters, options.showCompleted);

  const overdue = orderTasks(
    tasks.filter((t) => isTaskOverdue(t, timezone, now)),
    options.order,
    timezone,
  );

  // Sin `useMemo`, igual que el bucketing de `HoyView`: filtrar en cada
  // render es barato para el tamaño real de estas listas.
  const days = Array.from({ length: windowDays }, (_, offset) => {
    const day = todayInTimeZone(addDays(now, offset), timezone);
    return {
      day,
      offset,
      tasks: orderTasks(
        tasks.filter((t) => taskDueDay(t, timezone) === day),
        options.order,
        timezone,
      ),
    };
  });

  const isEmpty = overdue.length === 0 && days.every((d) => d.tasks.length === 0);

  function handleReorderWithinColumn() {
    // El orden dentro de una columna de día no persiste en `position`
    // (D25: `position` no es comparable entre proyectos): un reordenamiento
    // manual acá no tiene ancla estable, así que no hace nada — el criterio
    // de arrastre habilitado ya exige orden manual y sin agrupación, pero
    // "manual" en Próximos no tiene una columna propia que grabar.
  }

  function handleMoveAcrossColumns(taskId: string, _fromColumnId: string, toColumnId: string) {
    const task = tasks.find((t) => t.id === taskId) ?? undatedTasks.find((t) => t.id === taskId);
    if (!task) return;
    const dueDate = toColumnId === UNDATED_COLUMN_ID ? null : toColumnId;
    updateTask.mutate({ id: taskId, projectId: task.project_id, patch: { due_date: dueDate, due_at: null } });
  }

  // Sin columna propia de "atrasadas" en el panel (a diferencia de la
  // lista): el spec de `modo-panel` solo pide una columna por día más "Sin
  // fecha". Las atrasadas se suman a la columna del primer día ("Hoy"),
  // para que sigan siendo alcanzables sin perder la estructura de columnas
  // que pide el spec.
  const boardColumns: BoardColumn[] = [
    ...days.map(({ day, offset, tasks: dayTasks }) => ({
      id: day,
      title: dayGroupLabel(day, offset),
      tasks: offset === 0 ? [...overdue, ...dayTasks] : dayTasks,
    })),
    { id: UNDATED_COLUMN_ID, title: "Sin fecha", tasks: orderTasks(undatedTasks, options.order, timezone) },
  ];

  // Selección múltiple (bloque 7.10-7.13): en lista, las tareas sin fecha no
  // se muestran (bloque 3.9) y por lo tanto no son candidatas; en panel sí
  // (columna "Sin fecha"), igual que `boardColumns` ya las incluye.
  const candidateTasks = (
    options.viewShape === "panel" ? boardColumns.flatMap((c) => c.tasks) : [...overdue, ...days.flatMap((d) => d.tasks)]
  ).map((t) => ({ id: t.id, projectId: t.project_id }));

  return (
    <SelectionProvider>
      <div className="flex h-full flex-col">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex w-full max-w-content mx-auto items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Próximos</h1>
            <ViewOptionsBar viewKey={VIEW_KEY} initialOptions={initialOptions} showViewShape showDaysAhead />
          </div>
        </header>

        {options.viewShape === "panel" ? (
        <div className={cn("w-full max-w-content mx-auto flex-1 overflow-hidden p-4 sm:p-6")}>
          <Board
            columns={boardColumns}
            allTasks={tasks}
            draggable={isDragEnabled(options)}
            onReorderWithinColumn={handleReorderWithinColumn}
            onMoveAcrossColumns={handleMoveAcrossColumns}
          />
        </div>
      ) : options.viewShape === "calendario" ? (
        <div className="flex w-full max-w-content mx-auto flex-1 flex-col overflow-hidden p-4 sm:p-6">
          <ScreenCalendar
            timezone={timezone}
            weekStartsOn={weekStartsOn}
            timeFormat={timeFormat}
            options={options}
            tasks={tasks}
            resolveTaskColor={resolveTaskColor}
            createTaskProjectId={inboxProjectId}
          />
        </div>
      ) : (
        <div className="w-full max-w-content mx-auto flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {isEmpty ? (
            <TaskListEmptyState
              icon={CalendarDays}
              title="No tenés tareas próximas."
              description="Acá van a aparecer las tareas atrasadas y las que venzan en los próximos días. Elegí un día para agregar una."
            />
          ) : (
            <>
              {overdue.length > 0 && (
                <section>
                  {/* No usa el rojo de marca (#EC1E2A): --warning es el token
                      semántico reservado para "atrasadas" (docs/design-system.md
                      §1), igual que en Hoy. */}
                  <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-warning">
                    <AlertTriangle aria-hidden className="size-4" />
                    Atrasadas
                  </h2>
                  <TaskGroupList tasks={overdue} allTasks={tasks} groupBy={options.groupBy} />
                </section>
              )}

              {days.map(({ day, offset, tasks: dayTasks }) => {
                const highlighted = offset === 0 || offset === 1;
                return (
                  <section key={day}>
                    <h2
                      className={cn(
                        "mb-2",
                        highlighted
                          ? "text-base font-semibold text-foreground"
                          : "text-sm font-semibold tracking-wide text-text-secondary uppercase",
                      )}
                    >
                      {dayGroupLabel(day, offset)}{" "}
                      <span className="font-normal normal-case tracking-normal text-text-secondary">
                        ({dayTasks.length})
                      </span>
                    </h2>
                    {dayTasks.length > 0 && (
                      <TaskGroupList tasks={dayTasks} allTasks={tasks} groupBy={options.groupBy} />
                    )}
                    {inboxProjectId && (
                      <TaskQuickAddRow projectId={inboxProjectId} sectionId={null} parentId={null} defaultDueDate={day} />
                    )}
                  </section>
                );
              })}
            </>
          )}
        </div>
        )}

        <SelectionActionBar candidateTasks={candidateTasks} />
      </div>
    </SelectionProvider>
  );
}
