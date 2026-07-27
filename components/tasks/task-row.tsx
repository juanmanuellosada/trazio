"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useTheme } from "next-themes";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  FolderInput,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  Link2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/lib/toast";
import { formatTaskDueLabel } from "@/lib/dates/format";
import { useDeleteTask, useDuplicateTask, useMoveTask, useUpdateTask } from "@/lib/tasks/mutations";
import { computeIndent, computeOutdent, positionForSwap } from "@/lib/tasks/tree";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { PROJECT_COLORS } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { useMounted } from "@/hooks/use-mounted";
import { DEFAULT_TASK_PRIORITY } from "@/lib/validation/tasks";
import { MoveTaskDialog } from "./move-task-dialog";
import { PriorityDot } from "@/components/selectors/priority-select";
import { useTaskDetail } from "./task-detail-context";
import { TaskList } from "./task-list";
import { TaskQuickAddRow } from "./task-quick-add-row";

function LabelChipView({ label }: { label: TaskRowData["labels"][number] }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  // Indexar PROJECT_COLORS acá es seguro: es `label.color`, no
  // `project.color`, y el check constraint de `labels` garantiza una de las
  // diez claves de la paleta (sin la excepción del azul de marca que sí
  // tiene `projects.color`). Ver `resolveProjectColorHex` en
  // `lib/validation/colors.ts`.
  // Hasta montar, forzar "light" (lo mismo que asume el servidor):
  // `resolvedTheme` se resuelve en el cliente desde el primer render, antes
  // de montar, y puede no coincidir con el servidor.
  const hex =
    mounted && resolvedTheme === "dark" ? PROJECT_COLORS[label.color].dark : PROJECT_COLORS[label.color].light;
  return (
    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium text-white" style={{ backgroundColor: hex }}>
      {label.name}
    </span>
  );
}

/**
 * Fila de tarea (bloque 7 y 8): completar con optimistic update, prioridad,
 * etiquetas, vencimiento, y todas las acciones (duplicar, mover, indentar/
 * desindentar, reordenar, eliminar, copiar enlace, abrir en ventana
 * aparte). Reordenar es por arrastre (`useSortable`) **con** camino
 * alternativo por menú (`.claude/rules/frontend.md`: ninguna acción solo
 * por arrastre); indentar es exclusivamente por teclado (`Tab`/`Shift+Tab`
 * sobre el título enfocado) y por menú — nunca por arrastre, a diferencia
 * de proyectos, porque acá convertir en subtarea es una acción frecuente
 * que merece un camino corto, no el mismo gesto que reordenar.
 *
 * `variant="flat"` (bloque 8, Hoy y Completado): esas dos vistas cruzan
 * proyectos, así que no hay un contexto único de hermanos/padre del cual
 * indentar, reordenar por posición o colgar subtareas — se ocultan esas
 * acciones y no se intenta expandir subtareas (que además no vienen en el
 * mismo pedido: cada tarea ahí es candidata por su propia fecha, no por
 * pertenecer al árbol de otra). El resto (completar, prioridad, etiquetas,
 * duplicar, mover, eliminar, copiar enlace) se mantiene igual.
 */
export function TaskRow({
  task,
  allTasks,
  siblings,
  depth,
  variant = "list",
}: {
  task: TaskRowData;
  allTasks: TaskRowData[];
  siblings: TaskRowData[];
  depth: number;
  variant?: "list" | "flat";
}) {
  const { open } = useTaskDetail();
  const preferences = useUserPreferences();
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();
  const duplicateTask = useDuplicateTask();
  const deleteTask = useDeleteTask();
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [addingFirstSubtask, setAddingFirstSubtask] = useState(false);
  const now = useMemo(() => new Date(), []);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const isFlat = variant === "flat";
  const children = isFlat ? [] : allTasks.filter((t) => t.parent_id === task.id);
  const hasChildren = children.length > 0;
  const isCompleted = task.completed_at != null;
  const due = formatTaskDueLabel(task, { now, ...preferences });

  function toggleComplete() {
    updateTask.mutate({
      id: task.id,
      projectId: task.project_id,
      patch: { completed_at: isCompleted ? null : new Date().toISOString() },
    });
  }

  function handleIndent() {
    const target = computeIndent(allTasks, task);
    if (!target) return;
    moveTask.mutate({ id: task.id, fromProjectId: task.project_id, toProjectId: task.project_id, ...target });
  }

  function handleOutdent() {
    const target = computeOutdent(allTasks, task);
    if (!target) return;
    moveTask.mutate({ id: task.id, fromProjectId: task.project_id, toProjectId: task.project_id, ...target });
  }

  function moveWithinSiblings(direction: "up" | "down") {
    const position = positionForSwap(siblings, siblings.findIndex((t) => t.id === task.id), direction);
    if (position == null) return;
    moveTask.mutate({
      id: task.id,
      fromProjectId: task.project_id,
      toProjectId: task.project_id,
      sectionId: task.section_id,
      parentId: task.parent_id,
      position,
    });
  }

  // Tab/Shift+Tab sobre el título enfocado indentan/desindentan (criterio
  // nuevo de este bloque, distinto del arrastre). Atrapar el evento acá y no
  // en toda la fila deja el resto de los controles (grip, menú) alcanzables
  // por Tab normal antes de llegar a este punto — ver el `order-last` del
  // botón de menú más abajo, que lo adelanta en el orden de tabulación sin
  // moverlo de lugar visualmente.
  function handleTitleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    if (event.shiftKey) handleOutdent();
    else handleIndent();
  }

  function copyLink() {
    const url = `${window.location.origin}/tarea/${task.id}`;
    navigator.clipboard.writeText(url).then(() => toastSuccess("Enlace copiado."));
  }

  return (
    <li ref={setNodeRef} style={style} className={cn("group", isDragging && "opacity-50")}>
      <div style={{ paddingLeft: depth * 24 }} className="flex items-center gap-1.5 rounded-md px-1 py-1.5 hover:bg-surface">
        {!isFlat && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reordenar ${task.title}`}
            className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-text-secondary opacity-0 outline-none group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        )}

        {hasChildren ? (
          <button
            type="button"
            aria-label={collapsed ? `Mostrar subtareas de ${task.title}` : `Ocultar subtareas de ${task.title}`}
            onClick={() => setCollapsed((c) => !c)}
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", !collapsed && "rotate-90")} />
          </button>
        ) : (
          <span aria-hidden className="size-5 shrink-0" />
        )}

        <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          aria-label={isCompleted ? `Descompletar ${task.title}` : `Completar ${task.title}`}
          onClick={toggleComplete}
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            isCompleted ? "border-primary bg-primary" : "border-input",
          )}
        >
          {isCompleted && <span aria-hidden className="size-1.5 rounded-full bg-primary-foreground" />}
        </button>

        {task.priority !== DEFAULT_TASK_PRIORITY && <PriorityDot priority={task.priority} />}

        {/* La metadata (etiquetas, fecha) vive DENTRO de este botón, pegada
            al título, en vez de ser hermana suya en la fila (design.md
            sección C1, bloque 3): así, aunque el botón siga siendo `flex-1`
            —área de clic amplia, Fitts's law— el título y su metadata se
            agrupan al inicio del botón y no se separan al crecer el ancho
            de columna. El título tiene su propio tope (`max-w-lg`, ~60-75
            caracteres — line-length-control de la skill `ui-ux-pro-max`)
            para no dejar la metadata a kilómetros en un título larguísimo. */}
        <button
          type="button"
          onClick={() => open(task.id)}
          onKeyDown={isFlat ? undefined : handleTitleKeyDown}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded px-0.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            isCompleted && "text-text-secondary",
          )}
        >
          <span className={cn("min-w-0 max-w-lg truncate", isCompleted && "line-through")}>{task.title}</span>

          {task.labels.map((label) => (
            <LabelChipView key={label.id} label={label} />
          ))}

          {due && <span className="shrink-0 text-xs text-text-secondary">{due}</span>}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Más acciones para ${task.title}`}
                className="order-last shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => open(task.id)}>Abrir detalle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateTask.mutate({ task })}>
              <Copy className="size-3.5" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMoveDialogOpen(true)}>
              <FolderInput className="size-3.5" /> Mover…
            </DropdownMenuItem>
            {!isFlat && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => moveWithinSiblings("up")}>Mover arriba</DropdownMenuItem>
                <DropdownMenuItem onClick={() => moveWithinSiblings("down")}>Mover abajo</DropdownMenuItem>
                <DropdownMenuItem onClick={handleIndent}>
                  <IndentIncrease className="size-3.5" /> Convertir en subtarea
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOutdent}>
                  <IndentDecrease className="size-3.5" /> Sacar de ser subtarea
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCollapsed(false);
                    setAddingFirstSubtask(true);
                  }}
                >
                  Agregar subtarea
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyLink}>
              <Link2 className="size-3.5" /> Copiar enlace directo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`/tarea/${task.id}`, "_blank")}>
              <ExternalLink className="size-3.5" /> Abrir en ventana aparte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteTask.mutate({ id: task.id, projectId: task.project_id })}
            >
              <Trash2 className="size-3.5" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isFlat && hasChildren && !collapsed && (
        <TaskList projectId={task.project_id} sectionId={null} parentId={task.id} initialTasks={allTasks} depth={depth + 1} />
      )}
      {!isFlat && !hasChildren && addingFirstSubtask && (
        <div style={{ paddingLeft: (depth + 1) * 24 }} className="py-0.5">
          <TaskQuickAddRow projectId={task.project_id} sectionId={null} parentId={task.id} />
        </div>
      )}

      <MoveTaskDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        taskId={task.id}
        fromProjectId={task.project_id}
        currentSectionId={task.section_id}
      />
    </li>
  );
}
