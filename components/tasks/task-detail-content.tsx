"use client";

import { useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { Copy, CornerUpLeft, ExternalLink, Link2, Maximize2, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clickButtonByText, clickFirstButton } from "@/lib/shortcuts/dom";
import { useShortcutScope } from "@/lib/shortcuts/context";
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
import { recurrenceEndsAtDay, recurrenceEndsAtOf } from "@/lib/recurrence/ends-at";
import { toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useDeleteEmptyTask,
  useDeleteTask,
  useDuplicateTask,
  useMoveTask,
  useUpdateTask,
  type TaskPatch,
} from "@/lib/tasks/mutations";
import { nextSiblingPositionInContext } from "@/lib/tasks/tree";
import { useAutosave } from "@/lib/tasks/use-autosave";
import { useTask, type TaskDetail } from "@/lib/tasks/use-task";
import { tasksQueryKey, useTasks, type TaskRow } from "@/lib/tasks/use-tasks";
import { taskTitleSchema } from "@/lib/validation/tasks";
import { CommentThread } from "@/components/comments/comment-thread";
import { ReminderPicker } from "@/components/reminders/reminder-picker";
import { LabelPicker } from "./label-picker";
import { RecurrenceEditor, type RecurrenceValue } from "./recurrence-editor";
import { TaskDescriptionEditor } from "./task-description-editor";
import { TaskDestinationSelect, type TaskDestination } from "./task-destination-select";
import { TaskList } from "./task-list";
import { useTaskDetail } from "./task-detail-context";

const FIELD_LABEL_CLASS = "text-xs font-medium text-text-secondary";

/** `useDuplicateTask` solo necesita la forma de `TaskRow` (para calcular la posición de la copia): sin `description` ni `created_at`. */
function toTaskRowShape(task: TaskDetail): TaskRow {
  const rest: Partial<TaskDetail> = { ...task };
  delete rest.description;
  delete rest.created_at;
  return rest as TaskRow;
}

function TaskDetailForm({ task, onClose }: { task: TaskDetail; onClose?: () => void }) {
  const router = useRouter();
  const preferences = useUserPreferences();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const duplicateTask = useDuplicateTask();
  const deleteTask = useDeleteTask();
  const deleteEmptyTask = useDeleteEmptyTask();
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

  // Mismo criterio de conteo que la fila (D-A, `task-row.tsx`): subtareas
  // directas, no el subárbol. `useTasks` es la misma query que ya usa
  // `TaskList` para listar estas subtareas más abajo — sin consulta nueva.
  const { data: allProjectTasks } = useTasks(task.project_id);
  const children = (allProjectTasks ?? []).filter((t) => t.parent_id === task.id);
  const completedChildrenCount = children.filter((c) => c.completed_at).length;

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

  // Último título tipeado, para la limpieza al desmontar de acá abajo: un
  // efecto con `[task.id]` en las dependencias corre su cleanup recién al
  // desmontarse (o al cambiar de tarea), así que necesita leer el título
  // vigente en ese momento por una ref, no por la variable `title` del
  // render en que se creó el efecto — esa quedaría pegada al valor de cuando
  // se montó.
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  });

  // Si esta tarea llegó al detalle sin título, es la que "Abrir detalle"
  // acaba de crear vacía (D46) — nunca una tarea preexistente, que
  // `saveTitleNow` protege de quedar sin título (D42, sin cambios). Fijo en
  // el primer render (`useRef`, no una variable derivada de `task.title` en
  // cada render): si el título se guarda mientras el detalle sigue abierto,
  // este valor no se tiene que mover, para no reevaluar la limpieza de acá
  // abajo a mitad de camino.
  const wasCreatedEmptyRef = useRef(task.title === "");

  // Nada de esto corre para una tarea que ya tenía título al abrir el
  // detalle (ver `wasCreatedEmptyRef` de acá arriba): guarda el `id` del
  // `setTimeout` diferido de más abajo para poder cancelarlo.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Solo para la tarea que "Abrir detalle" creó vacía: que su detalle no
   * quede a mitad de camino ("una tarea sin título no se puede leer ni
   * buscar; no titularla equivale a no haberla creado"). El desmontaje del
   * formulario —cierre por la `X`, `Escape`, clic afuera, Atrás, o pasar a
   * otro detalle— decide entre las dos cosas que puede significar un título
   * vacío en ese instante: nunca se cargó nada (se borra la tarea,
   * silencioso, sin el toast de "Tarea eliminada" de `useDeleteTask` — nunca
   * llegó a percibirse que existía) o se cargó pero el autoguardado con
   * debounce todavía no llegó a disparar (se fuerza a guardar ya, `flush`,
   * para no perder esas últimas teclas).
   *
   * Cualquier otra tarea sale de acá en el primer chequeo, sin tocar nada:
   * este resguardo no le agrega ningún comportamiento nuevo al cierre del
   * detalle de una tarea que ya existía con título (por ejemplo, "Eliminar"
   * del menú no tiene que competir con esto).
   *
   * El trabajo de la limpieza va diferido un tick (`setTimeout(…, 0)`), y el
   * montaje de acá arriba cancela cualquiera que hubiera quedado pendiente:
   * sin esto, el doble montaje de Strict Mode en desarrollo —React monta,
   * desmonta y vuelve a montar cada efecto una vez, a propósito, para
   * encontrar cleanups no preparados para correr más de una vez— borraba la
   * tarea recién creada antes de que la persona llegara a verla, apenas
   * abría el detalle. El desmontaje sintético de Strict Mode y uno real
   * disparan el mismo cleanup; lo único que los distingue es que al real no
   * lo sigue un montaje que cancele el timer.
   */
  useEffect(() => {
    const wasCreatedEmpty = wasCreatedEmptyRef.current;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    return () => {
      if (!wasCreatedEmpty) return;
      closeTimerRef.current = setTimeout(() => {
        const trimmed = titleRef.current.trim();
        if (trimmed) {
          titleAutosave.flush(titleRef.current);
        } else {
          deleteEmptyTask.mutate({ id: task.id, projectId: task.project_id });
        }
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  function patch(fields: TaskPatch) {
    updateTask.mutate({ id: task.id, projectId: task.project_id, patch: fields });
  }

  const recurrenceValue: RecurrenceValue = {
    rule: task.recurrence_rule,
    endsAt: task.recurrence_ends_at ? recurrenceEndsAtDay(task.recurrence_ends_at, preferences.timezone) : null,
    count: task.recurrence_count,
    anchor: task.recurrence_anchor,
  };

  /**
   * La fecha de la tarea que alimenta las opciones rápidas del editor de
   * repetición (`repeticion-configurable`, D-C): `due_date` si la tarea
   * tiene solo día, o el día calendario de `due_at` en la zona del usuario
   * si tiene hora — mismo cálculo que ya hace `ReminderPicker` para su
   * propio `dayOf`. `null` si la tarea no tiene ninguna fecha: el editor no
   * ofrece ahí las opciones que dependen de ella.
   */
  const recurrenceDueDate =
    task.due_date ?? (task.due_at ? formatInTimeZone(task.due_at, preferences.timezone, "yyyy-MM-dd") : null);

  /**
   * `recurrence_ends_at` es `timestamptz` (D9): el editor solo elige un día
   * de calendario, así que hay que anclarlo al final de ese día en la zona
   * del usuario antes de guardarlo (ver `lib/recurrence/ends-at.ts`) — igual
   * que `toDueAt` hace para `due_at`.
   */
  function patchRecurrence(next: RecurrenceValue) {
    patch({
      recurrence_rule: next.rule,
      recurrence_ends_at: next.endsAt ? recurrenceEndsAtOf(next.endsAt, preferences.timezone) : null,
      recurrence_count: next.count,
      recurrence_anchor: next.anchor,
    });
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

  // Atajos del detalle de tarea (bloque 7.6, capacidad `atajos-de-teclado`):
  // los selectores (`DateSelect`, `PrioritySelect`, etc.) manejan su propio
  // popover/menú sin una prop de apertura externa — abrirlos acá clickea su
  // propio trigger (`lib/shortcuts/dom.ts`) en vez de sumarles esa prop a
  // cada uno solo para este caso.
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const deadlineFieldRef = useRef<HTMLDivElement>(null);
  const priorityFieldRef = useRef<HTMLDivElement>(null);
  const remindersFieldRef = useRef<HTMLDivElement>(null);
  const destinationFieldRef = useRef<HTMLDivElement>(null);
  const labelsFieldRef = useRef<HTMLDivElement>(null);
  const subtasksFieldRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { consumeFocusField, open: openTaskDetail } = useTaskDetail();

  // Tarea padre (bloque 2, D-D): el dato ya viene en `TaskDetail.parent_id`,
  // así que alcanza con pedir su título por la misma vía que cualquier
  // detalle — comparte caché con el detalle del padre si ya se pidió antes.
  // Solo el padre directo: no se resuelve la cadena de ancestros.
  const { data: parentTask } = useTask(task.parent_id);

  // El menú contextual de una tarea (bloque 7.8; `menu-contextual-de-tarea`
  // D-B para fecha límite y recordatorios) abre el detalle y de una vez el
  // selector correspondiente, en vez de solo abrir el detalle a secas: se
  // consume una sola vez al montar, con la tarea ya resuelta (el
  // `key={task.id}` de quien monta este formulario asegura que esto corre de
  // nuevo si se abre otra tarea). `T`/`Y` ya no pasan por acá (D-C: resuelven
  // fecha y prioridad dentro del propio menú) — lo que queda usando esto es
  // "Más fechas…" (fecha) y "Fecha límite"/"Recordatorios" del menú.
  //
  // Dos cuidados acá, los dos confirmados reproduciendo el bug de `Y` en un
  // test antes de tocar nada:
  //
  // 1. `consumeFocusField` no entra en las dependencias (`exhaustive-deps`
  //    deshabilitado a propósito): cambia de identidad cada vez que se lo
  //    llama, porque consume `pendingFocusField` (lo deja en `null`). Si
  //    entrara en las dependencias, este efecto se dispara una segunda vez
  //    apenas se llama a sí mismo — con el campo ya consumido (`null`), sin
  //    volver a clickear nada, pero sí corriendo la limpieza del `rAF` de
  //    abajo antes de que llegue a disparar.
  // 2. El click en sí se difiere un frame (`requestAnimationFrame`) en vez
  //    de ser síncrono: el selector (`DateSelect`/`PrioritySelect`) recién
  //    montó en este mismo commit, y su primitiva de menú/popover
  //    (`@base-ui/react`) todavía no terminó de conectar su propio manejo
  //    de clic — clickear en el mismo tick a veces cae en esa ventana y el
  //    clic se pierde en silencio. Esperar un frame le da tiempo a esa
  //    conexión antes de simular el clic, para los dos campos por igual.
  useEffect(() => {
    const focusField = consumeFocusField();
    const frame = requestAnimationFrame(() => {
      if (focusField === "date") clickFirstButton(dateFieldRef.current);
      if (focusField === "priority") clickFirstButton(priorityFieldRef.current);
      if (focusField === "deadline") clickFirstButton(deadlineFieldRef.current);
      if (focusField === "reminders") clickFirstButton(remindersFieldRef.current);
      if (focusField === "title") titleInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useShortcutScope([
    { combo: { key: "s", ctrl: true }, handler: () => saveTitleNow() },
    { combo: { key: "d" }, handler: () => clickFirstButton(dateFieldRef.current) },
    { combo: { key: "l" }, handler: () => clickFirstButton(deadlineFieldRef.current) },
    { combo: { key: "f" }, handler: () => clickFirstButton(priorityFieldRef.current) },
    { combo: { key: "r" }, handler: () => clickFirstButton(remindersFieldRef.current) },
    { combo: { key: "o" }, handler: () => clickFirstButton(destinationFieldRef.current) },
    { combo: { key: "e" }, handler: () => clickFirstButton(labelsFieldRef.current) },
    { combo: { key: "n" }, handler: () => clickButtonByText(subtasksFieldRef.current, "Agregar subtarea") },
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border">
        {parentTask && (
          <button
            type="button"
            onClick={() => openTaskDetail(parentTask.id)}
            className="flex items-center gap-1 px-4 pt-3 text-xs text-text-secondary hover:text-foreground hover:underline"
          >
            <CornerUpLeft className="size-3" aria-hidden />
            Subtarea de {parentTask.title}
          </button>
        )}

        <div className="flex items-start gap-2 p-4">
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
            ref={titleInputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitleNow}
            aria-label="Título de la tarea"
            placeholder="Título de la tarea"
            className={cn("h-auto flex-1 border-none bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0", isCompleted && "text-text-completed line-through")}
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
              <DropdownMenuItem onClick={() => router.push(`/tarea/${task.id}`)}>
                <Maximize2 className="size-3.5" /> Abrir completo en esta ventana
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
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/*
          Dos columnas en escritorio ancho (bloque `detalle-de-tarea-en-dos-columnas`,
          D-A): a la izquierda lo que se escribe, a la derecha lo que se elige.
          Abajo de `lg`, colapsa a una columna — y ahí el orden del DOM ya deja
          los atributos primero (D-C), así que no hace falta reordenar nada
          aparte para ese caso; `lg:order-*` solo entra en juego en dos columnas,
          para poner el contenido a la izquierda y los atributos a la derecha.
          Un único scroll para las dos columnas (el de este contenedor): si la
          columna de atributos creciera tanto que necesitara el suyo propio, es
          señal de que hay demasiados atributos, no de que falte la barra.
        */}
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
          <div className="space-y-5 lg:order-2 lg:w-72 lg:shrink-0">
            <div ref={destinationFieldRef} className="space-y-1">
              <span className={FIELD_LABEL_CLASS}>Proyecto</span>
              <TaskDestinationSelect
                value={{ projectId: task.project_id, sectionId: task.section_id }}
                onChange={moveTo}
                proyectos={proyectos}
                variant="row"
              />
            </div>

            <div ref={priorityFieldRef} className="space-y-1">
              <span className={FIELD_LABEL_CLASS}>Prioridad</span>
              <PrioritySelect value={task.priority} onChange={(priority) => patch({ priority })} variant="row" />
            </div>

            <div ref={dateFieldRef} className="space-y-1">
              <span className={FIELD_LABEL_CLASS}>Vencimiento</span>
              <DateSelect
                value={{ dueDate: task.due_date, dueAt: task.due_at, durationMinutes: task.duration_minutes }}
                onChange={(next) => patch({ due_date: next.dueDate, due_at: next.dueAt, duration_minutes: next.durationMinutes })}
                preferences={preferences}
                variant="row"
              />
            </div>

            <div ref={deadlineFieldRef} className="space-y-1">
              <span className={FIELD_LABEL_CLASS}>Fecha límite</span>
              <DeadlineSelect
                value={task.deadline}
                onChange={(deadline) => patch({ deadline })}
                preferences={preferences}
                variant="row"
              />
            </div>

            <div ref={remindersFieldRef} className="space-y-1">
              <span className={FIELD_LABEL_CLASS}>Recordatorios</span>
              <ReminderPicker taskId={task.id} dueAt={task.due_at} variant="row" />
            </div>

            <div className="space-y-1.5">
              <span className={FIELD_LABEL_CLASS}>Repetición</span>
              <RecurrenceEditor
                value={recurrenceValue}
                onChange={patchRecurrence}
                dueDate={recurrenceDueDate}
                weekStartsOn={preferences.weekStartsOn}
              />
            </div>

            <div ref={labelsFieldRef} className="space-y-1.5">
              <span className={FIELD_LABEL_CLASS}>Etiquetas</span>
              <LabelPicker taskId={task.id} projectId={task.project_id} assigned={task.labels} />
            </div>
          </div>

          <div className="min-w-0 space-y-5 lg:order-1 lg:flex-1">
            <div className="space-y-1.5">
              <span className={FIELD_LABEL_CLASS}>Descripción</span>
              <TaskDescriptionEditor
                content={task.description}
                onChange={(json) => updateTask.mutate({ id: task.id, projectId: task.project_id, patch: { description: json } })}
              />
            </div>

            <div ref={subtasksFieldRef} className="space-y-1.5">
              <span className={FIELD_LABEL_CLASS}>
                Subtareas
                {children.length > 0 && (
                  <span className="ml-1.5 text-text-secondary">
                    {completedChildrenCount}/{children.length}
                  </span>
                )}
              </span>
              <TaskList projectId={task.project_id} sectionId={null} parentId={task.id} />
            </div>

            <div className="space-y-1.5">
              <span className={FIELD_LABEL_CLASS}>Comentarios</span>
              <CommentThread taskId={task.id} />
            </div>
          </div>
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
