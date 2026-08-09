import { CalendarDays, CheckCircle2, Circle, FlagTriangleRight } from "lucide-react";
import { PriorityDot } from "@/components/selectors/priority-select";
import { DEFAULT_TASK_PRIORITY, priorityLabel } from "@/lib/validation/tasks";
import { formatSharedDate } from "@/lib/public-project/format-date";
import type { SharedTaskNode } from "@/lib/public-project/build-tree";
import { ReadOnlyDescription } from "./read-only-description";
import { cn } from "@/lib/utils";

/**
 * Fila de tarea de la vista pública (bloque 3, tarea 3.5): nada de lo que
 * dibuja es interactivo. El estado de "completada" se marca con un ícono
 * (`CheckCircle2`/`Circle`, ambos `aria-hidden`), no con el círculo con
 * borde de `components/tasks/task-row.tsx` (`<button role="checkbox">`
 * ahí): usar la misma forma visual invitaría a tocarlo aunque no hiciera
 * nada — acá directamente es otra cosa, un ícono de estado, no un control.
 */
export function PublicTaskRow({ task, depth = 0 }: { task: SharedTaskNode; depth?: number }) {
  const dueValue = task.due_date ?? task.due_at;
  const StatusIcon = task.completed ? CheckCircle2 : Circle;

  return (
    <li className={cn(depth > 0 && "ml-6 border-l border-border pl-4")}>
      <div className="flex items-start gap-2.5 py-2">
        <StatusIcon
          aria-hidden
          className={cn("mt-0.5 size-4 shrink-0", task.completed ? "text-primary" : "text-text-secondary/50")}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("text-sm text-foreground", task.completed && "text-text-secondary line-through")}>
            {task.title}
            <span className="sr-only">{task.completed ? " (completada)" : " (pendiente)"}</span>
          </p>

          {(dueValue || task.deadline || task.priority !== DEFAULT_TASK_PRIORITY) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
              {dueValue && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {formatSharedDate(dueValue)}
                </span>
              )}
              {task.deadline && (
                <span className="inline-flex items-center gap-1">
                  <FlagTriangleRight className="size-3.5" aria-hidden />
                  Fecha límite: {formatSharedDate(task.deadline)}
                </span>
              )}
              {task.priority !== DEFAULT_TASK_PRIORITY && (
                <span className="inline-flex items-center gap-1.5">
                  <PriorityDot priority={task.priority} />
                  {priorityLabel(task.priority)}
                </span>
              )}
            </div>
          )}

          <ReadOnlyDescription content={task.description} />
        </div>
      </div>

      {task.subtasks.length > 0 && (
        <ul>
          {task.subtasks.map((subtask) => (
            <PublicTaskRow key={subtask.id} task={subtask} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
