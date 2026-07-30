"use client";

import { useTheme } from "next-themes";
import { Tag } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useLabelTasks } from "@/lib/labels/use-label-tasks";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { groupTasks } from "@/lib/view-options/group-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import type { ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskRow } from "@/components/tasks/task-row";
import type { Label } from "@/lib/labels/use-labels";

/**
 * Página de una etiqueta (bloque 3.4/3.5, capacidad
 * `navegacion-por-etiqueta`, extendida por los bloques 6 y 7): todas las
 * tareas con esa etiqueta asignada, sin importar a qué proyecto pertenezcan.
 * Mismo tratamiento de encabezado que `ProjectHeader` (punto de color +
 * nombre + conteo) y mismo `variant="flat"` de `TaskRow` que Hoy y
 * Completado, porque acá tampoco hay un único árbol de hermanos/padre del
 * cual indentar o reordenar por posición: cada tarea es candidata por su
 * etiqueta, no por su lugar en un proyecto. Sin modo panel (spec
 * `modo-panel`: solo Bandeja, Proyecto y Próximos), así que la barra no
 * ofrece forma de ver acá.
 */
export function LabelView({
  label,
  userId,
  timezone,
  initialTasks,
  initialOptions,
}: {
  label: Label;
  userId: string;
  timezone: string;
  initialTasks: TaskRowData[];
  initialOptions: ViewOptions;
}) {
  const { data } = useLabelTasks(userId, label.id, timezone, initialTasks);
  const { options } = useViewOptions(`etiqueta:${label.id}`, initialOptions);
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const hex = resolveProjectColorHex(label.color, mounted && resolvedTheme === "dark" ? "dark" : "light");
  const allTasks = data ?? [];
  const visibleTasks = orderTasks(
    applyQuickFilters(allTasks, options.quickFilters, options.showCompleted),
    options.order,
    timezone,
  );
  const groups = groupTasks(visibleTasks, options.groupBy);
  const orderedIds = groups.flatMap((group) => group.tasks.map((t) => t.id));
  const candidateTasks = visibleTasks.map((t) => ({ id: t.id, projectId: t.project_id }));

  return (
    <SelectionProvider>
      <div className="flex h-full flex-col">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex w-full max-w-content items-start gap-3 @[90rem]:mx-auto">
            <span aria-hidden className="mt-1.5 size-3 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-foreground">{label.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {allTasks.length} {allTasks.length === 1 ? "tarea" : "tareas"}
              </p>
            </div>
          </div>
        </header>
        <ViewOptionsBar viewKey={`etiqueta:${label.id}`} initialOptions={initialOptions} showViewShape={false} showDaysAhead={false} />

        <div className="w-full max-w-content flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 @[90rem]:mx-auto">
          {visibleTasks.length === 0 ? (
            <TaskListEmptyState
              icon={Tag}
              title={`Ninguna tarea tiene la etiqueta “${label.name}”.`}
              description="Asigná esta etiqueta desde el detalle de una tarea para que aparezca acá."
            />
          ) : (
            groups.map((group) => (
              <section key={group.key}>
                {group.label && (
                  <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">
                    {group.label} <span className="font-normal normal-case">({group.tasks.length})</span>
                  </h2>
                )}
                <ul className="flex flex-col">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      allTasks={allTasks}
                      siblings={[]}
                      depth={0}
                      variant="flat"
                      selectionOrderIds={orderedIds}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <SelectionActionBar candidateTasks={candidateTasks} />
      </div>
    </SelectionProvider>
  );
}
