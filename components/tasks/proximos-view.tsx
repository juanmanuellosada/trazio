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
import { dateColumns, priorityColumns, UNDATED_COLUMN_ID } from "@/lib/board/panel-columns";
import { dateMovePatch, priorityMovePatch } from "@/lib/board/panel-move";
import { ScreenCalendar } from "@/components/calendar/screen-calendar";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { useUpdateTask } from "@/lib/tasks/mutations";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import { effectivePanelGroupBy, type ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { cn } from "@/lib/utils";
import { usePublishComposeContext } from "./compose-context";
import { TaskGroupList } from "./task-group-list";
import { TaskListEmptyState } from "./task-list-empty-state";
import { TaskQuickAddRow } from "./task-quick-add-row";

const VIEW_KEY = "proximos";

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
 *
 * **Panel (`openspec/changes/panel-con-columnas-por-campo/`, D-A/D-C):** con
 * el agrupador en "nada" las columnas son la ventana de días configurada más
 * "Sin fecha" (igual que antes de esta capacidad, sin tocar); con "fecha"
 * son los días que ya tienen tareas, sin ventana (`dateColumns`, distinto de
 * "nada"); con "prioridad" son las cuatro fijas. Próximos **no** ofrece
 * agrupar por sección (D-C, corrección del dueño 2026-08-03 sobre la
 * versión anterior de este mismo cambio): Próximos cruza proyectos, así que
 * una columna de sección podía pertenecer a un proyecto distinto del de la
 * tarea arrastrada — la base siempre rechazaba ese movimiento con un
 * disparador, un gesto sin salida. `effectivePanelGroupBy` trata una
 * preferencia guardada en "sección" como si fuera "nada" acá, sin pisarla.
 * Próximos no ofrece "crear sección" en ningún caso: no hay un único
 * proyecto al que atribuirle la nueva sección.
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

  // Contexto de alta (D-A/D-B de `alta-de-tareas-en-contexto`): el modal
  // global hereda la Bandeja de entrada y hoy, el ancla de la ventana de esta
  // vista — no hay "el día" de Próximos más allá de eso, cada grupo tiene el
  // suyo propio en el alta embebida de más abajo, que ya lo recibe por props.
  usePublishComposeContext({
    projectId: inboxProjectId,
    sectionId: null,
    defaultDueDate: todayInTimeZone(now, timezone),
  });
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
    // El orden dentro de una columna nunca persiste en `position` (D25:
    // `position` no es comparable entre proyectos, y Próximos cruza
    // proyectos): sin ancla estable, no hace nada, sin importar el
    // agrupador ni el orden configurado.
  }

  // Panel (grupo 1/2, D-A/D-C): con "nada", las columnas son la ventana de
  // días configurada (sin tocar, distinto de `dateColumns`: acá se generan
  // los días vacíos de la ventana, no solo los que ya tienen tareas). Con
  // los demás valores, salen del modelo compartido.
  const panelGroupBy = effectivePanelGroupBy(options.groupBy, VIEW_KEY);
  const panelTaskPool = [...tasks, ...undatedTasks];
  const orderedPanelPool = orderTasks(panelTaskPool, options.order, timezone);

  const boardColumns: BoardColumn[] =
    panelGroupBy === "fecha"
      ? dateColumns(orderedPanelPool, timezone).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }))
      : panelGroupBy === "prioridad"
        ? priorityColumns(orderedPanelPool).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }))
        : // "nada": sin columna propia de "atrasadas" (a diferencia de la
          // lista) — se suman a la columna del primer día ("Hoy").
          [
            ...days.map(({ day, offset, tasks: dayTasks }) => ({
              id: day,
              title: dayGroupLabel(day, offset),
              tasks: offset === 0 ? [...overdue, ...dayTasks] : dayTasks,
            })),
            { id: UNDATED_COLUMN_ID, title: "Sin fecha", tasks: orderTasks(undatedTasks, options.order, timezone) },
          ];

  // Mover entre columnas escribe el campo que las define (D-C). "Nada" y
  // "fecha" comparten el mismo esquema de columnas (día ISO o
  // `UNDATED_COLUMN_ID`), así que las dos usan `dateMovePatch`.
  function handleMoveAcrossColumns(taskId: string, _fromColumnId: string, toColumnId: string) {
    const task = panelTaskPool.find((t) => t.id === taskId);
    if (!task) return;
    if (panelGroupBy === "prioridad") {
      const patch = priorityMovePatch(toColumnId);
      if (patch) updateTask.mutate({ id: taskId, projectId: task.project_id, patch });
      return;
    }
    updateTask.mutate({ id: taskId, projectId: task.project_id, patch: dateMovePatch(task, toColumnId, timezone) });
  }

  // Agregar tarea al pie de cada columna, con el campo de esa columna ya
  // puesto (grupo 5, D-F). Sin "crear sección" acá (a diferencia de Bandeja
  // y Proyecto): no hay un único proyecto al que atribuirle la nueva.
  function renderColumnAdd(column: BoardColumn) {
    if (panelGroupBy === "prioridad") {
      return inboxProjectId ? (
        <TaskQuickAddRow projectId={inboxProjectId} sectionId={null} parentId={null} defaultPriority={Number(column.id)} />
      ) : null;
    }
    return inboxProjectId ? (
      <TaskQuickAddRow
        projectId={inboxProjectId}
        sectionId={null}
        parentId={null}
        defaultDueDate={column.id === UNDATED_COLUMN_ID ? undefined : column.id}
      />
    ) : null;
  }

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
        // El panel no tiene tope propio (D-E, excepción acotada a D39): un
        // tablero no es una línea de texto, ocupa el ancho disponible.
        <div className="w-full flex-1 overflow-hidden p-4 sm:p-6">
          <Board
            columns={boardColumns}
            allTasks={tasks}
            draggable
            onReorderWithinColumn={handleReorderWithinColumn}
            onMoveAcrossColumns={handleMoveAcrossColumns}
            renderColumnEmptyAction={renderColumnAdd}
            renderColumnFooter={renderColumnAdd}
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
                  <TaskGroupList tasks={overdue} allTasks={tasks} groupBy={options.groupBy} showProject />
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
                      <TaskGroupList tasks={dayTasks} allTasks={tasks} groupBy={options.groupBy} showProject />
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
