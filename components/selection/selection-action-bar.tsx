"use client";

import { addDays } from "date-fns";
import { CalendarOff, Flag, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PriorityDot } from "@/components/selectors/priority-select";
import { TaskDestinationSelect, type TaskDestination } from "@/components/tasks/task-destination-select";
import { useParserContext } from "@/lib/parser/use-parser-context";
import { todayInTimeZone } from "@/lib/dates/today";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { useBulkDeleteTasks, useBulkMoveTasks, useBulkUpdateTasks, type BulkTaskRef } from "@/lib/tasks/mutations";
import { TASK_PRIORITIES, priorityLabel } from "@/lib/validation/tasks";
import { useSelection } from "./selection-context";

const triggerClass =
  "flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Barra de acciones en lote (bloque 7.11, capacidad `seleccion-multiple`):
 * aparece flotante, pegada abajo del área de scroll de la lista, apenas hay
 * una tarea seleccionada — mismo lenguaje visual que `ViewOptionsBar`
 * (bordes redondeados, `border-input`, texto `text-sm`) pero elevada con
 * sombra propia porque no forma parte del flujo normal de la pantalla.
 *
 * Cada acción en lote entra en la pila de deshacer como una sola entrada
 * (bloque 7.12): las mutaciones de `lib/tasks/mutations.ts` ya lo resuelven,
 * acá solo se arma `tasks: BulkTaskRef[]` a partir de lo seleccionado.
 *
 * `candidateTasks` es **todo** lo que la pantalla puede seleccionar (todas
 * las tareas de primer nivel visibles, con su proyecto), no lo ya
 * seleccionado: quien monta esta barra vive fuera de `<SelectionProvider>`
 * (lo crea, no está adentro), así que filtrar por lo seleccionado pasa acá,
 * que sí está adentro.
 *
 * El contenido real (`SelectionActionBarContent`) es un componente aparte,
 * montado solo mientras hay selección activa: sus hooks (preferencias,
 * proyectos, las tres mutaciones en lote) no tienen por qué pagarse en el
 * caso común de "nada seleccionado". `useSelection()` sí se llama siempre
 * acá afuera porque ya degrada sola sin `<SelectionProvider>` (mismo
 * criterio que `useUndoStack`), a diferencia de esas otras.
 */
export function SelectionActionBar({ candidateTasks }: { candidateTasks: BulkTaskRef[] }) {
  const selection = useSelection();
  if (!selection || !selection.active) return null;
  return <SelectionActionBarContent candidateTasks={candidateTasks} />;
}

function SelectionActionBarContent({ candidateTasks }: { candidateTasks: BulkTaskRef[] }) {
  const selection = useSelection()!;
  const preferences = useUserPreferences();
  const { proyectos } = useParserContext();
  const bulkUpdate = useBulkUpdateTasks();
  const bulkMove = useBulkMoveTasks();
  const bulkDelete = useBulkDeleteTasks();

  const count = selection.count;
  const tasks = candidateTasks.filter((t) => selection.isSelected(t.id));
  const allVisibleIds = candidateTasks.map((t) => t.id);

  function moveTo(destination: TaskDestination) {
    bulkMove.mutate({ tasks, toProjectId: destination.projectId, toSectionId: destination.sectionId });
  }

  function changePriority(priority: number) {
    bulkUpdate.mutate({ tasks, patch: { priority } });
  }

  function changeDate(dueDate: string | null) {
    bulkUpdate.mutate({ tasks, patch: { due_date: dueDate, due_at: null } });
  }

  // Eliminar es la única acción en lote que sale del modo de selección sola
  // (bloque 7.11): las tareas seleccionadas dejan de existir, así que seguir
  // "seleccionadas" no tiene sentido — a diferencia de mover, prioridad y
  // fecha, que siguen ahí después del cambio y conviene poder encadenar más
  // de una acción sin volver a seleccionar.
  function handleDeleteAll() {
    bulkDelete.mutate({ tasks });
    selection.clear();
  }

  const today = todayInTimeZone(new Date(), preferences.timezone);
  const tomorrow = todayInTimeZone(addDays(new Date(), 1), preferences.timezone);

  return (
    <div
      role="toolbar"
      aria-label="Acciones en lote"
      className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-2.5 shadow-[0_-4px_12px_-4px_rgb(0_0_0/0.1)] sm:px-6"
    >
      <span className="text-sm font-medium text-foreground">
        {count} {count === 1 ? "seleccionada" : "seleccionadas"}
      </span>

      <Button type="button" variant="ghost" size="sm" onClick={() => selection.selectAll(allVisibleIds)}>
        Seleccionar todas
      </Button>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <TaskDestinationSelect
          value={{ projectId: "", sectionId: null }}
          onChange={moveTo}
          proyectos={proyectos}
        />

        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" className={triggerClass} />}>
            <Flag className="size-3.5 text-text-secondary" aria-hidden />
            Prioridad
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Cambiar prioridad</DropdownMenuLabel>
              {TASK_PRIORITIES.map((priority) => (
                <DropdownMenuItem key={priority.value} onClick={() => changePriority(priority.value)}>
                  <PriorityDot priority={priority.value} />
                  {`P${priority.value} · ${priorityLabel(priority.value)}`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center rounded-lg border border-input p-0.5">
          <button type="button" onClick={() => changeDate(today)} className="rounded-md px-2 py-1 text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50">
            Hoy
          </button>
          <button type="button" onClick={() => changeDate(tomorrow)} className="rounded-md px-2 py-1 text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50">
            Mañana
          </button>
          <button
            type="button"
            aria-label="Sin fecha"
            onClick={() => changeDate(null)}
            className="flex items-center justify-center rounded-md px-2 py-1 text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CalendarOff className="size-3.5" aria-hidden />
          </button>
        </div>

        <Button type="button" variant="ghost" size="sm" className="text-error hover:text-error" onClick={handleDeleteAll}>
          <Trash2 className="size-3.5" aria-hidden />
          Eliminar
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Salir del modo de selección"
          onClick={selection.clear}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
