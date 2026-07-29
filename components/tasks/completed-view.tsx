"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompletedTasks, useCompletedTasksCount } from "@/lib/tasks/use-completed-tasks";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { TaskListEmptyState } from "./task-list-empty-state";
import { TaskRow } from "./task-row";

const PAGE_SIZE = 50;

/**
 * Vista Completado (bloque 8.5): lista con contador del total y la acción
 * de volver a marcar pendiente — el mismo casillero que completa en las
 * demás vistas, tocado de nuevo. Paginación por rango
 * (`.claude/rules/database.md`): trae de a `PAGE_SIZE`, "Cargar más" amplía
 * el rango en vez de traer la lista entera de una.
 */
export function CompletedView({
  userId,
  initialTasks,
  initialCount,
}: {
  userId: string;
  initialTasks: TaskRowData[];
  initialCount: number;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data } = useCompletedTasks(userId, limit, limit === PAGE_SIZE ? initialTasks : undefined);
  const { data: count } = useCompletedTasksCount(userId, initialCount);
  const tasks = data ?? [];
  const total = count ?? 0;
  const hasMore = tasks.length < total && tasks.length >= limit;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="w-full max-w-content @[90rem]:mx-auto">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Completado</h1>
          </div>
          {total > 0 && (
            <p className="mt-1 text-sm text-text-secondary">
              {total} {total === 1 ? "tarea completada" : "tareas completadas"}
            </p>
          )}
        </div>
      </header>
      <div className="w-full max-w-content flex-1 overflow-y-auto p-4 sm:p-6 @[90rem]:mx-auto">
        {tasks.length === 0 ? (
          <TaskListEmptyState
            icon={CheckCircle2}
            title="Todavía no completaste ninguna tarea."
            description="Acá van a aparecer las tareas que marques como completadas."
            action={
              <Button render={<Link href="/bandeja" />} variant="outline" size="sm">
                Ir a la bandeja de entrada
              </Button>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} allTasks={tasks} siblings={[]} depth={0} variant="flat" />
              ))}
            </ul>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
