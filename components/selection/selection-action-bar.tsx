"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import { CalendarOff, Flag, MoreHorizontal, Tags, Trash2, X } from "lucide-react";
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
import { LabelPicker } from "@/components/tasks/label-picker";
import { TaskDestinationSelect, type TaskDestination } from "@/components/tasks/task-destination-select";
import { useParserContext } from "@/lib/parser/use-parser-context";
import { todayInTimeZone } from "@/lib/dates/today";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { useBulkAddLabels, useBulkDeleteTasks, useBulkMoveTasks, useBulkUpdateTasks, type BulkTaskRef } from "@/lib/tasks/mutations";
import type { LabelChip } from "@/lib/tasks/use-tasks";
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
 * proyectos, las cuatro mutaciones en lote) no tienen por qué pagarse en el
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
  const bulkAddLabels = useBulkAddLabels();
  // Borrador de etiquetas a sumar (D-C de `seleccion-con-ctrl`): el
  // `LabelPicker` se reutiliza en su modo "borrador" (`onChange`, sin
  // `taskId`) porque en lote no hay un conjunto "asignado" único que
  // mostrar — cada tarea seleccionada puede traer etiquetas distintas, y
  // mostrar las de una sería engañoso. Elegir acá solo arma la lista a
  // sumar; no toca el servidor hasta "Sumar etiquetas".
  const [labelsToAdd, setLabelsToAdd] = useState<LabelChip[]>([]);

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

  // "Sumar", nunca "reemplazar" (D-C, requirement "Aplicar etiquetas en lote
  // SHALL sumar"): el nombre del botón lo dice porque es la diferencia
  // deliberada con editar una sola tarea, y alguien la va a notar.
  function applyLabels() {
    if (labelsToAdd.length === 0) return;
    bulkAddLabels.mutate({ tasks, labels: labelsToAdd });
    setLabelsToAdd([]);
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

        {/* Etiquetas en lote (bloque 7.11, D-C): el `LabelPicker` en modo
            borrador arma la lista a sumar (mostrada como chips en su propio
            gatillo), y "Sumar etiquetas" recién ahí dispara la mutación —
            el nombre del botón es la forma en que la interfaz dice que suma,
            no reemplaza (requirement, D-C). */}
        <div className="flex items-center gap-1.5">
          <LabelPicker
            projectId=""
            assigned={labelsToAdd}
            onChange={setLabelsToAdd}
            triggerClassName="h-8 w-auto max-w-40"
          />
          <Button type="button" variant="ghost" size="sm" disabled={labelsToAdd.length === 0} onClick={applyLabels}>
            <Tags className="size-3.5" aria-hidden />
            Sumar etiquetas
          </Button>
        </div>

        <Button type="button" variant="ghost" size="sm" className="text-error hover:text-error" onClick={handleDeleteAll}>
          <Trash2 className="size-3.5" aria-hidden />
          Eliminar
        </Button>

        {/* Menú de más (D-D): la barra ya tenía siete controles y sumamos
            etiquetas, así que en pantallas angostas (390px) no entran todos
            en línea. Acá van "seleccionar todas" y los tres atajos de fecha
            — los que menos se usan de la barra llena, mirándola armada
            (mover, prioridad y etiquetas son las acciones nuevas o
            frecuentes; eliminar NUNCA va acá por ser destructiva). Ítems
            planos, sin submenú anidado: un `DropdownMenuSub` abre por hover
            (Base UI), un gesto que no aporta nada para tres acciones fijas y
            solo suma fragilidad. */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Más acciones en lote" />}>
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => selection.selectAll(allVisibleIds)}>Seleccionar todas</DropdownMenuItem>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Fecha</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => changeDate(today)}>Hoy</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeDate(tomorrow)}>Mañana</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeDate(null)}>
                <CalendarOff className="size-3.5" aria-hidden />
                Sin fecha
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

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
