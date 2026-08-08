"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Star, Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUpdateLabel } from "@/lib/labels/mutations";
import { useLabelTasks } from "@/lib/labels/use-label-tasks";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { groupTasks } from "@/lib/view-options/group-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import type { ViewOptions } from "@/lib/view-options/schema";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { ListCursorProvider } from "@/components/list-cursor/list-cursor-context";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { SelectionProvider } from "@/components/selection/selection-context";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskRow } from "@/components/tasks/task-row";
import { cn } from "@/lib/utils";
import { useLabels, type Label } from "@/lib/labels/use-labels";
import { usePublishComposeContext } from "@/components/tasks/compose-context";
import { LabelFormDialog } from "./label-form-dialog";
import { DeleteLabelDialog } from "./delete-label-dialog";

/**
 * Página de una etiqueta (bloque 3.4/3.5, capacidad
 * `navegacion-por-etiqueta`, extendida por los bloques 6 y 7): todas las
 * tareas con esa etiqueta asignada, sin importar a qué proyecto pertenezcan.
 * Mismo tratamiento de encabezado que `ProjectHeader` (nombre + conteo, más
 * el menú de acciones del grupo 3 de `etiquetas-con-lugar-propio`: favorita,
 * editar —renombrar y recolorear en el mismo diálogo, `LabelFormDialog`— y
 * eliminar, reutilizando `DeleteLabelDialog`) y mismo `variant="flat"` de
 * `TaskRow` que Hoy y Completado, porque acá tampoco hay un único árbol de
 * hermanos/padre del cual indentar o reordenar por posición: cada tarea es
 * candidata por su etiqueta, no por su lugar en un proyecto. Sin modo panel
 * (spec `modo-panel`: solo Bandeja, Proyecto y Próximos), así que la barra
 * no ofrece forma de ver acá. Sin ícono ni punto de color en el encabezado,
 * a propósito: lo sacó `interfaz-descubrible` y no se repone acá.
 *
 * `label` se deriva de `useLabels()`, igual que `ProjectView` deriva
 * `project` de `useProjects()`, en vez de quedarse con el prop estático que
 * manda el Server Component: así el título, el color y la estrella
 * reaccionan al toque cuando se renombra, recolorea o marca favorita desde
 * acá mismo (la mutación es la misma que usa la administración, sobre el
 * mismo caché). La misma derivación resuelve el bloque 3.5: si la etiqueta
 * que se está mirando deja de estar en la lista —se eliminó, desde acá o
 * desde otro lado— se navega a `/etiquetas` en vez de quedar apuntando a
 * una etiqueta que ya no existe.
 */
export function LabelView({
  labelId,
  initialLabels,
  userId,
  timezone,
  initialTasks,
  initialOptions,
}: {
  labelId: string;
  initialLabels: Label[];
  userId: string;
  timezone: string;
  initialTasks: TaskRowData[];
  initialOptions: ViewOptions;
}) {
  const router = useRouter();
  const { data: labels } = useLabels(initialLabels);
  const label = (labels ?? initialLabels).find((l) => l.id === labelId);
  const { data } = useLabelTasks(userId, labelId, timezone, initialTasks);
  const { options } = useViewOptions(`etiqueta:${labelId}`, initialOptions);
  const updateLabel = useUpdateLabel();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Contexto de alta (D-A/D-B de `alta-de-tareas-en-contexto`): una etiqueta
  // agrupa tareas de proyectos distintos, sin un destino propio — publica
  // "sin contexto" para que el modal global caiga al proyecto por defecto de
  // las preferencias, o a Bandeja de entrada si tampoco hay uno.
  usePublishComposeContext({ projectId: null, sectionId: null, defaultDueDate: null });

  useEffect(() => {
    if (!label) router.push("/etiquetas");
  }, [label, router]);

  if (!label) return null;

  const allTasks = data ?? [];
  const visibleTasks = orderTasks(
    applyQuickFilters(allTasks, options.quickFilters, options.showCompleted),
    options.order,
    timezone,
  );
  const groups = groupTasks(visibleTasks, options.groupBy, timezone);
  const orderedIds = groups.flatMap((group) => group.tasks.map((t) => t.id));
  const candidateTasks = visibleTasks.map((t) => ({ id: t.id, projectId: t.project_id }));

  return (
    <SelectionProvider>
      <div className="flex h-full flex-col">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex w-full max-w-content mx-auto items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-foreground">{label.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {allTasks.length} {allTasks.length === 1 ? "tarea" : "tareas"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label.is_favorite ? "Quitar de favoritos" : "Marcar como favorita"}
                  onClick={() => updateLabel.mutate({ id: label.id, patch: { is_favorite: !label.is_favorite } })}
                >
                  <Star className={cn("size-4", label.is_favorite && "fill-current text-primary")} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Más acciones de la etiqueta" />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Separator orientation="vertical" className="h-5" />

              <ViewOptionsBar viewKey={`etiqueta:${label.id}`} initialOptions={initialOptions} showViewShape={false} showDaysAhead={false} />
            </div>
          </div>
        </header>

        <LabelFormDialog open={editOpen} onOpenChange={setEditOpen} label={label} />
        <DeleteLabelDialog open={deleteOpen} onOpenChange={setDeleteOpen} label={label} />

        <div className="w-full max-w-content mx-auto flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {visibleTasks.length === 0 ? (
            <TaskListEmptyState
              icon={Tag}
              title={`Ninguna tarea tiene la etiqueta “${label.name}”.`}
              description="Asigná esta etiqueta desde el detalle de una tarea para que aparezca acá."
            />
          ) : (
            <ListCursorProvider orderedIds={orderedIds}>
              <div role="listbox" aria-multiselectable aria-label="Tareas" className="space-y-4">
                {groups.map((group) => (
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
                          hideLabelId={labelId}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </ListCursorProvider>
          )}
        </div>

        <SelectionActionBar candidateTasks={candidateTasks} />
      </div>
    </SelectionProvider>
  );
}
