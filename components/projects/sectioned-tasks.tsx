"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { AddSectionRow, SectionList } from "@/components/sections/section-list";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";
import { TaskRow as TaskRowView } from "@/components/tasks/task-row";
import { usePublishComposeContext } from "@/components/tasks/compose-context";
import { Board, type BoardColumn } from "@/components/board/board";
import { ScreenCalendar } from "@/components/calendar/screen-calendar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { clickButtonByText } from "@/lib/shortcuts/dom";
import { useShortcutScope } from "@/lib/shortcuts/context";
import { dateColumns, priorityColumns, sectionColumns, UNDATED_COLUMN_ID, UNSECTIONED_COLUMN_ID } from "@/lib/board/panel-columns";
import { dateMovePatch, priorityMovePatch, sectionMovePatch } from "@/lib/board/panel-move";
import { useMoveTask, useUpdateTask } from "@/lib/tasks/mutations";
import { useSections, type SectionRow } from "@/lib/sections/use-sections";
import { useTasks, type TaskRow } from "@/lib/tasks/use-tasks";
import { resolveTaskPriorityColorHex } from "@/lib/validation/tasks";
import { contentWidthClass } from "@/lib/view-options/content-width";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { groupTasks } from "@/lib/view-options/group-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import { effectivePanelGroupBy, type ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { cn } from "@/lib/utils";

/**
 * Tareas y secciones de un proyecto (bloques 6, 7 y 8, spec §3 "Proyecto":
 * "Primero las tareas sin sección, después cada sección colapsable con su
 * propio botón de agregar"): una sola lista continua, sin encabezados
 * artificiales separando "tareas" de "secciones" — el nombre de cada
 * sección hace de separador por sí mismo. Cuando el proyecto no tiene ni
 * tareas ni secciones, un único estado vacío reemplaza a las dos partes
 * (bloque 8.6) en vez de dos mensajes chicos y redundantes por separado.
 *
 * La Bandeja de entrada es un proyecto más (`is_inbox = true`, spec §3
 * "Bandeja de entrada": vista agrupada por sección) y usa este mismo
 * componente, igual que cualquier otro proyecto. `viewKey === "bandeja"`
 * (único para esa pantalla, D-H) es la señal para saber si es la Bandeja:
 * `S` abre el editor de secciones ahí (bloque 7.4, D-G) en vez del
 * buscador; en cualquier otro proyecto, `S` sigue siendo buscador y
 * `⇧S` agrega una sección (bloque 7.7) — la misma acción de "revelar el
 * campo de agregar sección" bajo una tecla distinta para no colisionar.
 *
 * Bloque 6 (`opciones-de-vista`/`modo-panel`): el disparador de opciones de
 * vista vive en la cabecera de cada pantalla (bandeja/page.tsx, project-header.tsx),
 * no acá — este componente solo lee `options` vía `useViewOptions` con el
 * mismo `viewKey`.
 *
 * **En la lista, "sección" —el default de Bandeja y Proyecto— es lo único
 * que muestra los bloques colapsables** (`openspec/changes/lista-con-mas-agrupadores`,
 * D-A/D-C): con cualquier otro valor, incluido "nada", la vista se aplana a
 * una lista corrida (o agrupada por fecha/prioridad/etiqueta, sin bloques de
 * sección) y las tres acciones que viven en el encabezado de una sección
 * —colapsar, agregar una tarea ahí, renombrar/eliminar— dejan de estar en la
 * lista. Colapsar es cosmético (se pierde sin reemplazo); agregar una tarea
 * en una sección específica sigue alcanzable por el selector de destino del
 * alta rápida y por `#Proyecto/Sección` en el parser; renombrar y eliminar
 * solo viven acá y en el panel cuando sus columnas son secciones (ver el
 * párrafo de abajo) — volver a "Sección" siempre las recupera, sin perder
 * nada guardado (D24: nunca sin ninguna puerta, aunque a veces la puerta sea
 * cambiar el agrupador).
 *
 * **Panel (`openspec/changes/panel-con-columnas-por-campo/`, D-A/D-C/D-F):**
 * las columnas salen del agrupador, no están cableadas a esta pantalla.
 * "Nada" y "sección" producen las mismas columnas acá —las secciones del
 * proyecto, más "Sin sección" (D-A)—, así que `sectionColumns` cubre las
 * dos; "fecha" y "prioridad" son explícitas y valen igual que en cualquier
 * otra pantalla. Mover entre columnas escribe el campo que las define
 * (D-C); reordenar **dentro** de una columna sigue siendo posición y solo
 * persiste con orden manual, sin importar qué agrupe a las columnas. El
 * panel ofrece "crear sección" (`AddSectionRow`, reusado de
 * `section-list.tsx`) únicamente cuando sus columnas son secciones (D-F) —
 * en un tablero por fecha o prioridad, crear una sección no crea ninguna
 * columna. `sectionListRef` es el mismo para lista y panel: solo una de las
 * dos monta su "Agregar sección" a la vez, así que el atajo `S`/`⇧S` sigue
 * encontrándolo sin duplicar el registro.
 */
export function SectionedTasks({
  projectId,
  viewKey,
  initialOptions,
  timezone,
  initialSections,
  initialTasks,
  emptyState,
}: {
  projectId: string;
  viewKey: string;
  initialOptions: ViewOptions;
  timezone: string;
  initialSections: SectionRow[];
  initialTasks: TaskRow[];
  /** Ya renderizado por quien llama: acá no se arma, así puede construirse
   * en un Server Component (Bandeja) sin pasar una referencia de ícono
   * cruda a través del límite servidor/cliente. */
  emptyState: ReactNode;
}) {
  const { data: sectionsData } = useSections(projectId, initialSections);
  const { data: tasksData } = useTasks(projectId, initialTasks);
  const { options } = useViewOptions(viewKey, initialOptions);
  const { weekStartsOn, timeFormat } = useUserPreferences();
  // Color por prioridad para el calendario (pedido del dueño: "que las
  // tareas salgan del color de su prioridad", ya no del proyecto — mismo
  // criterio que `HoyView`/`ProximosView`).
  const resolveTaskColor = (task: TaskRow) => resolveTaskPriorityColorHex(task.priority);
  const moveTask = useMoveTask();
  const updateTask = useUpdateTask();
  const sections = [...(sectionsData ?? [])].sort((a, b) => a.position - b.position);
  const allTasks = tasksData ?? [];
  const isEmpty = sections.length === 0 && allTasks.length === 0;

  const topLevelTasks = allTasks.filter((t) => t.parent_id === null);
  const visibleTasks = applyQuickFilters(topLevelTasks, options.quickFilters, options.showCompleted);

  const isInbox = viewKey === "bandeja";
  const sectionListRef = useRef<HTMLDivElement>(null);

  // Contexto de alta (D-A de `alta-de-tareas-en-contexto`): esta vista es
  // tanto Bandeja como cualquier Proyecto (la Bandeja es un proyecto más,
  // ver el comentario de arriba). Nunca publica sección: el diálogo global
  // no la hereda (reporte del dueño, 2026-08-03) — ver el comentario en
  // `components/shortcuts/global-quick-add-dialog.tsx`.
  usePublishComposeContext({ projectId, sectionId: null, defaultDueDate: null });
  useShortcutScope([
    {
      combo: isInbox ? { key: "s" } : { key: "s", shift: true },
      handler: () => clickButtonByText(sectionListRef.current, "Agregar sección"),
    },
  ]);

  // Solo para la lista agrupada por sección (rama `options.groupBy === "seccion"` más abajo, `lista-con-mas-agrupadores`): sigue igual que antes.
  function columnTasks(sectionId: string | null): TaskRow[] {
    return orderTasks(
      visibleTasks.filter((t) => t.section_id === sectionId),
      options.order,
      timezone,
    );
  }

  // Panel (grupo 1/2 de `panel-con-columnas-por-campo`, D-A/D-C): las
  // columnas salen del agrupador. "Nada" y "sección" son las mismas acá
  // (D-A) — `sectionColumns` cubre las dos.
  const panelGroupBy = effectivePanelGroupBy(options.groupBy, viewKey);
  const orderedPanelTasks = orderTasks(visibleTasks, options.order, timezone);
  const boardColumns: BoardColumn[] =
    panelGroupBy === "fecha"
      ? dateColumns(orderedPanelTasks, timezone).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }))
      : panelGroupBy === "prioridad"
        ? priorityColumns(orderedPanelTasks).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }))
        : sectionColumns(orderedPanelTasks, sections).map((c) => ({ id: c.id, title: c.label, tasks: c.tasks }));

  // Reordenar dentro de una columna sigue siendo posición y solo tiene
  // sentido con orden manual (D-C, tarea 2.5), sin importar qué campo
  // definan las columnas: la tarea no cambia de sección/fecha/prioridad,
  // solo de lugar entre sus hermanas.
  function handleReorderWithinColumn(_columnId: string, taskId: string, position: number) {
    if (options.order !== "manual") return;
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;
    moveTask.mutate({ id: taskId, fromProjectId: projectId, toProjectId: projectId, sectionId: task.section_id, parentId: null, position });
  }

  // Mover entre columnas escribe el campo que las define (D-C): sección
  // (con la posición, como cualquier otro movimiento), fecha (conservando
  // la hora) o prioridad.
  function handleMoveAcrossColumns(taskId: string, _fromColumnId: string, toColumnId: string) {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;
    if (panelGroupBy === "fecha") {
      updateTask.mutate({ id: taskId, projectId, patch: dateMovePatch(task, toColumnId, timezone) });
      return;
    }
    if (panelGroupBy === "prioridad") {
      const patch = priorityMovePatch(toColumnId);
      if (patch) updateTask.mutate({ id: taskId, projectId, patch });
      return;
    }
    const patch = sectionMovePatch(allTasks, projectId, toColumnId);
    moveTask.mutate({ id: taskId, fromProjectId: projectId, toProjectId: projectId, sectionId: patch.section_id, parentId: null, position: patch.position });
  }

  // Agregar tarea al pie de cada columna, con el campo de esa columna ya
  // puesto (grupo 5, D-F): el mismo componente para la columna vacía
  // (`renderColumnEmptyAction`) y la que ya tiene tareas
  // (`renderColumnFooter`) — nunca las dos a la vez (`components/board/board.tsx`).
  function renderColumnAdd(column: BoardColumn) {
    if (panelGroupBy === "fecha") {
      return (
        <TaskQuickAddRow
          projectId={projectId}
          sectionId={null}
          parentId={null}
          defaultDueDate={column.id === UNDATED_COLUMN_ID ? undefined : column.id}
        />
      );
    }
    if (panelGroupBy === "prioridad") {
      return <TaskQuickAddRow projectId={projectId} sectionId={null} parentId={null} defaultPriority={Number(column.id)} />;
    }
    return (
      <TaskQuickAddRow
        projectId={projectId}
        sectionId={column.id === UNSECTIONED_COLUMN_ID ? null : column.id}
        parentId={null}
      />
    );
  }

  // Selección múltiple (bloque 7.10-7.13): orden visual para `⇧clic`, en
  // cada una de las tres formas de ver esta pantalla.
  const listOrderIds = [...columnTasks(null), ...sections.flatMap((s) => columnTasks(s.id))].map((t) => t.id);
  const groupedTasks = groupTasks(orderTasks(visibleTasks, options.order, timezone), options.groupBy, timezone);
  const groupedOrderIds = groupedTasks.flatMap((group) => group.tasks.map((t) => t.id));
  const panelOrderIds = boardColumns.flatMap((column) => column.tasks.map((t) => t.id));
  const selectionOrderIds =
    options.viewShape === "panel" ? panelOrderIds : options.groupBy === "seccion" ? listOrderIds : groupedOrderIds;
  const candidateTasks = topLevelTasks
    .filter((t) => selectionOrderIds.includes(t.id))
    .map((t) => ({ id: t.id, projectId: t.project_id }));

  return (
    <SelectionProvider>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "flex-1 p-4 sm:p-6",
            contentWidthClass(options.viewShape),
            options.viewShape === "calendario" ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto",
          )}
        >
          {isEmpty ? (
            emptyState
          ) : options.viewShape === "panel" ? (
            <Board
              columns={boardColumns}
              allTasks={allTasks}
              draggable
              onReorderWithinColumn={handleReorderWithinColumn}
              onMoveAcrossColumns={handleMoveAcrossColumns}
              renderColumnEmptyAction={renderColumnAdd}
              renderColumnFooter={renderColumnAdd}
              // Crear sección solo cuando las columnas son secciones (D-F):
              // en un tablero por fecha o prioridad, crear una sección no
              // crea ninguna columna. Pedido del dueño (2026-08-03): va
              // después de la última columna, no debajo del tablero.
              trailingColumn={
                panelGroupBy === "seccion" ? (
                  <div ref={sectionListRef}>
                    <AddSectionRow projectId={projectId} />
                  </div>
                ) : undefined
              }
            />
          ) : options.viewShape === "calendario" ? (
            <ScreenCalendar
              timezone={timezone}
              weekStartsOn={weekStartsOn}
              timeFormat={timeFormat}
              options={options}
              tasks={visibleTasks}
              resolveTaskColor={resolveTaskColor}
              createTaskProjectId={projectId}
            />
          ) : options.groupBy === "seccion" ? (
            <div className="space-y-4">
              <TaskList
                projectId={projectId}
                sectionId={null}
                parentId={null}
                initialTasks={initialTasks}
                order={options.order}
                quickFilters={options.quickFilters}
                showCompleted={options.showCompleted}
                timezone={timezone}
                selectionOrderIds={listOrderIds}
              />
              <div ref={sectionListRef}>
                <SectionList
                  projectId={projectId}
                  initialSections={initialSections}
                  taskListOptions={{
                    order: options.order,
                    quickFilters: options.quickFilters,
                    showCompleted: options.showCompleted,
                    timezone,
                  }}
                  selectionOrderIds={listOrderIds}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTasks.map((group) => (
                <section key={group.key}>
                  {group.label && (
                    <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">
                      {group.label} <span className="font-normal normal-case">({group.tasks.length})</span>
                    </h2>
                  )}
                  {/* Sin arrastre acá: agrupando por cualquier valor que no sea sección —incluido "nada", la lista corrida (`lista-con-mas-agrupadores`, D-A)— no hay un campo de columna único que escribir al mover, ni una posición comparable entre secciones distintas. Eso es solo el modo panel, y solo agrupado por sección (D-C). */}
                  <ul className="flex flex-col divide-y divide-border/60">
                    {group.tasks.map((task) => (
                      <TaskRowView
                        key={task.id}
                        task={task}
                        allTasks={allTasks}
                        siblings={[]}
                        depth={0}
                        variant="flat"
                        selectionOrderIds={groupedOrderIds}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <SelectionActionBar candidateTasks={candidateTasks} />
      </div>
    </SelectionProvider>
  );
}
