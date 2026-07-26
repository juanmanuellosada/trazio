"use client";

import { useState, type KeyboardEvent } from "react";
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
import { useDeleteTask, useDuplicateTask, useMoveTask, useUpdateTask } from "@/lib/tasks/mutations";
import { computeIndent, computeOutdent, positionForSwap } from "@/lib/tasks/tree";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { PROJECT_COLORS } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import { MoveTaskDialog } from "./move-task-dialog";
import { PriorityDot } from "./priority-select";
import { useTaskDetail } from "./task-detail-context";
import { TaskList } from "./task-list";
import { TaskQuickAddRow } from "./task-quick-add-row";

function LabelChipView({ label }: { label: TaskRowData["labels"][number] }) {
  const { resolvedTheme } = useTheme();
  const hex = resolvedTheme === "dark" ? PROJECT_COLORS[label.color].dark : PROJECT_COLORS[label.color].light;
  return (
    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium text-white" style={{ backgroundColor: hex }}>
      {label.name}
    </span>
  );
}

/** `due_date` es `date` puro (sin hora): se ancla al mediodía para que el huso horario del navegador nunca la corra un día. */
function formatDue(task: TaskRowData): string | null {
  if (task.due_at) {
    return new Date(task.due_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  if (task.due_date) {
    return new Date(`${task.due_date}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  }
  return null;
}

/**
 * Fila de tarea (bloque 7): completar con optimistic update, prioridad,
 * etiquetas, vencimiento, y todas las acciones (duplicar, mover, indentar/
 * desindentar, reordenar, eliminar, copiar enlace, abrir en ventana
 * aparte). Reordenar es por arrastre (`useSortable`) **con** camino
 * alternativo por menú (`.claude/rules/frontend.md`: ninguna acción solo
 * por arrastre); indentar es exclusivamente por teclado (`Tab`/`Shift+Tab`
 * sobre el título enfocado) y por menú — nunca por arrastre, a diferencia
 * de proyectos, porque acá convertir en subtarea es una acción frecuente
 * que merece un camino corto, no el mismo gesto que reordenar.
 */
export function TaskRow({
  task,
  allTasks,
  siblings,
  depth,
}: {
  task: TaskRowData;
  allTasks: TaskRowData[];
  siblings: TaskRowData[];
  depth: number;
}) {
  const { open } = useTaskDetail();
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();
  const duplicateTask = useDuplicateTask();
  const deleteTask = useDeleteTask();
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [addingFirstSubtask, setAddingFirstSubtask] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const children = allTasks.filter((t) => t.parent_id === task.id);
  const hasChildren = children.length > 0;
  const isCompleted = task.completed_at != null;
  const due = formatDue(task);

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
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${task.title}`}
          className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-text-secondary opacity-0 outline-none group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>

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

        <PriorityDot priority={task.priority} />

        <button
          type="button"
          onClick={() => open(task.id)}
          onKeyDown={handleTitleKeyDown}
          className={cn(
            "min-w-0 flex-1 truncate rounded px-0.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            isCompleted && "text-text-secondary line-through",
          )}
        >
          {task.title}
        </button>

        {task.labels.map((label) => (
          <LabelChipView key={label.id} label={label} />
        ))}

        {due && <span className="shrink-0 text-xs text-text-secondary">{due}</span>}

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

      {hasChildren && !collapsed && (
        <TaskList projectId={task.project_id} sectionId={null} parentId={task.id} initialTasks={allTasks} depth={depth + 1} />
      )}
      {!hasChildren && addingFirstSubtask && (
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
