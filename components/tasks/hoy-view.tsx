"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { AlertTriangle, Sun } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { isTaskCompletedToday, isTaskDueToday, isTaskOverdue } from "@/lib/dates/today";
import { useHoyTasks } from "@/lib/tasks/use-hoy-tasks";
import { buildHoySequence } from "@/lib/tasks/hoy-sequence";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { useProjects } from "@/lib/projects/use-projects";
import { useAllSections } from "@/lib/sections/use-sections";
import { useMoveTask, useUpdateTask } from "@/lib/tasks/mutations";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import { effectivePanelGroupBy, type ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import type { Habit } from "@/lib/habits/habit-columns";
import { HabitsTodayBlock } from "@/components/habits/habits-today-block";
import { Board, type BoardColumn } from "@/components/board/board";
import { dateColumns, priorityColumns, sectionColumns, UNDATED_COLUMN_ID } from "@/lib/board/panel-columns";
import { dateMovePatch, priorityMovePatch, sectionMovePatch } from "@/lib/board/panel-move";
import { ScreenCalendar } from "@/components/calendar/screen-calendar";
import { HoyEventRow } from "@/components/calendar/hoy-event-row";
import { useHoyEvents } from "@/components/calendar/use-hoy-events";
import { usePublishComposeContext } from "./compose-context";
import { TaskGroupList } from "./task-group-list";
import { TaskListEmptyState } from "./task-list-empty-state";
import { TaskQuickAddRow } from "./task-quick-add-row";
import { TaskRow } from "./task-row";

const VIEW_KEY = "hoy";

/**
 * Vista Hoy (capacidad `hoy-con-eventos`): atrasadas en su propio bloque
 * arriba, después una única secuencia con las tareas de hoy **y** los
 * eventos del día de hoy intercalados, hábitos, y — si el usuario lo pide —
 * completadas de hoy. Ofrece los tres formatos (lista, panel y calendario,
 * D-F): antes de esta capacidad era la única vista de tareas sin selector
 * de forma de ver, porque no tenía modo panel.
 *
 * **El desacople con Google es lo más importante de este archivo** (grupo
 * 1 de `openspec/changes/hoy-con-eventos-y-formatos/tasks.md`): `useHoyTasks`
 * y `useHoyEvents` son dos consultas hermanas, cada una con su propio
 * estado, nunca un `Suspense` ni un `isLoading` compartido. Las tareas se
 * pintan solas; los eventos se insertan cuando llegan, sin esqueleto de
 * carga (D-E: no se sabe de antemano cuántos van a ser, y uno del alto
 * equivocado desplaza el contenido dos veces en vez de una). Sin Google
 * conectado, Hoy se ve exactamente como si esta capacidad no existiera —
 * `useHoyEvents` trata "no conectado" y "cargando" igual (ver su propio
 * comentario), así que no hay huecos ni avisos. Solo cuando Google
 * realmente falla (`status: "unavailable"`) aparece **un** aviso al pie,
 * nunca uno por fila.
 *
 * `components/tasks/` tiene prohibido importar de `lib/calendar/`
 * (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts`): este
 * archivo nunca lo hace. Los eventos llegan ya resueltos por
 * `useHoyEvents`/`HoyEventRow` (`components/calendar/`), que son el único
 * puente permitido — Hoy no conoce ningún tipo de `lib/calendar/`.
 *
 * **El orden (D-A, tarea 2.6).** El cruce por hora entre tareas y eventos
 * (`buildHoySequence`, tres tramos: todo el día/arrastrado de ayer, con
 * hora mezclado, sin hora) solo tiene sentido con el orden y la agrupación
 * por default de esta pantalla — orden "fecha", sin agrupar. Elegir
 * "nombre" o "prioridad" en la barra de opciones, o agrupar por prioridad o
 * etiqueta, deja a un evento sin nada con qué participar: no tiene nombre
 * que alfabetizar contra el de una tarea con sentido, ni prioridad, ni
 * etiqueta. Para esos casos, los eventos se muestran aparte, arriba de las
 * tareas, en su propio orden cronológico (todo el día primero, después por
 * hora — el mismo criterio de los tramos 1 y 2 de `buildHoySequence`, acá
 * con la lista de tareas vacía) y las tareas siguen debajo con el criterio
 * elegido. Sigue siendo una sola lista, sin encabezado propio de "Eventos":
 * la fila del evento ya se distingue sola por su forma (D-C).
 *
 * Las atrasadas (tarea 2.5) nunca se mezclan con esta secuencia: siguen en
 * su bloque propio arriba, como antes de esta capacidad.
 *
 * **Los formatos (D-F).** El panel muestra solo tareas (D-B): un evento no
 * tiene sección, fecha ni prioridad con la que armar una columna. Cuando hay
 * eventos hoy, una línea avisa que este formato no los muestra. Sin columna
 * propia de atrasadas en el panel, mismo criterio que ya usa Próximos: se
 * suman a la misma columna que Hoy.
 *
 * **"Nada" es prioridad, no lo natural de otra pantalla (`panel-con-columnas-por-campo`,
 * D-A, caso especial de Hoy — no está en el design, decisión del dueño
 * 2026-08-03).** Hoy cruza proyectos, así que no tiene secciones propias; y
 * es un solo día, así que no hay días con los que armar columnas — de los
 * cuatro campos del agrupador, prioridad es el único que le queda con el que
 * agrupar signifique algo. Es la única de las cuatro pantallas donde "nada"
 * no reproduce lo que ya mostraba la lista antes de esta capacidad (D-A del
 * design dice "nada nunca es una sola columna": acá tampoco lo es, mueve la
 * excepción de "qué es lo natural" en vez de la regla de no colapsar a una).
 * Con el agrupador en "fecha" o "sección" explícitos, Hoy usa el mismo
 * modelo compartido que las demás pantallas (`dateColumns`/`sectionColumns`,
 * con `useAllSections` para la segunda, igual que Próximos). El calendario
 * **siempre** se dibuja en modo día, forzado al montar
 * (`formato_calendario: "dia"` sobrescrito acá, nunca leído de lo
 * guardado) y sin navegación entre días (`hideNav`, `screen-calendar.tsx`):
 * en una vista que es hoy por definición, ir a otro día es una
 * contradicción. La barra de opciones de vista tampoco ofrece el selector
 * de formato de calendario acá (`showCalendarFormat={false}`), ni
 * deshabilitado.
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
  const { weekStartsOn, timeFormat } = useUserPreferences();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const tasks = data ?? [];
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();
  // Todas las secciones de todos los proyectos (mismo criterio que
  // `ProximosView`): Hoy también cruza proyectos, no hay un único del cual
  // pedirlas. Ya viene sembrada desde el layout (`AllSectionsSeed`).
  const { data: allSectionsData } = useAllSections();

  // Contexto de alta (D-A/D-B de `alta-de-tareas-en-contexto`): el modal
  // global hereda la Bandeja de entrada y el día de hoy, igual que ya hace
  // el alta rápida embebida de esta misma vista un poco más abajo.
  usePublishComposeContext({ projectId: inboxProjectId, sectionId: null, defaultDueDate: todayDate });

  // Desacoplado de `useHoyTasks` de arriba: ver el comentario de esta
  // función al principio del archivo.
  const eventsState = useHoyEvents(todayDate, timezone);
  const events = eventsState.status === "ok" ? eventsState.events : [];
  const hasEventsToday = events.length > 0;

  const overdueRaw = tasks.filter((t) => !t.completed_at && isTaskOverdue(t, timezone, now));
  const todayRaw = tasks.filter((t) => !t.completed_at && isTaskDueToday(t, timezone, now));
  const completedTodayRaw = tasks.filter((t) => t.completed_at && isTaskCompletedToday(t, timezone, now));

  const overdue = orderTasks(applyQuickFilters(overdueRaw, options.quickFilters, true), options.order, timezone);
  const today = orderTasks(applyQuickFilters(todayRaw, options.quickFilters, true), options.order, timezone);
  const completedToday = options.showCompleted
    ? orderTasks(applyQuickFilters(completedTodayRaw, options.quickFilters, true), options.order, timezone)
    : [];

  // Ver "El orden (D-A, tarea 2.6)" en el comentario de arriba.
  const useDefaultSequence = options.order === "fecha" && options.groupBy === "nada";
  const eventSequence = buildHoySequence<TaskRowData, (typeof events)[number]>([], events, now, timezone);
  const mixedSequence = useDefaultSequence ? buildHoySequence(today, events, now, timezone) : [];
  // Orden visual real de las tareas de la secuencia (sin los eventos, que no
  // son seleccionables) para `⇧clic` (bloque 7.10-7.13).
  const todaySequenceTaskIds = useDefaultSequence
    ? mixedSequence.flatMap((entry) => (entry.kind === "task" ? [entry.task.id] : []))
    : today.map((task) => task.id);

  const isEmpty = overdue.length === 0 && today.length === 0 && !hasEventsToday;
  // Selección múltiple (bloque 7.10-7.13): cualquier tarea visible de Hoy es
  // candidata, atrasada, de hoy o completada de hoy por igual. Un evento
  // nunca es candidato (`vistas-lista`, "un evento no se puede seleccionar").
  const candidateTasks = [...overdue, ...today, ...completedToday].map((t) => ({ id: t.id, projectId: t.project_id }));

  function renderEventRow(event: (typeof events)[number]) {
    return (
      <HoyEventRow
        key={event.id}
        event={event}
        calendarName={eventsState.status === "ok" ? eventsState.calendarName(event.calendarId) : ""}
        canEdit={eventsState.status === "ok" ? eventsState.canEdit(event) : false}
        timezone={timezone}
        now={now}
      />
    );
  }

  // Color por proyecto para el calendario (D-F): mismo criterio que
  // `ProximosView`/`SectionedTasks`.
  const { data: projects } = useProjects();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const resolveTaskColor = (task: TaskRowData) =>
    resolveProjectColorHex(projects?.find((p) => p.id === task.project_id)?.color ?? null, theme);

  // Panel (D-B/D-C): columnas por el modelo compartido, nunca por eventos.
  // "Nada" y "prioridad" son la misma cosa en Hoy (caso especial de D-A, ver
  // el comentario de arriba). Sin columna propia de atrasadas, mismo
  // criterio que el panel de Próximos: se suman al resto.
  const panelGroupBy = effectivePanelGroupBy(options.groupBy);
  const panelTaskPool = [...overdue, ...today];
  const allSections = allSectionsData ?? [];
  const panelColumns: BoardColumn[] =
    panelGroupBy === "fecha"
      ? dateColumns(panelTaskPool, timezone).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }))
      : panelGroupBy === "seccion"
        ? sectionColumns(panelTaskPool, allSections).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }))
        : priorityColumns(panelTaskPool).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }));

  // El orden dentro de una columna nunca persiste en `position` (D25: no es
  // comparable entre proyectos, y Hoy cruza proyectos) — mismo motivo por el
  // que `ProximosView` tampoco lo hace.
  function noopReorderWithinColumn() {}

  // Mover entre columnas escribe el campo que las define (D-C): a
  // diferencia de la posición, prioridad y fecha no son comparativas entre
  // proyectos, así que sí tienen sentido acá.
  function handlePanelMove(taskId: string, _fromColumnId: string, toColumnId: string) {
    const task = panelTaskPool.find((t) => t.id === taskId);
    if (!task) return;
    if (panelGroupBy === "fecha") {
      updateTask.mutate({ id: taskId, projectId: task.project_id, patch: dateMovePatch(task, toColumnId, timezone) });
      return;
    }
    if (panelGroupBy === "seccion") {
      const patch = sectionMovePatch(panelTaskPool, task.project_id, toColumnId);
      moveTask.mutate({
        id: taskId,
        fromProjectId: task.project_id,
        toProjectId: task.project_id,
        sectionId: patch.section_id,
        parentId: null,
        position: patch.position,
      });
      return;
    }
    const patch = priorityMovePatch(toColumnId);
    if (patch) updateTask.mutate({ id: taskId, projectId: task.project_id, patch });
  }

  // Agregar tarea al pie de cada columna, con el campo de esa columna ya
  // puesto (grupo 5, D-F), siempre con fecha de hoy — Hoy es un solo día.
  // Sin "crear sección": no hay un único proyecto al que atribuirle la
  // nueva, mismo motivo que Próximos.
  function renderColumnAdd(column: BoardColumn) {
    if (!inboxProjectId) return null;
    if (panelGroupBy === "fecha") {
      return (
        <TaskQuickAddRow
          projectId={inboxProjectId}
          sectionId={null}
          parentId={null}
          defaultDueDate={column.id === UNDATED_COLUMN_ID ? undefined : column.id}
        />
      );
    }
    if (panelGroupBy === "seccion") {
      const section = allSections.find((s) => s.id === column.id);
      const targetProjectId = section?.project_id ?? inboxProjectId;
      return (
        <TaskQuickAddRow
          projectId={targetProjectId}
          sectionId={section?.id ?? null}
          parentId={null}
          defaultDueDate={todayDate}
        />
      );
    }
    return (
      <TaskQuickAddRow
        projectId={inboxProjectId}
        sectionId={null}
        parentId={null}
        defaultDueDate={todayDate}
        defaultPriority={Number(column.id)}
      />
    );
  }

  return (
    <SelectionProvider>
      <div className="flex h-full flex-col">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex w-full max-w-content mx-auto items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sun aria-hidden className="size-5 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">Hoy</h1>
            </div>
            <ViewOptionsBar
              viewKey={VIEW_KEY}
              initialOptions={initialOptions}
              showViewShape
              showCalendarFormat={false}
              showDaysAhead={false}
            />
          </div>
        </header>

        {options.viewShape === "panel" ? (
          // El panel no tiene tope propio (D-E, excepción acotada a D39): un
          // tablero no es una línea de texto, ocupa el ancho disponible.
          <div className="w-full flex-1 overflow-y-auto p-4 sm:p-6">
            {hasEventsToday && (
              <p className="mb-3 text-sm text-text-secondary">
                Este formato no muestra los eventos de hoy: cambiá a lista o calendario para verlos.
              </p>
            )}
            <Board
              columns={panelColumns}
              allTasks={tasks}
              draggable
              onReorderWithinColumn={noopReorderWithinColumn}
              onMoveAcrossColumns={handlePanelMove}
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
              options={{ ...options, formato_calendario: "dia" }}
              tasks={today}
              resolveTaskColor={resolveTaskColor}
              createTaskProjectId={inboxProjectId}
              hideNav
            />
          </div>
        ) : (
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
                    <TaskGroupList tasks={overdue} allTasks={tasks} groupBy={options.groupBy} showProject />
                  </section>
                )}

                {(today.length > 0 || hasEventsToday) && (
                  <section>
                    <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Hoy</h2>
                    {useDefaultSequence ? (
                      <ul className="flex flex-col divide-y divide-border/60">
                        {mixedSequence.map((entry) =>
                          entry.kind === "event" ? (
                            renderEventRow(entry.event)
                          ) : (
                            <TaskRow
                              key={entry.task.id}
                              task={entry.task}
                              allTasks={tasks}
                              siblings={[]}
                              depth={0}
                              variant="flat"
                              selectionOrderIds={todaySequenceTaskIds}
                              showProject
                            />
                          ),
                        )}
                      </ul>
                    ) : (
                      <>
                        {hasEventsToday && (
                          <ul className="mb-1 flex flex-col divide-y divide-border/60">
                            {eventSequence.map((entry) => (entry.kind === "event" ? renderEventRow(entry.event) : null))}
                          </ul>
                        )}
                        {today.length > 0 && (
                          <TaskGroupList tasks={today} allTasks={tasks} groupBy={options.groupBy} showProject />
                        )}
                      </>
                    )}
                  </section>
                )}
              </>
            )}

            {options.showHabits && (
              <HabitsTodayBlock timezone={timezone} now={now} todayDate={todayDate} initialHabits={initialHabits} />
            )}

            {eventsState.status === "unavailable" && (
              <p className="text-sm text-text-secondary">
                {eventsState.reason === "needs_reauth"
                  ? "No pudimos cargar tus eventos de hoy porque la conexión con Google necesita reconectarse."
                  : "No pudimos cargar tus eventos de hoy porque Google no respondió. Volvé a intentar en un momento."}
              </p>
            )}

            {completedToday.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">
                  Completadas de hoy ({completedToday.length})
                </h2>
                <TaskGroupList tasks={completedToday} allTasks={tasks} groupBy={options.groupBy} showProject />
              </section>
            )}
          </div>
        )}

        <SelectionActionBar candidateTasks={candidateTasks} />
      </div>
    </SelectionProvider>
  );
}
