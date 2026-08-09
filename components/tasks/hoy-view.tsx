"use client";

import { useMemo, useState } from "react";
import { addDays, parseISO } from "date-fns";
import { AlertTriangle, CalendarClock, Sun } from "lucide-react";
import { isTaskCompletedToday, isTaskDueToday, isTaskOverdue, todayInTimeZone } from "@/lib/dates/today";
import { useHoyTasks } from "@/lib/tasks/use-hoy-tasks";
import { buildHoySequence } from "@/lib/tasks/hoy-sequence";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { useBulkUpdateTasks, useUpdateTask, type BulkTaskRef } from "@/lib/tasks/mutations";
import { resolveTaskPriorityColorHex } from "@/lib/validation/tasks";
import { contentWidthClass } from "@/lib/view-options/content-width";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import { effectivePanelGroupBy, type ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { ListCursorProvider } from "@/components/list-cursor/list-cursor-context";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { CalendarGrid } from "@/components/selectors/calendar-grid";
import type { Habit } from "@/lib/habits/habit-columns";
import { HabitsTodayBlock } from "@/components/habits/habits-today-block";
import { Board, type BoardColumn } from "@/components/board/board";
import { dateColumns, priorityColumns, UNDATED_COLUMN_ID } from "@/lib/board/panel-columns";
import { dateMovePatch, priorityMovePatch } from "@/lib/board/panel-move";
import { ScreenCalendar } from "@/components/calendar/screen-calendar";
import { HoyEventRow } from "@/components/calendar/hoy-event-row";
import { useHoyEvents } from "@/components/calendar/use-hoy-events";
import { useDayLoad } from "@/components/calendar/use-day-load";
import { formatDayLoad } from "@/lib/planning/day-load";
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
 * hora mezclado, sin hora) solo tiene sentido con el orden por default de
 * esta pantalla — "fecha". Elegir "nombre" o "prioridad" en la barra de
 * opciones deja a un evento sin nada con qué participar: no tiene nombre
 * que alfabetizar contra el de una tarea con sentido, ni prioridad. Para
 * esos casos, los eventos se muestran aparte, arriba de las tareas, en su
 * propio orden cronológico (todo el día primero, después por hora — el
 * mismo criterio de los tramos 1 y 2 de `buildHoySequence`, acá con la
 * lista de tareas vacía) y las tareas siguen debajo con el criterio
 * elegido. Sigue siendo una sola lista, sin encabezado propio de "Eventos":
 * la fila del evento ya se distingue sola por su forma (D-C).
 *
 * **La lista de Hoy no agrupa** (D-E, `openspec/changes/lista-con-mas-agrupadores`):
 * la barra de opciones ya no ofrece el control acá (`ViewOptionsBar`,
 * `showGroupBy`), y las tres llamadas a `TaskGroupList` de más abajo pasan
 * "nada" fijo, sin importar lo que haya guardado `options.groupBy` de antes
 * de esta capacidad — agrupar rompería la secuencia de arriba, y un evento
 * no tiene prioridad, etiqueta ni sección con qué agruparse. El panel de
 * Hoy no cambia: ahí no hay eventos ni secuencia que romper.
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
 * **"Prioridad" es la agrupación natural de Hoy, no lo natural de otra
 * pantalla (`panel-con-columnas-por-campo`, D-A, caso especial de Hoy — no
 * está en el design, decisión del dueño 2026-08-03; relabeleado por D48, que
 * saca "nada" del panel).** Hoy cruza proyectos, así que no tiene secciones
 * propias; y es un solo día, así que no hay días con los que armar columnas
 * — de los cuatro campos del agrupador, prioridad es el único que le queda
 * con el que agrupar signifique algo. Es la única de las cuatro pantallas
 * donde el default del panel no reproduce lo que ya mostraba la lista antes
 * de esta capacidad (D-A del design dice "nada nunca es una sola columna":
 * acá tampoco lo es, mueve la excepción de "qué es lo natural" en vez de la
 * regla de no colapsar a una). Por el mismo motivo (Hoy cruza proyectos),
 * tampoco ofrece agrupar por sección (D-C: la sección "solo tiene sentido
 * dentro de un proyecto", corrección del dueño 2026-08-03 sobre la versión
 * anterior de este mismo cambio, que sí la ofrecía y siempre rechazaba el
 * movimiento) — `effectivePanelGroupBy` trata una preferencia guardada en
 * "sección" como el default de la pantalla acá, sin pisarla. Con el
 * agrupador en "fecha" explícito, Hoy usa el mismo modelo compartido que las
 * demás pantallas (`dateColumns`).
 * El calendario **siempre** se dibuja en modo día, forzado al montar
 * (`formato_calendario: "dia"` sobrescrito acá, nunca leído de lo
 * guardado) y sin navegación entre días (`hideNav`, `screen-calendar.tsx`):
 * en una vista que es hoy por definición, ir a otro día es una
 * contradicción. La barra de opciones de vista tampoco ofrece el selector
 * de formato de calendario acá (`showCalendarFormat={false}`), ni
 * deshabilitado.
 */
/**
 * Reprogramar las atrasadas en conjunto (`openspec/changes/reprogramar-las-atrasadas`):
 * botón en el encabezado del bloque de atrasadas, sin pasar por el modo de
 * selección múltiple. Reusa `useBulkUpdateTasks` — la misma mutación en lote
 * que `SelectionActionBar`, con su misma integración con deshacer — así que
 * no hay lógica nueva acá, solo a qué tareas se la aplica.
 *
 * `tasks` es exactamente lo que el bloque está mostrando (`overdue`, ya
 * pasado por los filtros rápidos y el orden activos, D-A): con un filtro
 * activo, el conteo del botón y el alcance de la acción bajan juntos.
 *
 * Hoy y Mañana son un toque una vez abierto el selector (D-C); cualquier
 * otra fecha usa el mismo `CalendarGrid` que el resto de la app. Nunca
 * ofrece "Sin fecha" (D-C): sacarle la fecha a una atrasada la haría
 * desaparecer de Hoy sin dejar rastro, lo contrario de reprogramar. Sigue
 * disponible desde la selección múltiple para quien lo busque.
 */
function OverdueRescheduleAction({
  tasks,
  weekStartsOn,
  todayDate,
  tomorrowDate,
}: {
  tasks: BulkTaskRef[];
  weekStartsOn: 0 | 1 | 6;
  todayDate: string;
  tomorrowDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseISO(todayDate));
  const bulkUpdate = useBulkUpdateTasks();

  function reschedule(dueDate: string) {
    bulkUpdate.mutate({ tasks, patch: { due_date: dueDate, due_at: null } });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" size="xs" />}
        aria-label={`Reprogramar ${tasks.length} ${tasks.length === 1 ? "tarea atrasada" : "tareas atrasadas"}`}
      >
        <CalendarClock aria-hidden />
        Reprogramar {tasks.length}
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => reschedule(todayDate)}>
            Hoy
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => reschedule(tomorrowDate)}>
            Mañana
          </Button>
        </div>
        <div className="border-t border-border pt-2.5">
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            selectedDate={null}
            today={todayDate}
            weekStartsOn={weekStartsOn}
            onSelectDate={reschedule}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const tomorrowDate = todayInTimeZone(addDays(now, 1), timezone);
  const tasks = data ?? [];
  const updateTask = useUpdateTask();

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

  // Tiempo planificado del día (capacidad `carga-del-dia`, D-B): en Hoy las
  // atrasadas suman, porque están en la pantalla y son trabajo del día —
  // `formatDayLoad` lo aclara en el texto cuando corresponde.
  const dayLoad = useDayLoad({
    todayDate,
    timezone,
    now,
    tasks: [...overdue, ...today],
    initialHabits,
    eventsState,
  });
  const dayLoadText = formatDayLoad(dayLoad, overdue.length > 0);

  // Ver "El orden (D-A, tarea 2.6)" en el comentario de arriba. El agrupador
  // ya no entra en esta cuenta (D-E): la lista de Hoy nunca agrupa, así que
  // solo el orden puede romper la secuencia por default.
  const useDefaultSequence = options.order === "fecha";
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

  // Cursor de lista (bloque 7.5, capacidad `cursor-de-lista` — la pantalla
  // delicada, ver el comentario en `tasks.md`): el cursor recorre solo
  // filas de tarea, nunca eventos ni hábitos. No es una decisión nueva de
  // este bloque: reusa exactamente el mismo criterio que ya excluye a los
  // eventos de la selección múltiple (`todaySequenceTaskIds`, más arriba —
  // spec `vistas-lista`, "un evento no se puede seleccionar") y a los
  // hábitos, que ni siquiera pasan por `TaskRow`/`ListCursorProvider` (viven
  // en `HabitsTodayBlock`, un árbol de componentes aparte). Con el cursor
  // nunca pudiendo señalar un evento o un hábito, no hace falta decidir qué
  // hacen `Espacio` o `.` sobre ellos: esas teclas jamás llegan ahí.
  const cursorOrderIds = [...overdue.map((t) => t.id), ...todaySequenceTaskIds, ...completedToday.map((t) => t.id)];

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

  // Color por prioridad para el calendario (pedido del dueño: "que las
  // tareas salgan del color de su prioridad", ya no del proyecto — mismo
  // criterio que `ProximosView`/`SectionedTasks`).
  const resolveTaskColor = (task: TaskRowData) => resolveTaskPriorityColorHex(task.priority);

  // Panel (D-B/D-C, D48): columnas por el modelo compartido, nunca por
  // eventos. "Prioridad" es el default de Hoy (caso especial de D-A, ver el
  // comentario de arriba) — `effectivePanelGroupBy` ya lo resuelve, así que
  // `panelGroupBy` nunca vale "nada" acá. Sin columna propia de atrasadas,
  // mismo criterio que el panel de Próximos: se suman al resto.
  const panelGroupBy = effectivePanelGroupBy(options.groupBy, VIEW_KEY);
  const panelTaskPool = [...overdue, ...today];
  const panelColumns: BoardColumn[] =
    panelGroupBy === "fecha"
      ? dateColumns(panelTaskPool, timezone).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }))
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
              {dayLoadText && <span className="text-sm font-normal text-text-secondary">{dayLoadText}</span>}
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
          <div className={`${contentWidthClass(options.viewShape)} flex-1 overflow-y-auto p-4 sm:p-6`}>
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
          <div className={`flex ${contentWidthClass(options.viewShape)} flex-1 flex-col overflow-hidden p-4 sm:p-6`}>
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
          <ListCursorProvider orderedIds={cursorOrderIds}>
          <div
            role="listbox"
            aria-multiselectable
            aria-label="Tareas de hoy"
            className={`${contentWidthClass(options.viewShape)} flex-1 space-y-6 overflow-y-auto p-4 sm:p-6`}
          >
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
                    <h2 className="mb-2 flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                        <AlertTriangle aria-hidden className="size-4" />
                        Atrasadas
                      </span>
                      <OverdueRescheduleAction
                        tasks={overdue.map((t) => ({ id: t.id, projectId: t.project_id }))}
                        weekStartsOn={weekStartsOn}
                        todayDate={todayDate}
                        tomorrowDate={tomorrowDate}
                      />
                    </h2>
                    <TaskGroupList tasks={overdue} allTasks={tasks} groupBy="nada" showProject />
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
                          <TaskGroupList tasks={today} allTasks={tasks} groupBy="nada" showProject />
                        )}
                      </>
                    )}
                  </section>
                )}
              </>
            )}

            {options.showHabits && (
              <HabitsTodayBlock
                timezone={timezone}
                now={now}
                todayDate={todayDate}
                initialHabits={initialHabits}
                showCompleted={options.showCompleted}
              />
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
                <TaskGroupList tasks={completedToday} allTasks={tasks} groupBy="nada" showProject />
              </section>
            )}
          </div>
          </ListCursorProvider>
        )}

        <SelectionActionBar candidateTasks={candidateTasks} />
      </div>
    </SelectionProvider>
  );
}
