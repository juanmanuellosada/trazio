"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { DateSelect } from "@/components/selectors/date-select";
import { DeadlineSelect } from "@/components/selectors/deadline-select";
import { PrioritySelect } from "@/components/selectors/priority-select";
import { useParserContext } from "@/lib/parser/use-parser-context";
import { toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useDeleteTask, useDuplicateTask, useMoveTask, useUpdateTask, type TaskPatch } from "@/lib/tasks/mutations";
import { nextSiblingPositionInContext } from "@/lib/tasks/tree";
import { useAutosave } from "@/lib/tasks/use-autosave";
import { useTask, type TaskDetail } from "@/lib/tasks/use-task";
import { tasksQueryKey, type TaskRow } from "@/lib/tasks/use-tasks";
import { taskTitleSchema } from "@/lib/validation/tasks";
import { LabelPicker } from "./label-picker";
import { TaskDescriptionEditor } from "./task-description-editor";
import { TaskDestinationSelect, type TaskDestination } from "./task-destination-select";
import { TaskList } from "./task-list";

const FIELD_LABEL_CLASS = "text-xs font-medium text-text-secondary";

/** `useDuplicateTask` solo necesita la forma de `TaskRow` (para calcular la posición de la copia): sin `description` ni `created_at`. */
function toTaskRowShape(task: TaskDetail): TaskRow {
  const rest: Partial<TaskDetail> = { ...task };
  delete rest.description;
  delete rest.created_at;
  return rest as TaskRow;
}

function TaskDetailForm({ task, onClose }: { task: TaskDetail; onClose?: () => void }) {
  const preferences = useUserPreferences();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const duplicateTask = useDuplicateTask();
  const deleteTask = useDeleteTask();
  const moveTask = useMoveTask();
  const { proyectos } = useParserContext();

  // Estado local sembrado una sola vez (este componente remonta por
  // `key={task.id}` en `task-detail-panel.tsx` — modal en escritorio,
  // pantalla completa en teléfono — y en la ruta `tarea/[id]` cada vez que
  // cambia la tarea): así el autoguardado nunca pisa lo que la
  // persona está escribiendo con datos que vuelven a llegar del servidor
  // (por ejemplo, al invalidar la query después de guardar, o por un
  // evento de Realtime) mientras sigue editando la misma tarea.
  const [title, setTitle] = useState(task.title);
  const isCompleted = task.completed_at != null;

  const titleAutosave = useAutosave(title, (value) => {
    const trimmed = value.trim();
    const result = taskTitleSchema.safeParse(trimmed);
    if (!result.success) return;
    updateTask.mutate({ id: task.id, projectId: task.project_id, patch: { title: result.data } });
  });

  function saveTitleNow() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    titleAutosave.flush(title);
  }

  function patch(fields: TaskPatch) {
    updateTask.mutate({ id: task.id, projectId: task.project_id, patch: fields });
  }

  function copyLink() {
    const url = `${window.location.origin}/tarea/${task.id}`;
    navigator.clipboard.writeText(url).then(() => toastSuccess("Enlace copiado."));
  }

  function handleDelete() {
    deleteTask.mutate({ id: task.id, projectId: task.project_id });
    onClose?.();
  }

  /**
   * Mover la tarea de proyecto o sección desde el selector del detalle
   * (bloque 6.2-6.4): a diferencia de `MoveTaskDialog` (fila de lista, dos
   * pasos: proyecto y después "Mover acá"), acá elegir el destino en
   * `TaskDestinationSelect` ya mueve la tarea — un solo gesto, sin
   * confirmación aparte. `parentId: null` reproduce el mismo achatamiento
   * que ya hace `MoveTaskDialog` al mover una subtarea: pasa a ser de
   * primer nivel en el destino. La posición se calcula igual que en
   * `useCreateTaskFromParse`: leyendo el caché de la lista destino en vez
   * de suscribirse con `useTasks` a un proyecto que podría no ser el
   * propio de esta tarea.
   */
  function moveTo(destination: TaskDestination) {
    if (destination.projectId === task.project_id && destination.sectionId === task.section_id) return;
    const destinationTasks = queryClient.getQueryData<TaskRow[]>(tasksQueryKey(destination.projectId)) ?? [];
    const position = nextSiblingPositionInContext(destinationTasks, {
      projectId: destination.projectId,
      sectionId: destination.sectionId,
      parentId: null,
    });
    moveTask.mutate({
      id: task.id,
      fromProjectId: task.project_id,
      toProjectId: destination.projectId,
      sectionId: destination.sectionId,
      parentId: null,
      position,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b border-border p-4">
        <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          aria-label={isCompleted ? "Descompletar tarea" : "Completar tarea"}
          onClick={() => patch({ completed_at: isCompleted ? null : new Date().toISOString() })}
          className={cn(
            "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            isCompleted ? "border-primary bg-primary" : "border-input",
          )}
        >
          {isCompleted && <span aria-hidden className="size-2 rounded-full bg-primary-foreground" />}
        </button>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitleNow}
          aria-label="Título de la tarea"
          placeholder="Título de la tarea"
          className={cn("h-auto flex-1 border-none bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0", isCompleted && "text-text-secondary line-through")}
        />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Más acciones de la tarea" />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => duplicateTask.mutate({ task: toTaskRowShape(task) })}>
              <Copy className="size-3.5" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyLink}>
              <Link2 className="size-3.5" /> Copiar enlace directo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`/tarea/${task.id}`, "_blank")}>
              <ExternalLink className="size-3.5" /> Abrir en ventana aparte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-3.5" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onClose && (
          <Button variant="ghost" size="icon-sm" aria-label="Cerrar detalle" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <span className={FIELD_LABEL_CLASS}>Proyecto</span>
            <TaskDestinationSelect
              value={{ projectId: task.project_id, sectionId: task.section_id }}
              onChange={moveTo}
              proyectos={proyectos}
            />
          </div>

          <div className="space-y-1">
            <span className={FIELD_LABEL_CLASS}>Prioridad</span>
            <PrioritySelect value={task.priority} onChange={(priority) => patch({ priority })} />
          </div>

          <div className="space-y-1">
            <span className={FIELD_LABEL_CLASS}>Vencimiento</span>
            <DateSelect
              value={{ dueDate: task.due_date, dueAt: task.due_at, durationMinutes: task.duration_minutes }}
              onChange={(next) => patch({ due_date: next.dueDate, due_at: next.dueAt, duration_minutes: next.durationMinutes })}
              preferences={preferences}
            />
          </div>

          <div className="space-y-1">
            <span className={FIELD_LABEL_CLASS}>Fecha límite</span>
            <DeadlineSelect value={task.deadline} onChange={(deadline) => patch({ deadline })} preferences={preferences} />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className={FIELD_LABEL_CLASS}>Etiquetas</span>
          <LabelPicker taskId={task.id} projectId={task.project_id} assigned={task.labels} />
        </div>

        <div className="space-y-1.5">
          <span className={FIELD_LABEL_CLASS}>Descripción</span>
          <TaskDescriptionEditor
            content={task.description}
            onChange={(json) => updateTask.mutate({ id: task.id, projectId: task.project_id, patch: { description: json } })}
          />
        </div>

        <div className="space-y-1.5">
          <span className={FIELD_LABEL_CLASS}>Subtareas</span>
          <TaskList projectId={task.project_id} sectionId={null} parentId={task.id} />
        </div>
      </div>
    </div>
  );
}

/**
 * Contenido del detalle de una tarea (bloque 6, antes 7.10/7.11), compartido
 * por el modal de detalle (`task-detail-panel.tsx`) y la ruta
 * `app/(app)/tarea/[id]`: título y descripción se autoguardan, el resto de
 * los campos guardan al instante. `initialData` siembra el caché cuando
 * viene de un Server Component (la ruta suelta); el modal abierto desde
 * dentro de la app no tiene esa siembra y arranca en carga.
 */
export function TaskDetailContent({
  taskId,
  initialData,
  onClose,
}: {
  taskId: string;
  initialData?: TaskDetail | null;
  onClose?: () => void;
}) {
  const { data: task, isLoading } = useTask(taskId, initialData);

  if (task === null && !isLoading) {
    return <p className="p-6 text-sm text-text-secondary">Esta tarea ya no existe.</p>;
  }

  if (!task) {
    return <p className="p-6 text-sm text-text-secondary">Cargando…</p>;
  }

  return <TaskDetailForm key={task.id} task={task} onClose={onClose} />;
}
