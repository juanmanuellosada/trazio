"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppContextMenu, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/lib/toast";
import { formatTaskDueLabel } from "@/lib/dates/format";
import { useShortcutScope } from "@/lib/shortcuts/context";
import type { ShortcutCombo } from "@/lib/shortcuts/types";
import { ShortcutHint } from "@/components/shortcuts/shortcut-hint";
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

/**
 * Segundo armado de las mismas `menuEntries` (D-A de `menu-contextual-de-tarea`):
 * `AppContextMenu` (clic derecho) ya sabe recorrerlas con las piezas de
 * `ContextMenu*`; el botón "…" usa `DropdownMenu*` en su lugar —misma forma
 * de props en las dos familias—, así que esta función espeja `renderEntries`
 * de `components/primitives/context-menu.tsx` en vez de escribir el árbol de
 * ítems una segunda vez a mano.
 */
function renderDropdownEntries(items: AppContextMenuEntry[]): ReactNode[] {
  return items.map((item, index) => {
    if (item.type === "separator") return <DropdownMenuSeparator key={index} />;
    if (item.type === "submenu") {
      return (
        <DropdownMenuSub key={index} open={item.open} onOpenChange={item.onOpenChange}>
          <DropdownMenuSubTrigger>
            {item.icon}
            {item.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>{renderDropdownEntries(item.items)}</DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }
    return (
      <DropdownMenuItem
        key={index}
        variant={item.destructive ? "destructive" : "default"}
        disabled={item.disabled}
        onClick={item.onSelect}
      >
        {item.icon}
        {item.label}
        {item.trailing}
      </DropdownMenuItem>
    );
  });
}

function LabelChipView({ label }: { label: TaskRowData["labels"][number] }) {
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
}: {
  task: TaskRowData;
  allTasks: TaskRowData[];
  siblings: TaskRowData[];
  depth: number;
  variant?: "list" | "flat";
  /** Por defecto, el mismo criterio de siempre (`variant === "list"`). El modo panel (`components/board/`) lo pasa explícitamente en `true` sobre `variant="flat"`, para arrastrar una tarjeta entre columnas sin heredar indentar/subtareas. */
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
}) {
  const { open } = useTaskDetail();
  const selection = useSelection();
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
  const [collapsed, setCollapsed] = useState(false);
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

  // Al cerrar el menú (por cualquier vía: Escape, clic afuera, elegir un
  // ítem), las filas de fecha/prioridad vuelven a su estado inicial: sin
  // esto, la próxima vez que se abre el menú de esta fila aparecen ya
  // desplegadas por el `T`/`Y` de la vez anterior, en vez de arrancar
  // colapsadas como cualquier submenú.
  function handleMenuOpenChange(open: boolean) {
    setMenuOpen(open);
    if (!open) {
      setDateSubOpen(false);
      setPrioritySubOpen(false);
    }
  }

  const isFlat = variant === "flat";
  const dragHandleVisible = showDragHandle ?? !isFlat;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: sortableData,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const children = isFlat ? [] : allTasks.filter((t) => t.parent_id === task.id);
  const hasChildren = children.length > 0;
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
          aria-label={`Reordenar ${task.title}`}
          className={cn(
            "flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-text-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
          )}
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
            onClick={handleTitleClick}
            onDoubleClick={() => open(task.id)}
            onKeyDown={isFlat ? undefined : handleTitleKeyDown}
            className={cn(
              "min-w-0 flex-1 overflow-hidden rounded px-0.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isCompleted && "text-text-secondary",
            )}
          >
            <span className={cn("block min-w-0 max-w-lg truncate", isCompleted && "line-through")}>{task.title}</span>
          </button>

          {projectInFirstLevel && (
            <span className="shrink-0 truncate text-xs text-text-secondary" title={projectMetaLabel!}>
              {projectMetaLabel}
            </span>
          )}
        </div>

        {hasSecondLevel && (
          <div className="flex flex-wrap items-center gap-1.5 px-0.5">
            {due && <span className="shrink-0 text-xs text-text-secondary">{due}</span>}

            {visibleLabels.map((label) => (
              <LabelChipView key={label.id} label={label} />
            ))}

            {projectInSecondLevel && (
              <span className="ml-auto shrink-0 truncate text-xs text-text-secondary" title={projectMetaLabel!}>
                {projectMetaLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <DropdownMenu onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
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
  );

  return (
    <li ref={setNodeRef} style={style} className={cn("group", isDragging && "opacity-50")}>
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
