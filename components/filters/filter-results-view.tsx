"use client";

import { AlertTriangle, Filter } from "lucide-react";
import { useLabels } from "@/lib/labels/use-labels";
import { useProjects } from "@/lib/projects/use-projects";
import { useFilter } from "@/lib/filters/use-filter";
import { useFilterResults } from "@/lib/filters/use-filter-results";
import { collectFieldValues } from "@/lib/query-language/ast-utils";
import { parseQuery } from "@/lib/query-language/parse";
import { normalize } from "@/lib/parser/normalize";
import type { FilterRow } from "@/lib/filters/use-filters";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskRow } from "@/components/tasks/task-row";
import { usePublishComposeContext } from "@/components/tasks/compose-context";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { groupTasks } from "@/lib/view-options/group-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import type { ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";

/** Nombres de `label`/`project` que la consulta de un filtro referencia pero que ya no existen entre las etiquetas/proyectos actuales del usuario (bloque 2.17). */
function missingReferences(query: string, names: string[], field: "label" | "project"): string[] {
  const parsed = parseQuery(query);
  if (!parsed.ok) return [];
  const referenced = collectFieldValues(parsed.ast, field);
  const existing = new Set(names.map(normalize));
  return referenced.filter((name) => !existing.has(normalize(name)));
}

/**
 * Página de resultados de un filtro (bloque 2.14, extendida por el bloque
 * 6): ejecuta la consulta guardada contra `buscar_tareas` y muestra las
 * tareas resultantes, con el mismo tratamiento de lista plana que
 * `CompletedView` (las tareas de un filtro pueden cruzar proyectos, igual
 * que Completado). Si la consulta referencia una etiqueta o un proyecto ya
 * eliminado, lo informa en español en vez de romper la página o mostrar una
 * lista vacía sin explicación (requirement "Un filtro que referencia una
 * etiqueta o proyecto eliminado no rompe su página"). Sin modo panel (spec
 * `modo-panel`: solo Bandeja, Proyecto y Próximos).
 */
export function FilterResultsView({
  filterId,
  initialFilter,
  timezone,
  initialOptions,
}: {
  filterId: string;
  initialFilter: FilterRow;
  timezone: string;
  initialOptions: ViewOptions;
}) {
  const { data: filter } = useFilter(filterId, initialFilter);
  const query = filter?.query ?? initialFilter.query;
  const name = filter?.name ?? initialFilter.name;

  const { data: labels } = useLabels();
  const { data: projects } = useProjects();
  const results = useFilterResults(filterId, query);
  const { options } = useViewOptions(`filtro:${filterId}`, initialOptions);

  // Contexto de alta (D-A/D-B de `alta-de-tareas-en-contexto`): un filtro
  // cruza proyectos, sin destino propio — mismo criterio que Etiqueta.
  usePublishComposeContext({ projectId: null, sectionId: null, defaultDueDate: null });

  const missingLabels = missingReferences(query, (labels ?? []).map((l) => l.name), "label");
  const missingProjects = missingReferences(query, (projects ?? []).map((p) => p.name), "project");

  const allTasks = results.status === "listo" ? results.tasks : [];
  const visibleTasks = orderTasks(applyQuickFilters(allTasks, options.quickFilters, options.showCompleted), options.order, timezone);
  const groups = groupTasks(visibleTasks, options.groupBy);
  const orderedIds = groups.flatMap((group) => group.tasks.map((t) => t.id));
  const candidateTasks = visibleTasks.map((t) => ({ id: t.id, projectId: t.project_id }));

  return (
    <SelectionProvider>
      <div className="flex h-full flex-col">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex w-full max-w-content mx-auto items-center justify-between gap-2">
            <h1 className="min-w-0 truncate text-2xl font-semibold text-foreground">{name}</h1>
            <ViewOptionsBar viewKey={`filtro:${filterId}`} initialOptions={initialOptions} showViewShape={false} showDaysAhead={false} />
          </div>
        </header>

        <div className="w-full max-w-content mx-auto flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {(missingLabels.length > 0 || missingProjects.length > 0) && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-text-secondary" />
              <p>
                {missingLabels.map((n) => `La etiqueta “${n}” ya no existe.`).join(" ")}
                {missingLabels.length > 0 && missingProjects.length > 0 ? " " : ""}
                {missingProjects.map((n) => `El proyecto “${n}” ya no existe.`).join(" ")}
              </p>
            </div>
          )}

          {results.status === "error" ? (
            <p role="alert" className="text-sm text-error">
              No pudimos ejecutar este filtro porque {results.message.toLowerCase()}
            </p>
          ) : results.status === "cargando" ? (
            <p className="text-sm text-text-secondary">Buscando tareas…</p>
          ) : visibleTasks.length === 0 ? (
            <TaskListEmptyState
              icon={Filter}
              title="Ninguna tarea coincide con este filtro."
              description="Cambiá la consulta desde la administración de filtros si esperabas ver algo acá."
            />
          ) : (
            groups.map((group) => (
              <section key={group.key}>
                {group.label && (
                  <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">
                    {group.label} <span className="font-normal normal-case">({group.tasks.length})</span>
                  </h2>
                )}
                <ul className="flex flex-col divide-y divide-border/60">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      allTasks={allTasks}
                      siblings={[]}
                      depth={0}
                      variant="flat"
                      selectionOrderIds={orderedIds}
                      showProject
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
