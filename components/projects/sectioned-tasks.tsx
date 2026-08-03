"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { SectionList } from "@/components/sections/section-list";
import { TaskList } from "@/components/tasks/task-list";
import { TaskRow as TaskRowView } from "@/components/tasks/task-row";
import { usePublishComposeContext } from "@/components/tasks/compose-context";
import { Board, type BoardColumn } from "@/components/board/board";
import { ScreenCalendar } from "@/components/calendar/screen-calendar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { clickButtonByText } from "@/lib/shortcuts/dom";
import { useShortcutScope } from "@/lib/shortcuts/context";
import { useProjects } from "@/lib/projects/use-projects";
import { useMoveTask } from "@/lib/tasks/mutations";
import { useSections, type SectionRow } from "@/lib/sections/use-sections";
import { useTasks, type TaskRow } from "@/lib/tasks/use-tasks";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { groupTasks } from "@/lib/view-options/group-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import { isDragEnabled, type ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { cn } from "@/lib/utils";

const UNSECTIONED_COLUMN_ID = "sin-seccion";

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
 * mismo `viewKey`. Con agrupación activa (por prioridad o etiqueta), la
 * agrupación por sección se reemplaza por la elegida — las secciones vuelven
 * en cuanto se restablece "nada". En modo panel, las columnas son siempre
 * las secciones (bloque 6.8), sin importar la agrupación: la agrupación ahí
 * solo apaga el arrastre (D-I, bloque 6.10), como en cualquier otra
 * combinación.
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
  const { data: projects } = useProjects();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const project = projects?.find((p) => p.id === projectId);
  const projectColorHex = resolveProjectColorHex(project?.color ?? null, theme);
  const resolveTaskColor = () => projectColorHex;
  const moveTask = useMoveTask();
  const sections = [...(sectionsData ?? [])].sort((a, b) => a.position - b.position);
  const allTasks = tasksData ?? [];
  const isEmpty = sections.length === 0 && allTasks.length === 0;

  const dragEnabled = isDragEnabled(options);
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

  function columnTasks(sectionId: string | null): TaskRow[] {
    return orderTasks(
      visibleTasks.filter((t) => t.section_id === sectionId),
      options.order,
      timezone,
    );
  }

  const boardColumns: BoardColumn[] = [
    { id: UNSECTIONED_COLUMN_ID, title: "Sin sección", tasks: columnTasks(null) },
    ...sections.map((section) => ({ id: section.id, title: section.name, tasks: columnTasks(section.id) })),
  ];

  function handleReorderWithinColumn(columnId: string, taskId: string, position: number) {
    const sectionId = columnId === UNSECTIONED_COLUMN_ID ? null : columnId;
    moveTask.mutate({ id: taskId, fromProjectId: projectId, toProjectId: projectId, sectionId, parentId: null, position });
  }

  function handleMoveAcrossColumns(taskId: string, _fromColumnId: string, toColumnId: string) {
    const sectionId = toColumnId === UNSECTIONED_COLUMN_ID ? null : toColumnId;
    const destination = columnTasks(sectionId);
    const position = destination.length > 0 ? destination[destination.length - 1].position + 1000 : 1000;
    moveTask.mutate({ id: taskId, fromProjectId: projectId, toProjectId: projectId, sectionId, parentId: null, position });
  }

  // Selección múltiple (bloque 7.10-7.13): orden visual para `⇧clic`, en
  // cada una de las tres formas de ver esta pantalla.
  const listOrderIds = [...columnTasks(null), ...sections.flatMap((s) => columnTasks(s.id))].map((t) => t.id);
  const groupedTasks = groupTasks(orderTasks(visibleTasks, options.order, timezone), options.groupBy);
  const groupedOrderIds = groupedTasks.flatMap((group) => group.tasks.map((t) => t.id));
  const panelOrderIds = boardColumns.flatMap((column) => column.tasks.map((t) => t.id));
  const selectionOrderIds =
    options.viewShape === "panel" ? panelOrderIds : options.groupBy === "nada" ? listOrderIds : groupedOrderIds;
  const candidateTasks = topLevelTasks
    .filter((t) => selectionOrderIds.includes(t.id))
    .map((t) => ({ id: t.id, projectId: t.project_id }));

  return (
    <SelectionProvider>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "w-full max-w-content mx-auto flex-1 p-4 sm:p-6",
            options.viewShape === "calendario" ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto",
          )}
        >
          {isEmpty ? (
            emptyState
          ) : options.viewShape === "panel" ? (
            <Board
              columns={boardColumns}
              allTasks={allTasks}
              draggable={dragEnabled}
              onReorderWithinColumn={handleReorderWithinColumn}
              onMoveAcrossColumns={handleMoveAcrossColumns}
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
          ) : options.groupBy === "nada" ? (
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
                  {/* Sin arrastre acá (D-I, bloque 6.10): la agrupación reemplaza a las secciones, y el criterio ya exige "manual y sin agrupación". */}
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
