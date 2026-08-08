"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTheme } from "next-themes";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Bell,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Flag,
  FlagTriangleRight,
  FolderInput,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  Link2,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AppContextMenu, renderDropdownEntries, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/lib/toast";
import { formatTaskDueLabel } from "@/lib/dates/format";
import { useShortcutScope } from "@/lib/shortcuts/context";
import type { ShortcutCombo } from "@/lib/shortcuts/types";
import { clickFirstButton } from "@/lib/shortcuts/dom";
import { ShortcutHint } from "@/components/shortcuts/shortcut-hint";
import { useListCursor } from "@/components/list-cursor/list-cursor-context";
import { toDueAt } from "@/lib/parser/dates";
import { useDeleteTask, useDuplicateTask, useMoveTask, useUpdateTask } from "@/lib/tasks/mutations";
import { computeIndent, computeOutdent, positionAfterOriginal, positionBeforeOriginal, positionForSwap } from "@/lib/tasks/tree";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { useProjects } from "@/lib/projects/use-projects";
import { useAllSections } from "@/lib/sections/use-sections";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { useMounted } from "@/hooks/use-mounted";
import { DEFAULT_TASK_PRIORITY, TASK_PRIORITIES } from "@/lib/validation/tasks";
import { getQuickDateOptions } from "@/components/selectors/quick-dates";
import { SelectionCheckbox } from "@/components/selection/selection-checkbox";
import { useSelection } from "@/components/selection/selection-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MoveTaskDialog } from "./move-task-dialog";
import { PriorityDot } from "@/components/selectors/priority-select";
import { useTaskDetail } from "./task-detail-context";
import { TaskList } from "./task-list";
import { TaskQuickAddRow } from "./task-quick-add-row";

function LabelChipView({ label, completed = false }: { label: TaskRowData["labels"][number]; completed?: boolean }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  // `label.color` ya no es siempre un id de la paleta: desde que
  // `administracion-de-etiquetas` amplió `labels.color` al mismo hex
  // personalizado que `projects.color` (D29), resolverlo pasa por
  // `resolveProjectColorHex`, no por indexar `PROJECT_COLORS` a mano — ver
  // el comentario de esa función en `lib/validation/colors.ts`.
  // Hasta montar, forzar "light" (lo mismo que asume el servidor):
  // `resolvedTheme` se resuelve en el cliente desde el primer render, antes
  // de montar, y puede no coincidir con el servidor.
  const hex = resolveProjectColorHex(label.color, mounted && resolvedTheme === "dark" ? "dark" : "light");
  return (
    // `completed`: el color de la etiqueta es un hex de proyecto, no un
    // token de texto — no hay a dónde bajarlo con `--text-completed`. La
    // opacidad acá es del chip en sí, no de la fila entera (bloque
    // "completado más sombreado": esa es justo la que está prohibida,
    // porque apagaría también el casillero marcado).
    <span
      className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium text-white", completed && "opacity-70")}
      style={{ backgroundColor: hex }}
    >
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
 *
 * El detalle (bloque 6) abre con doble clic sobre el título, no con un
 * clic simple — ver `handleTitleClick`/`onDoubleClick` más abajo. El menú
 * de acciones conserva "Abrir detalle" como camino de un solo clic. En
 * teléfono (mismo corte que `task-detail-panel.tsx`, `max-width: 767px`) no
 * hay doble tap confiable ni hover, así que un tap simple sobre el título
 * abre directo, y el grip de arrastre y el menú "…" quedan siempre visibles
 * en vez de depender de `group-hover` (principio de D24: ninguna acción solo
 * por gesto/hover).
 *
 * Menú de acciones (`menu-contextual-de-tarea`): el botón "…" y el clic
 * derecho sobre la fila abren **el mismo** menú (D-A) — un único árbol de
 * `menuEntries` más abajo, renderizado una vez para `AppContextMenu` (clic
 * derecho, `components/primitives/context-menu.tsx`) y otra para
 * `DropdownMenu` (el botón), nunca dos listas mantenidas por separado. El
 * clic derecho sigue dando el menú del navegador sobre un enlace, texto
 * seleccionado o un campo editable (D-E) — ver `handleRowContextMenu`.
 */
export function TaskRow({
  task,
  allTasks,
  siblings,
  depth,
  variant = "list",
  showDragHandle,
  sortableData,
  selectionOrderIds,
  showProject = false,
  hideLabelId,
  dragOverlay = false,
  collapsedTaskIds,
  onSetCollapsed,
}: {
  task: TaskRowData;
  allTasks: TaskRowData[];
  siblings: TaskRowData[];
  depth: number;
  /**
   * `"board"` (`openspec/changes/panel-con-columnas-por-campo/`, D-D del
   * design): la tarjeta del tablero, mismo comportamiento sin niveles que
   * `"flat"` (no indenta, no expande subtareas) más dos líneas de título en
   * vez de una y el fondo/radio propio de tarjeta — ver `isFlat` más abajo.
   */
  variant?: "list" | "flat" | "board";
  /** Por defecto, el mismo criterio de siempre (`variant === "list"`). El modo panel (`components/board/`) lo pasa explícitamente en `true` sobre `variant="board"`, para arrastrar una tarjeta entre columnas sin heredar indentar/subtareas. */
  showDragHandle?: boolean;
  /** Datos que dnd-kit adjunta al evento de arrastre (bloque 6.7): el modo panel los usa para saber de qué columna salió la tarjeta. */
  sortableData?: Record<string, unknown>;
  /**
   * Orden visual de las tareas de primer nivel de la pantalla que la
   * contiene (bloque 7.10-7.13, capacidad `seleccion-multiple`), para
   * `⇧clic` (rango). Solo lo pasan las seis pantallas con selección
   * múltiple, y solo importa en `depth === 0`: sin esto, no se muestra el
   * casillero de selección (ej. las subtareas del detalle de tarea).
   */
  selectionOrderIds?: string[];
  /**
   * Proyecto y sección anclados a la derecha del título (`fila-de-tarea-en-
   * niveles`, D-B): decisión explícita de quien monta la fila, nunca
   * derivada de `variant`. La prende Hoy, Próximos, Etiqueta, Filtro,
   * Buscador y Completado — las seis vistas que cruzan proyectos. La
   * Bandeja, un proyecto, una sección, el tablero y las subtareas del
   * detalle la dejan en `false` (el default) porque ahí el proyecto ya lo
   * dice el encabezado.
   */
  showProject?: boolean;
  /** La página de una etiqueta no repite esa misma etiqueta en cada fila (bloque 4.4): ya la dice el encabezado. */
  hideLabelId?: string;
  /**
   * La copia visual que el tablero dibuja en el `DragOverlay` mientras se
   * arrastra (D-D): mismo aspecto que la tarjeta original, pero inerte
   * (`inert`, más abajo) — nadie interactúa con la copia, así que no debe
   * competir por foco ni duplicar el nombre accesible de la original.
   * `useSortable` se sigue llamando (las reglas de hooks no dejan hacerlo
   * condicional), pero con un id propio y deshabilitado: si usara el mismo
   * id que la fila real, las dos quedarían registradas para la misma
   * tarjeta dentro de `@dnd-kit`.
   */
  dragOverlay?: boolean;
  /**
   * Subtareas colapsadas de toda la pantalla (bloque 3, capacidad
   * `cursor-de-lista`, tarea 2.2 corregida acá): sin esto, el estado
   * "plegada" de cada subtarea es local (`useState` propio de esta misma
   * función) y la pantalla que arma `orderedIds` para el cursor no tiene
   * forma de saber qué subárboles saltear (design.md, D-B, "la pantalla es
   * la única que sabe qué está colapsado" — pero de una subtarea, hoy, no
   * lo sabía). Solo lo pasan las pantallas que cablean el cursor
   * (`SectionedTasks`, Proyecto/Bandeja); el resto de los llamadores
   * (subtareas del detalle, tablero) no lo pasan y esta fila sigue
   * colapsando con estado local, sin cambios de comportamiento.
   */
  collapsedTaskIds?: ReadonlySet<string>;
  /** Ver `collapsedTaskIds`: el par que la escribe. */
  onSetCollapsed?: (id: string, value: boolean) => void;
}) {
  const { open, openTaskId } = useTaskDetail();
  const selection = useSelection();
  const cursor = useListCursor();
  // Mismo criterio que el casillero (`SelectionCheckbox`, línea 518 más
  // abajo): `Ctrl`/`Cmd`+clic solo selecciona donde el casillero también
  // existiría (`selectionOrderIds` presente y `depth === 0`) — sin esto no
  // habría `orderedIds` para el rango, ni sentido en las subtareas del
  // detalle, que no tienen selección múltiple.
  const selectableHere = Boolean(selectionOrderIds) && depth === 0 && selection != null;
  const isMobile = useMediaQuery("(max-width: 767px)");
  const preferences = useUserPreferences();
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();
  const duplicateTask = useDuplicateTask();
  const deleteTask = useDeleteTask();
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  // Ver el comentario de `collapsedTaskIds` en la firma: con la pantalla
  // controlando el colapso (cursor cableado), este estado local queda sin
  // usar; sin ella (subtareas del detalle, tablero), sigue siendo el dueño.
  const collapsed = collapsedTaskIds ? collapsedTaskIds.has(task.id) : localCollapsed;
  function setCollapsed(value: boolean) {
    if (onSetCollapsed) onSetCollapsed(task.id, value);
    else setLocalCollapsed(value);
  }
  const [addingFirstSubtask, setAddingFirstSubtask] = useState(false);
  // Agregar tarea encima/debajo (`menu-contextual-de-tarea`, D-D): mismo
  // patrón que `addingFirstSubtask` de arriba — una vez abierto, el
  // composer queda montado en su lugar (encima o debajo de esta fila) hasta
  // que se desmonte la fila misma, igual que ya acepta "Agregar subtarea".
  const [addingAbove, setAddingAbove] = useState(false);
  const [addingBelow, setAddingBelow] = useState(false);
  // Apertura controlada de las filas de fecha/prioridad del menú (D-C): `T`
  // e `Y` las abren sin pasar por el hover o la flecha derecha del submenú.
  const [dateSubOpen, setDateSubOpen] = useState(false);
  const [prioritySubOpen, setPrioritySubOpen] = useState(false);
  const now = useMemo(() => new Date(), []);
  // Cursor de lista (bloque 3, D-A): nodo real de la fila, para el foco
  // (`ListCursorProvider` lo pide vía `registerRow`) y para devolverlo acá
  // al cerrar el menú. `menuTriggerRef` envuelve el botón "…" para que "."
  // lo clickee (bloque 4.5), mismo patrón que ya usa
  // `clickFirstButton`/`clickButtonByText` para los selectores del detalle.
  const liRef = useRef<HTMLLIElement>(null);
  const menuTriggerRef = useRef<HTMLDivElement>(null);
  const isCursorRow = cursor?.isCursor(task.id) ?? false;

  // Al cerrar el menú (por cualquier vía: Escape, clic afuera, elegir un
  // ítem), las filas de fecha/prioridad vuelven a su estado inicial: sin
  // esto, la próxima vez que se abre el menú de esta fila aparecen ya
  // desplegadas por el `T`/`Y` de la vez anterior, en vez de arrancar
  // colapsadas como cualquier submenú.
  function handleMenuOpenChange(open: boolean) {
    setMenuOpen(open);
    cursor?.setRowMenuOpen(task.id, open);
    if (!open) {
      setDateSubOpen(false);
      setPrioritySubOpen(false);
      // Requirement "Cerrar el menú devuelve el foco a la fila": si la fila
      // sigue montada (una acción del propio menú no la borró — ese caso lo
      // resuelve `reconcile` en `ListCursorProvider`, D-C), recupera el
      // foco real que tenía antes de abrir el menú, sea por clic derecho o
      // por el botón "…".
      liRef.current?.focus();
    }
  }

  const isFlat = variant !== "list";
  const dragHandleVisible = showDragHandle ?? !isFlat;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    // Id propio para la copia del overlay (ver el comentario de `dragOverlay`
    // más arriba): con el mismo id que la fila real, quedarían dos
    // registradas para la misma tarjeta.
    id: dragOverlay ? `board-drag-overlay:${task.id}` : task.id,
    data: sortableData,
    disabled: dragOverlay,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const children = isFlat ? [] : allTasks.filter((t) => t.parent_id === task.id);
  const hasChildren = children.length > 0;
  const completedChildrenCount = children.filter((c) => c.completed_at).length;
  const isCompleted = task.completed_at != null;
  const due = formatTaskDueLabel(task, { now, ...preferences });

  // Proyecto y sección ancladas a la derecha (`fila-de-tarea-en-niveles`,
  // D-B/D-D): el nombre del proyecto ya está sembrado en el caché de
  // `useProjects` desde el layout (bloque 5) — nada nuevo que consultar acá.
  // El de sección viene de `useAllSections`, una consulta mayorista de todas
  // las secciones del usuario (nunca de a un proyecto por vez), sembrada
  // igual que los proyectos por `AllSectionsSeed`. Ninguna de las dos pide
  // nada si `showProject` es `false`: el hook igual se llama (regla de los
  // hooks), pero lee del mismo caché que ya usan otras pantallas, sin costo
  // de red propio.
  const { data: projects } = useProjects();
  const { data: allSections } = useAllSections();
  const project = showProject ? projects?.find((p) => p.id === task.project_id) : undefined;
  const section = showProject && task.section_id ? allSections?.find((s) => s.id === task.section_id) : undefined;
  const projectMetaLabel = project ? (section ? `${project.name} / ${section.name}` : project.name) : null;

  const visibleLabels = hideLabelId ? task.labels.filter((label) => label.id !== hideLabelId) : task.labels;
  const hasDateOrLabels = Boolean(due) || visibleLabels.length > 0;
  // En 390px el proyecto anclado a la derecha del título le come 60-100px
  // justo donde menos sobra (D-F): en vez de eso, baja al segundo nivel,
  // junto a la fecha y las etiquetas, donde el ancho es entero.
  const projectInFirstLevel = projectMetaLabel != null && !isMobile;
  const projectInSecondLevel = projectMetaLabel != null && isMobile;
  const hasSecondLevel = hasDateOrLabels || projectInSecondLevel;

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

  // Fecha y prioridad resueltas en el propio menú (`menu-contextual-de-tarea`,
  // D-B): mismo camino optimista que el resto de la fila (`useUpdateTask`),
  // sin abrir ningún selector. Un acceso rápido conserva la hora si la tarea
  // ya tenía una (mismo criterio que el calendario de `DateSelect`): cambiar
  // el día no debería borrar en silencio una hora ya elegida.
  function applyQuickDate(day: string) {
    if (task.due_at) {
      const [hour, minute] = formatInTimeZone(task.due_at, preferences.timezone, "HH:mm").split(":").map(Number);
      const [y, m, d] = day.split("-").map(Number);
      updateTask.mutate({
        id: task.id,
        projectId: task.project_id,
        patch: { due_date: null, due_at: toDueAt({ y, m, d }, hour, minute, preferences.timezone), duration_minutes: task.duration_minutes },
      });
    } else {
      updateTask.mutate({ id: task.id, projectId: task.project_id, patch: { due_date: day, due_at: null, duration_minutes: null } });
    }
  }

  function clearDate() {
    updateTask.mutate({ id: task.id, projectId: task.project_id, patch: { due_date: null, due_at: null, duration_minutes: null } });
  }

  function setPriority(priority: number) {
    updateTask.mutate({ id: task.id, projectId: task.project_id, patch: { priority } });
  }

  // Los cuatro accesos rápidos de fecha (bloque 4.3): la misma función que ya
  // usa `DatePickerBody`, nunca una cuenta de días propia acá.
  const quickDateOptions = useMemo(
    () =>
      getQuickDateOptions(now, {
        zonaHoraria: preferences.timezone,
        semanaEmpiezaEn: preferences.weekStartsOn,
        proyectos: [],
        etiquetas: [],
      }),
    [now, preferences.timezone, preferences.weekStartsOn],
  );
  const hasDate = task.due_date != null || task.due_at != null;

  // Atajos del menú contextual de la tarea (bloque 7.8, capacidad
  // `atajos-de-teclado`; D-C de `menu-contextual-de-tarea`): activos solo
  // mientras el menú de esta fila está abierto (`enabled: menuOpen`), sea
  // por clic derecho o por el botón "…" — solo puede haber uno abierto por
  // vez de todos modos. `T` e `Y` pasan a abrir la fila de fecha/prioridad
  // dentro del propio menú (antes abrían el detalle con el selector
  // enfocado): el spec de atajos ya decía "abre el selector de fecha/de
  // prioridad de esa tarea", así que esto acerca el código al contrato en
  // vez de alejarlo.
  //
  // Las cuatro que sí tienen indicador visual (bloque 2, D-C) viven en este
  // objeto en vez de como literales sueltos: `useShortcutScope` de abajo y
  // los `ShortcutHint` del menú leen del mismo lugar, así que no se pueden
  // desincronizar.
  const menuShortcuts = {
    mover: { key: "v" },
    copiarEnlace: { key: "c", ctrl: true, shift: true },
    abrirVentana: { key: "n", ctrl: true, shift: true },
    eliminar: { key: "Delete", shift: true },
  } as const satisfies Record<string, ShortcutCombo>;

  // Estas cuatro (a diferencia de `T`/`Y`, que dejan el menú abierto para
  // seguir eligiendo dentro de la fila que acaban de desplegar) hacen lo
  // mismo que clickear el ítem equivalente del menú: la acción, y cerrar —
  // clickear un `DropdownMenuItem`/`ContextMenuItem` cierra el menú solo,
  // pero disparar la acción desde el atajo global no pasa por ese mismo
  // camino, así que hay que cerrarlo acá a mano para que las dos formas de
  // activar la acción se comporten igual.
  function runAndCloseMenu(action: () => void) {
    action();
    handleMenuOpenChange(false);
  }

  useShortcutScope(
    [
      { combo: { key: "t" }, handler: () => setDateSubOpen(true) },
      { combo: { key: "y" }, handler: () => setPrioritySubOpen(true) },
      { combo: menuShortcuts.mover, handler: () => runAndCloseMenu(() => setMoveDialogOpen(true)) },
      { combo: menuShortcuts.copiarEnlace, handler: () => runAndCloseMenu(copyLink) },
      {
        combo: menuShortcuts.abrirVentana,
        handler: () => runAndCloseMenu(() => window.open(`/tarea/${task.id}`, "_blank")),
      },
      {
        combo: menuShortcuts.eliminar,
        handler: () => runAndCloseMenu(() => deleteTask.mutate({ id: task.id, projectId: task.project_id })),
      },
    ],
    { enabled: menuOpen },
  );

  // Atajos del cursor de lista sobre esta fila (bloques 4 y 5, capacidad
  // `cursor-de-lista`): activos solo mientras esta fila es la señalada, y
  // apagados mientras su propio menú o el detalle de tarea están abiertos
  // (tareas 4.4/4.5) — con cualquiera de los dos abiertos, `Enter` y
  // `Espacio` le pertenecen a ese otro contexto, no a la fila de atrás.
  // `↑`/`↓`/`⇧↑`/`⇧↓`/`Inicio`/`Fin` no van acá: no dependen de esta fila en
  // particular, viven una sola vez por pantalla en `ListCursorProvider`.
  useShortcutScope(
    [
      { combo: { key: "Enter" }, handler: () => open(task.id) },
      { combo: { key: " " }, handler: toggleComplete },
      {
        // D-E/5.1: el mismo `toggle` que ya usa el casillero — nunca un
        // estado de selección propio del teclado. Solo donde el casillero
        // también existiría (`selectableHere`, depth 0 con selección
        // múltiple activa en la pantalla): una subtarea señalada no es
        // seleccionable, igual que hoy no tiene casillero.
        combo: { key: "x" },
        handler: () => {
          if (selectableHere) selection!.toggle(task.id);
        },
      },
      { combo: { key: "." }, handler: () => clickFirstButton(menuTriggerRef.current) },
      { combo: { key: "F10", shift: true }, handler: () => clickFirstButton(menuTriggerRef.current) },
      { combo: { key: "ContextMenu" }, handler: () => clickFirstButton(menuTriggerRef.current) },
    ],
    { enabled: Boolean(cursor) && isCursorRow && !menuOpen && openTaskId == null },
  );

  // Árbol de acciones del menú (D-A): una sola lista para las dos entradas
  // (clic derecho y botón "…"), renderizada más abajo una vez por cada
  // primitiva (`AppContextMenu`/`DropdownMenu*`) — nunca dos listas escritas
  // a mano. El orden agrupa lo que el menú resuelve en el lugar (fecha,
  // prioridad) primero, después alta y reordenamiento (D-D), y termina con
  // duplicar/mover/compartir/eliminar, igual que el menú de siempre.
  const menuEntries: AppContextMenuEntry[] = [
    { label: "Abrir detalle", onSelect: () => open(task.id) },
    {
      type: "submenu",
      label: "Fecha",
      icon: <CalendarDays className="size-3.5" />,
      open: dateSubOpen,
      onOpenChange: setDateSubOpen,
      items: [
        ...quickDateOptions.map((option) => ({
          label: `${option.label} · ${option.dayLabel}`,
          onSelect: () => applyQuickDate(option.date),
          trailing:
            !task.due_at && task.due_date === option.date ? <Check className="ml-auto size-3.5" aria-hidden /> : undefined,
        })),
        { type: "separator" as const },
        ...(hasDate
          ? [{ label: "Quitar fecha", icon: <X className="size-3.5" />, onSelect: clearDate }]
          : []),
        { label: "Más fechas…", icon: <CalendarPlus className="size-3.5" />, onSelect: () => open(task.id, "date") },
      ],
    },
    { label: "Fecha límite", icon: <FlagTriangleRight className="size-3.5" />, onSelect: () => open(task.id, "deadline") },
    {
      type: "submenu",
      label: "Prioridad",
      icon: <Flag className="size-3.5" />,
      open: prioritySubOpen,
      onOpenChange: setPrioritySubOpen,
      items: TASK_PRIORITIES.map((p) => ({
        label: `P${p.value} · ${p.label}`,
        icon: <PriorityDot priority={p.value} />,
        onSelect: () => setPriority(p.value),
        trailing: p.value === task.priority ? <Check className="ml-auto size-3.5" aria-hidden /> : undefined,
      })),
    },
    { label: "Recordatorios", icon: <Bell className="size-3.5" />, onSelect: () => open(task.id, "reminders") },
    { type: "separator" },
    ...(isFlat
      ? []
      : ([
          { label: "Agregar tarea encima", icon: <ArrowUpToLine className="size-3.5" />, onSelect: () => setAddingAbove(true) },
          { label: "Agregar tarea debajo", icon: <ArrowDownToLine className="size-3.5" />, onSelect: () => setAddingBelow(true) },
          { type: "separator" as const },
          { label: "Mover arriba", onSelect: () => moveWithinSiblings("up") },
          { label: "Mover abajo", onSelect: () => moveWithinSiblings("down") },
          { label: "Convertir en subtarea", icon: <IndentIncrease className="size-3.5" />, onSelect: handleIndent },
          { label: "Sacar de ser subtarea", icon: <IndentDecrease className="size-3.5" />, onSelect: handleOutdent },
          {
            label: "Agregar subtarea",
            onSelect: () => {
              setCollapsed(false);
              setAddingFirstSubtask(true);
            },
          },
          { type: "separator" as const },
        ] satisfies AppContextMenuEntry[])),
    { label: "Duplicar", icon: <Copy className="size-3.5" />, onSelect: () => duplicateTask.mutate({ task }) },
    {
      label: "Mover…",
      icon: <FolderInput className="size-3.5" />,
      onSelect: () => setMoveDialogOpen(true),
      trailing: <ShortcutHint combo={menuShortcuts.mover} className="ml-auto" />,
    },
    { type: "separator" },
    {
      label: "Copiar enlace directo",
      icon: <Link2 className="size-3.5" />,
      onSelect: copyLink,
      trailing: <ShortcutHint combo={menuShortcuts.copiarEnlace} className="ml-auto" />,
    },
    {
      label: "Abrir en ventana aparte",
      icon: <ExternalLink className="size-3.5" />,
      onSelect: () => window.open(`/tarea/${task.id}`, "_blank"),
      trailing: <ShortcutHint combo={menuShortcuts.abrirVentana} className="ml-auto" />,
    },
    { type: "separator" },
    {
      label: "Eliminar",
      icon: <Trash2 className="size-3.5" />,
      onSelect: () => deleteTask.mutate({ id: task.id, projectId: task.project_id }),
      destructive: true,
      trailing: <ShortcutHint combo={menuShortcuts.eliminar} className="ml-auto" />,
    },
  ];

  // El clic derecho no se secuestra donde el navegador hace falta (D-E): si
  // el clic fue sobre un enlace, dentro de un campo editable, o sobre texto
  // que la persona ya tenía seleccionado ahí mismo, se corta la propagación
  // para que nunca llegue al `ContextMenuTrigger` que envuelve la fila —
  // el evento sigue de largo sin `preventDefault`, así que el navegador
  // muestra su propio menú. Adjuntado en el contenido de la fila (adentro
  // del trigger), no en el trigger mismo: los manejadores de React se
  // procesan de adentro hacia afuera en la fase de burbuja, así que este
  // corta el paso antes de que el trigger vea el evento.
  function handleRowContextMenu(event: MouseEvent<HTMLDivElement>) {
    // D-B de `seleccion-con-ctrl`: en plataformas donde `Ctrl`/`Cmd`+clic se
    // entrega como `contextmenu` en vez de `click` (ej. macOS con "clic
    // secundario: Control+clic" activado), seleccionar en vez de abrir el
    // menú — los dos gestos caen sobre el mismo elemento y no pueden
    // convivir sin esta rama.
    if ((event.ctrlKey || event.metaKey) && selectableHere) {
      event.preventDefault();
      event.stopPropagation();
      selection!.toggle(task.id);
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("a[href], input, textarea, [contenteditable='true']")) {
      event.stopPropagation();
      return;
    }
    const textSelection = window.getSelection();
    if (
      textSelection &&
      !textSelection.isCollapsed &&
      textSelection.anchorNode &&
      event.currentTarget.contains(textSelection.anchorNode)
    ) {
      event.stopPropagation();
    }
  }

  // `Ctrl`/`Cmd`+clic selecciona la tarea sin abrir el detalle ni el menú de
  // acciones (`seleccion-con-ctrl`, bloque 1): capturado en la fase de
  // "capture", antes de que el clic llegue a cualquier control interno de la
  // fila (título, casillero de completar, botón "…"), así que ninguno de
  // esos ejecuta su propia acción cuando el modificador está apretado.
  function handleRowClickCapture(event: MouseEvent<HTMLDivElement>) {
    // Cursor de lista (D-A, requirement "El cursor no aparece solo... o al
    // hacer clic en una fila"): en fase de captura, así se dispara sin
    // importar qué control interno haya parado la propagación (ej. el
    // casillero de selección, más abajo).
    cursor?.setCursor(task.id);
    if (!selectableHere || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    event.stopPropagation();
    selection!.toggle(task.id);
  }

  // El detalle abre con doble clic (bloque 6), no con un clic simple: un
  // clic real de mouse llega con `detail >= 1`. Pero un botón activado por
  // teclado (`Enter`/`Espacio` sobre el título enfocado) también dispara
  // `click`, y ese sí llega con `detail === 0` — es la señal para distinguir
  // los dos orígenes sin otro listener. Exigirle un doble `Enter` a quien
  // navega por teclado sería un camino más largo que el que tiene el mouse,
  // así que la activación por teclado abre directo (`.claude/rules/frontend.md`:
  // todo control interactivo alcanzable por teclado).
  //
  // En teléfono (`isMobile`) no hay doble tap confiable, así que cualquier
  // tap (`detail >= 1`) abre directo también — la fila no tiene selección/
  // edición inline que un tap simple pudiera pisar, a diferencia de escritorio.
  function handleTitleClick(event: MouseEvent<HTMLButtonElement>) {
    if (isMobile || event.detail === 0) open(task.id);
  }

  const rowContent = (
    <div
      style={{ paddingLeft: depth * 24 }}
      // `select-text`: el `ContextMenuTrigger` que envuelve esto (D-E) trae
      // `select-none` de fábrica (`components/ui/context-menu.tsx`, pensado
      // para el editor de descripción, su único consumidor hasta ahora) —
      // sin este contrapeso, el título de la fila dejaría de ser
      // seleccionable con el mouse, y el escenario "clic derecho sobre
      // texto seleccionado" de `handleRowContextMenu` no tendría cómo
      // darse nunca.
      className={cn(
        "flex gap-1.5 rounded-md px-1 py-1.5 hover:bg-surface select-text",
        // Con segundo nivel (fecha/etiquetas, o el proyecto bajado en
        // teléfono), los controles de la izquierda se alinean con la
        // primera línea (`items-start`) en vez de con el bloque entero de
        // dos líneas. Sin segundo nivel — el caso más común en la Bandeja —
        // sigue siendo `items-center`, igual que hoy: nada cambia ahí.
        hasSecondLevel ? "items-start" : "items-center",
        // El tablero nunca tiene chevron de subtareas (ver más abajo) ni la
        // sangría de la lista en niveles, así que el espacio a la izquierda
        // del círculo de completar puede ser más ajustado (reporte del
        // dueño, captura): un gap más chico entre casillero de selección,
        // manija de arrastre y círculo, sin dejar de reservarles su lugar
        // — la reserva es lo que evita que aparezcan empujando el título al
        // pasar el cursor.
        variant === "board" && "gap-1",
        // Cursor de lista y selección múltiple (bloque 6, capacidad
        // `cursor-de-lista`, requirement "El cursor se distingue de la
        // selección múltiple"): la selección es un fondo (mismo lenguaje
        // que el casillero relleno, D-B), el cursor es un anillo (mismo
        // `ring` que ya usa el foco estándar de la app, pero fijo en vez de
        // `focus-visible` — la fila ya tiene el foco real, D-A). Los dos
        // se combinan sin ambigüedad porque son canales visuales distintos
        // (relleno vs. contorno): una fila señalada y seleccionada muestra
        // los dos a la vez.
        selectableHere && selection!.isSelected(task.id) && "bg-primary/10 hover:bg-primary/15",
        isCursorRow && "ring-2 ring-inset ring-primary/50",
      )}
      onContextMenu={handleRowContextMenu}
      onClickCapture={handleRowClickCapture}
    >
      {selectionOrderIds && depth === 0 && (
        <SelectionCheckbox taskId={task.id} taskTitle={task.title} orderedIds={selectionOrderIds} />
      )}

      {dragHandleVisible && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          // Roving tabindex (D-A, requirement "Tab entra y sale de la lista
          // de una"): con el cursor cableado, la fila entera es el único
          // tab-stop — sus controles internos siguen siendo clickeables,
          // pero `Tab` ya no se detiene en cada uno. Reordenar por teclado
          // sigue disponible vía el menú ("Mover arriba"/"Mover abajo"),
          // nunca solo por arrastre (`.claude/rules/frontend.md`).
          tabIndex={cursor ? -1 : undefined}
          aria-label={`Reordenar ${task.title}`}
          className={cn(
            "flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-text-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}

      {/* El tablero nunca expande subtareas (`isFlat` arriba fuerza
          `children = []`), así que este control nunca dibuja el chevron acá
          — no tiene sentido reservarle un espacio que jamás se usa (a
          diferencia de la lista y de `variant="flat"`, donde el espacio
          sigue reservado para mantener la fila alineada). */}
      {variant === "board" ? null : hasChildren ? (
        <>
          <button
            type="button"
            tabIndex={cursor ? -1 : undefined}
            aria-label={
              collapsed
                ? `Mostrar ${children.length} subtareas de ${task.title}, ${completedChildrenCount} completadas`
                : `Ocultar ${children.length} subtareas de ${task.title}, ${completedChildrenCount} completadas`
            }
            onClick={() => setCollapsed(!collapsed)}
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", !collapsed && "rotate-90")} />
          </button>
          <span aria-hidden className="shrink-0 text-xs text-text-secondary">
            {completedChildrenCount}/{children.length}
          </span>
        </>
      ) : (
        <span aria-hidden className="size-5 shrink-0" />
      )}

      <button
        type="button"
        role="checkbox"
        tabIndex={cursor ? -1 : undefined}
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

      {/* `opacity-70` (reporte del dueño: "los bordes siguen del mismo color... eso también debería apagarse"):
          mismo tratamiento que ya usa el chip de etiqueta completada (`LabelChipView`, más arriba) — el punto de
          prioridad es un token de color pleno junto a un título ya gris, no hay a dónde bajarlo salvo por opacidad. */}
      {task.priority !== DEFAULT_TASK_PRIORITY && (
        <PriorityDot priority={task.priority} className={isCompleted ? "opacity-70" : undefined} />
      )}

      {/* Fila en niveles (`fila-de-tarea-en-niveles`, D-A): nivel uno (título
          + proyecto/sección anclados a la derecha) y, solo si hay algo que
          mostrar, el nivel dos (fecha y etiquetas) debajo. Sin nivel dos, la
          fila queda en una sola línea, igual que antes de esta capacidad —
          es la Bandeja el caso que lo prueba (casi ninguna tarea ahí tiene
          fecha o etiquetas). El proyecto/sección va como hermano del botón
          del título, nunca adentro (D-C): adentro cambiaría el nombre
          accesible de la tarea ("Pagar el alquiler" pasaría a "Pagar el
          alquiler Trabajo") y rompería las pruebas que buscan tareas por su
          nombre. El botón sigue siendo `flex-1` sin tope propio — el tope
          real es el de su `<span>` interno (`max-w-lg`, sin tocar, ver
          docs/design-system.md §5.1) — así que anclar el chip a la derecha
          no requiere tocar ese tope ni el de la columna. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            tabIndex={cursor ? -1 : undefined}
            onClick={handleTitleClick}
            onDoubleClick={() => open(task.id)}
            onKeyDown={isFlat ? undefined : handleTitleKeyDown}
            className={cn(
              "min-w-0 flex-1 overflow-hidden rounded px-0.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isCompleted && "text-text-completed",
            )}
          >
            {/* Dos líneas en el tablero (D-D, tarea 4.1): en una columna de
                288px al título le quedaban unos 125px reales (~16
                caracteres) con `truncate`. La lista sigue truncando a una
                línea, sin cambios. */}
            <span
              className={cn(
                "block min-w-0 max-w-lg",
                variant === "board" ? "line-clamp-2" : "truncate",
                isCompleted && "line-through",
              )}
            >
              {task.title}
            </span>
          </button>

          {projectInFirstLevel && (
            <span
              className={cn("shrink-0 truncate text-xs text-text-secondary", isCompleted && "text-text-completed")}
              title={projectMetaLabel!}
            >
              {projectMetaLabel}
            </span>
          )}
        </div>

        {hasSecondLevel && (
          <div className="flex flex-wrap items-center gap-1.5 px-0.5">
            {due && (
              <span className={cn("shrink-0 text-xs text-text-secondary", isCompleted && "text-text-completed")}>{due}</span>
            )}

            {visibleLabels.map((label) => (
              <LabelChipView key={label.id} label={label} completed={isCompleted} />
            ))}

            {projectInSecondLevel && (
              <span
                className={cn("ml-auto shrink-0 truncate text-xs text-text-secondary", isCompleted && "text-text-completed")}
                title={projectMetaLabel!}
              >
                {projectMetaLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* `contents`: no agrega caja propia al flex de la fila (D-A) — solo
          existe para que "." (bloque 4.5) pueda clickear el botón "…" vía
          `clickFirstButton`, mismo patrón que ya usan los selectores del
          detalle de tarea (`lib/shortcuts/dom.ts`). */}
      <div ref={menuTriggerRef} className="contents">
        <DropdownMenu onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                tabIndex={cursor ? -1 : undefined}
                aria-label={`Más acciones para ${task.title}`}
                className={cn(
                  "order-last shrink-0",
                  isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100",
                )}
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          {/* `min-w-72` (bloque 2): el ancho por defecto del menú sigue al botón "…" que lo dispara (`w-(--anchor-width)` en `ui/dropdown-menu.tsx`), angosto de sobra para que un indicador de atajo de tres teclas (`Ctrl` `⇧` `N`) entre en la misma línea que "Abrir en ventana aparte" sin que `overflow-x-hidden` lo recorte. */}
          <DropdownMenuContent align="end" className="min-w-72">
            {renderDropdownEntries(menuEntries)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  function handleRowFocus() {
    // D-A: "el cursor es foco real" — cualquier control interno que reciba
    // foco (clic con mouse en el casillero, el botón "…", etc., ya que
    // `focus` delega vía `focusin` y burbujea hasta acá) hace de esta fila
    // la señalada, no solo el foco de la fila misma. `Tab` llegando acá
    // (sin nada señalado todavía, ver `isTabStop`) queda resuelto igual,
    // sin caso especial.
    cursor?.setCursor(task.id);
  }

  return (
    <li
      ref={(node) => {
        setNodeRef(node);
        liRef.current = node;
        // La copia del `DragOverlay` (D-D) comparte el `task.id` de la fila
        // real: si también se registrara, pisaría el nodo real en el mapa
        // de foco de `ListCursorProvider` mientras dura el arrastre.
        if (!dragOverlay) cursor?.registerRow(task.id, node);
      }}
      style={style}
      // `inert` (D-D): la copia del `DragOverlay` no debe ser alcanzable ni
      // por mouse ni por teclado — sin esto, el botón "…" y el casillero de
      // completar quedarían duplicados y tabulables mientras se arrastra.
      inert={dragOverlay}
      role={cursor ? "option" : undefined}
      aria-selected={cursor ? (selectableHere ? selection!.isSelected(task.id) : false) : undefined}
      // Roving tabindex (D-A): la fila señalada es el único tab-stop de la
      // lista; sin cursor todavía (D-G), la primera fila igual lo es, para
      // que `Tab` pueda entrar a la lista (`isTabStop`, más que `isCursor`).
      tabIndex={cursor ? (cursor.isTabStop(task.id) ? 0 : -1) : undefined}
      onFocus={cursor ? handleRowFocus : undefined}
      className={cn(
        "group",
        isDragging && "opacity-50",
        variant === "board" && "rounded-md bg-background",
        dragOverlay && "w-72 shadow-lg",
        cursor && "outline-none",
      )}
    >
      {!isFlat && addingAbove && (
        <div style={{ paddingLeft: depth * 24 }} className="py-0.5">
          <TaskQuickAddRow
            projectId={task.project_id}
            sectionId={task.section_id}
            parentId={task.parent_id}
            position={positionBeforeOriginal(allTasks, task)}
            autoOpen
          />
        </div>
      )}

      {/* Clic derecho abre el mismo menú que el botón "…" (D-A): segundo
          consumidor de `AppContextMenu`, ya usado por el editor de
          descripción. `onOpenChange` comparte el mismo `menuOpen` que el
          botón — solo uno de los dos está abierto a la vez, así que no
          compiten por los atajos de teclado del menú. */}
      <AppContextMenu items={menuEntries} onOpenChange={handleMenuOpenChange} trigger={rowContent} />

      {!isFlat && addingBelow && (
        <div style={{ paddingLeft: depth * 24 }} className="py-0.5">
          <TaskQuickAddRow
            projectId={task.project_id}
            sectionId={task.section_id}
            parentId={task.parent_id}
            position={positionAfterOriginal(allTasks, task)}
            autoOpen
          />
        </div>
      )}

      {!isFlat && hasChildren && !collapsed && (
        <TaskList
          projectId={task.project_id}
          sectionId={null}
          parentId={task.id}
          initialTasks={allTasks}
          depth={depth + 1}
          collapsedTaskIds={collapsedTaskIds}
          onSetCollapsed={onSetCollapsed}
        />
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
