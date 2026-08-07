"use client";

import { useId } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { differenceInMinutes, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { useTheme } from "next-themes";
import { CalendarDays, Check, FlagTriangleRight, Flame, Repeat, SkipForward, SquareCheck, Tag } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { todayInTimeZone } from "@/lib/dates/today";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { priorityLabel } from "@/lib/validation/tasks";
import { describeRecurrenceRule } from "@/lib/recurrence/rule";
import { cn } from "@/lib/utils";
import type { CalendarBlock, CalendarBlockType } from "@/lib/calendar/block";
import { eventColorForTheme } from "@/lib/calendar/screen-blocks";
import { PriorityDot } from "@/components/selectors/priority-select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HOUR_ROW_HEIGHT_PX } from "./grid-metrics";

/**
 * Demora antes de mostrar la ficha de más info (`calendario-mas-info`, "que
 * no salte al pasar por encima de camino a otra cosa"): 400ms — bastante
 * más que el "instantáneo" que se usa en otros lados de la app para no
 * competir con el arrastre (`@dnd-kit` activa recién a los 8px, así que
 * cualquier gesto de arrastrar-y-soltar típico ya se resolvió antes de que
 * este plazo termine), y bastante menos que el segundo largo de un tooltip
 * nativo. Cierre inmediato (`closeDelay: 0`): al sacar el mouse, no tiene
 * sentido demorar el cierre de algo no interactivo.
 */
const INFO_CARD_OPEN_DELAY_MS = 400;

/** Primera línea no vacía de una descripción, recortada (D-copy, "el principio de la descripción"): nunca el texto entero, que es cosa del detalle. */
function descriptionExcerpt(description: string): string | null {
  const firstLine = description.split("\n").find((line) => line.trim().length > 0)?.trim();
  if (!firstLine) return null;
  return firstLine.length > 140 ? `${firstLine.slice(0, 140)}…` : firstLine;
}

/**
 * Contenido de la ficha de más info (`calendario-mas-info`): reemplaza el
 * globo nativo (`title`), que solo mostraba el título — la razón del pedido
 * del dueño. Cada línea solo aparece si el dato existe (D-copy): una tarea
 * sin etiquetas, límite ni descripción da una ficha corta, no una llena de
 * huecos.
 *
 * Fechas de un solo día (`allDay`, `deadline`) se formatean con `format`
 * simple, sin `formatInTimeZone`: son fechas de calendario (`yyyy-MM-dd`),
 * no instantes — pasarlas por una conversión de zona horaria podría
 * correrlas un día si la zona del navegador difiere de `timezone` (mismo
 * cuidado que ya toma `calendarRangeLabel`, `lib/calendar/navigation.ts`).
 * El horario con hora sí es un instante real, así que ahí corresponde
 * `formatInTimeZone` (igual que `formatBlockTimeRange`, más abajo).
 */
function CalendarBlockInfoCard({ block, timezone, timeFormat }: { block: CalendarBlock; timezone: string; timeFormat: 12 | 24 }) {
  const start = parseISO(block.start);
  const end = parseISO(block.end);
  const dateLabel = block.allDay
    ? format(start, "EEE d 'de' MMM", { locale: es })
    : formatInTimeZone(start, timezone, "EEE d 'de' MMM", { locale: es });
  const whenLine = block.allDay
    ? `Todo el día · ${dateLabel}`
    : `${formatBlockTimeRange(block, timezone, timeFormat)} · ${differenceInMinutes(end, start)} min · ${dateLabel}`;

  const whereIcon = block.type === "task" ? block.projectIcon : undefined;
  const whereText =
    block.type === "event"
      ? block.calendarName
      : block.type === "task"
        ? [block.projectName, block.sectionName].filter(Boolean).join(" › ") || undefined
        : undefined;

  const recurrenceText = block.type === "task" && block.recurrenceRule ? describeRecurrenceRule(block.recurrenceRule) : null;
  const deadlineText = block.type === "task" && block.deadline ? `Límite: ${format(parseISO(block.deadline), "d 'de' MMMM", { locale: es })}` : null;
  const description = block.description ? descriptionExcerpt(block.description) : null;

  const statusText =
    block.type === "task" && block.completed
      ? "Completada"
      : block.type === "habit" && block.skipped
        ? "Salteado"
        : block.type === "habit" && block.completed
          ? "Cumplido"
          : null;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <p className="text-sm font-medium">{block.title}</p>
      <div className="flex flex-col gap-1 text-[0.7rem] text-background/80">
        <span>{whenLine}</span>
        {whereText && (
          <span className="flex items-center gap-1.5">
            {whereIcon && <span aria-hidden>{whereIcon}</span>}
            {whereText}
          </span>
        )}
        {block.type === "task" && (
          <span className="flex items-center gap-1.5">
            <PriorityDot priority={block.priority ?? 4} />
            {priorityLabel(block.priority ?? 4)}
          </span>
        )}
        {block.type === "task" && block.labels && block.labels.length > 0 && (
          <span className="flex items-center gap-1.5">
            <Tag aria-hidden className="size-3 shrink-0" />
            {block.labels.map((label) => label.name).join(", ")}
          </span>
        )}
        {block.type === "habit" && block.habitFrequencyText && (
          <span className="flex items-center gap-1.5">
            <Repeat aria-hidden className="size-3 shrink-0" />
            {block.habitFrequencyText}
          </span>
        )}
        {recurrenceText && (
          <span className="flex items-center gap-1.5">
            <Repeat aria-hidden className="size-3 shrink-0" />
            {recurrenceText}
          </span>
        )}
        {deadlineText && (
          <span className="flex items-center gap-1.5">
            <FlagTriangleRight aria-hidden className="size-3 shrink-0" />
            {deadlineText}
          </span>
        )}
        {block.type === "habit" && block.habitStreakText && (
          <span className="flex items-center gap-1.5">
            <Flame aria-hidden className="size-3 shrink-0" />
            Racha: {block.habitStreakText}
          </span>
        )}
        {statusText && (
          <span className="flex items-center gap-1.5">
            {block.type === "habit" && block.skipped ? (
              <SkipForward aria-hidden className="size-3 shrink-0" />
            ) : (
              <Check aria-hidden className="size-3 shrink-0" />
            )}
            {statusText}
          </span>
        )}
        {description && <span>{description}</span>}
      </div>
    </div>
  );
}

const TYPE_ICON: Record<CalendarBlockType, typeof CalendarDays> = {
  task: SquareCheck,
  habit: Repeat,
  event: CalendarDays,
};

/**
 * Forma por tipo (tarea 5.5, requirement "se distinguen por forma, no
 * solo por color"): el color de un bloque ya está tomado por el proyecto,
 * la etiqueta o el calendario de origen, así que la distinción de tipo
 * viene del borde y del ícono, no del color. Tarea: caja con borde
 * completo. Hábito: píldora. Evento: barra lateral gruesa, como en Google
 * Calendar. **No se toca** (tarea 3.4, D-B): hay una prueba que exige que
 * dos bloques del mismo color se sigan distinguiendo por esta forma.
 */
const TYPE_SHAPE_CLASS: Record<CalendarBlockType, string> = {
  task: "rounded-md border-2",
  habit: "rounded-full border",
  event: "rounded-md border-y border-r border-l-4",
};

/**
 * `overlay` (grupo 4, D-C, corregido — reporte "el bloque arrastrado cambia
 * de tamaño"): la copia que se dibuja dentro del `DragOverlay` de
 * `calendar-view.tsx` mientras se arrastra un bloque — un portal fuera de la
 * grilla, sin columna propia. `@dnd-kit` ya envuelve este portal en un
 * contenedor que toma el `width`/`height` del nodo original (el bloque en la
 * grilla), así que el chip no impone su propio tamaño: llena ese contenedor
 * (`h-full w-full`, igual que `timed`) para verse exactamente como el
 * original, con la misma escalera de peldaños.
 */
type CalendarBlockChipVariant = "timed" | "bar" | "compact" | "overlay";

/**
 * Dirección y relleno por variante (tarea 2.6: acá vivía el defecto). Un
 * bloque de la grilla horaria (`timed`) apila su contenido en columna
 * (título, horario, calendario/proyecto, etiquetas); `bar` y `compact` son
 * de una sola línea. Antes, la base compartida imponía `items-center` para
 * las tres variantes y `timed` agregaba `flex-col`: el resultado combinado
 * ponía el ícono **encima** del título en vez de al lado, porque no había
 * ninguna fila propia para ese primer renglón. Ahora la dirección vive acá
 * (por variante) y el primer renglón arma su propia fila (`items-center`)
 * más abajo, sin pisarse.
 */
const VARIANT_CLASS: Record<CalendarBlockChipVariant, string> = {
  timed: "h-full w-full flex-col items-stretch justify-start gap-0.5 px-1.5 py-1 text-left",
  bar: "h-6 w-full flex-row items-center gap-1 px-1.5",
  compact: "h-5 w-full flex-row items-center gap-1 px-1",
  overlay: "h-full w-full flex-col items-stretch justify-start gap-0.5 px-1.5 py-1 text-left shadow-lg",
};

/** `py-1` de la variante `timed`: 4px arriba + 4px abajo. */
const VERTICAL_PADDING_PX = 8;
/** `text-xs` (0.75rem de fuente) trae 1rem de interlineado por defecto. */
const LINE_HEIGHT_PX = 16;

/** Alto real en píxeles de un bloque con horario, según su duración — lo usan tanto `ladderSteps` como el modo apretado de más abajo. */
function timedBlockHeightPx(block: CalendarBlock): number {
  const minutes = differenceInMinutes(parseISO(block.end), parseISO(block.start));
  return (minutes / 60) * HOUR_ROW_HEIGHT_PX;
}

/**
 * Cuántos peldaños de la escalera entran, dado el alto real del bloque
 * (D-A, tarea 2.1): el primero (título, con su control de completar si
 * corresponde) nunca depende de esto — siempre se intenta. Los siguientes
 * peldaños (horario, calendario/proyecto, etiquetas) piden una línea de
 * `LINE_HEIGHT_PX` más cada uno. Solo `timed` y `overlay` crecen: `bar` y
 * `compact` miden siempre lo mismo, así que se quedan en el peldaño mínimo
 * (`compact`, además, está fuera de alcance de esta ronda — ver más abajo).
 *
 * `overlay` (tarea 4.2, D-C, corregido) usa el mismo cálculo que `timed`: el
 * `DragOverlay` ahora llena el contenedor de `@dnd-kit` con el alto real del
 * bloque (ver el comentario de `CalendarBlockChipVariant`), así que un
 * bloque de 15 minutos arrastrado se ve igual de apretado que en la grilla,
 * en vez de forzar siempre dos peldaños.
 */
function ladderSteps(block: CalendarBlock, variant: CalendarBlockChipVariant): number {
  const maxSteps = block.type === "event" ? 3 : 4;
  if (variant !== "timed" && variant !== "overlay") return 1;
  const heightPx = timedBlockHeightPx(block);
  let steps = 1;
  while (steps < maxSteps && heightPx >= VERTICAL_PADDING_PX + (steps + 1) * LINE_HEIGHT_PX) steps++;
  return steps;
}

/**
 * Modo apretado (defecto encontrado, no en la lista original de tareas):
 * el primer peldaño de la escalera —relleno vertical más una línea de
 * texto— pide `VERTICAL_PADDING_PX + LINE_HEIGHT_PX` = 24px. Por debajo de
 * eso el contenido se recortaba en fragmentos sueltos y el control de
 * completar quedaba invisible. El diseño descartó un alto mínimo (mentiría
 * sobre la duración), así que la salida es **apretar, no agrandar**: sin
 * relleno vertical, tipografía y altura de línea más chicas, una sola
 * línea sin envolver — el mismo recurso que usa Google Calendar. El
 * umbral es exactamente el mismo cálculo que ya usa `ladderSteps` para el
 * primer peldaño.
 *
 * Con `HOUR_ROW_HEIGHT_PX` en 96 (pedido del dueño, ver el comentario de
 * `grid-metrics.ts`), un bloque de 15 minutos —el paso mínimo de la
 * grilla— mide 24px: justo el umbral, así que ya **no** cae acá (la
 * comparación es `<`, no `<=`). Este modo queda para duraciones por debajo
 * de los 15 minutos, que la grilla no ofrece por arrastre pero sí pueden
 * llegar por una duración corta puesta a mano o un evento importado de
 * Google.
 */
const TIGHT_HEIGHT_THRESHOLD_PX = VERTICAL_PADDING_PX + LINE_HEIGHT_PX;
/** Fila única, sin relleno vertical: mismo contenido de `titleRow`, sin lugar para más peldaños. */
const TIGHT_TIMED_CLASS = "h-full w-full flex-row items-center gap-1 px-1 py-0";

/**
 * Horario del bloque en la zona y el formato que corresponda (tarea 2.2/2.3).
 * Sin preferencia real todavía: `timezone`/`timeFormat` son opcionales
 * porque nadie en la cadena de la grilla horaria (`time-grid.tsx` →
 * `draggable-timed-block.tsx`, de otra tanda) las pasa hoy — hasta que lo
 * hagan, se muestra en la zona horaria del navegador y en formato 24 horas.
 */
function formatBlockTimeRange(block: CalendarBlock, timezone: string, timeFormat: 12 | 24): string {
  const pattern = timeFormat === 24 ? "HH:mm" : "h:mm aaaa";
  const start = formatInTimeZone(parseISO(block.start), timezone, pattern, { locale: es });
  const end = formatInTimeZone(parseISO(block.end), timezone, pattern, { locale: es });
  return `${start} – ${end}`;
}

const BROWSER_TIMEZONE = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

/**
 * Un bloque dibujado en la grilla (tarea 5.1-5.7): el mismo componente
 * sirve para un bloque con horario, una barra de todo el día y un chip
 * compacto del formato mes — la variante solo cambia tamaño y dirección,
 * nunca la forma por tipo ni el manejo de `isPreview`.
 *
 * Un bloque de vista previa (`isPreview`, tarea 5.7) se dibuja como texto
 * plano sin ningún elemento interactivo: nunca un `button`, nunca
 * `onSelect`, para que ni el clic ni el arrastre del grupo 6 tengan nada
 * de qué agarrarse.
 *
 * **Contenido por alto** (D-A, grupo 2): en la variante `timed`, el
 * contenido crece con el alto real del bloque en vez de ser siempre el
 * mismo. El formato mes (`compact`) queda **fuera de alcance** de esta
 * ronda (`design.md`, Non-Goals: "El formato mes") y sigue mostrando
 * exactamente lo mismo que antes — ícono y título, una sola línea, sin
 * control de completar. El color (D-B, grupo 3) sí se corrige en las tres
 * variantes por igual: es una corrección de exactitud, no de contenido.
 *
 * **Control de completar** (tarea 2.4/7.7): `onToggleComplete` recibe el
 * bloque completo, mismo patrón que `onSelect`. El botón intercepta su
 * propio `pointerdown`/`click` con `stopPropagation` — igual técnica que ya
 * usa la manija de redimensionar de `draggable-timed-block.tsx` — así ni
 * dispara el arrastre (que escucha en el resto del bloque) ni abre el
 * detalle (`onSelect`). El cableado a la mutación real (completar una
 * tarea, marcar/desmarcar un hábito) es de otra tanda: acá solo se deja el
 * gancho funcionando.
 */
export function CalendarBlockChip({
  block,
  variant,
  onSelect,
  onToggleComplete,
  timezone = BROWSER_TIMEZONE,
  timeFormat = 24,
  className,
  style,
  tooltipDisabled = false,
}: {
  block: CalendarBlock;
  variant: CalendarBlockChipVariant;
  onSelect?: (block: CalendarBlock) => void;
  /** Ver el comentario de la función sobre el gancho de completar. */
  onToggleComplete?: (block: CalendarBlock) => void;
  timezone?: string;
  timeFormat?: 12 | 24;
  className?: string;
  style?: CSSProperties;
  /**
   * Apaga la ficha de más info mientras el bloque se está arrastrando o
   * redimensionando (`calendario-mas-info`, "no puede pelearse con lo que ya
   * hace el bloque"): quien envuelve este chip con `@dnd-kit`
   * (`draggable-timed-block.tsx`, `calendar-view.tsx`) es quien sabe si hay
   * un gesto en curso — este componente no tiene ese estado. La demora de
   * apertura (`INFO_CARD_OPEN_DELAY_MS`) ya evita que un arrastre típico la
   * dispare, pero un arrastre lento sí podría; esto es la red de seguridad
   * explícita para ese caso.
   */
  tooltipDisabled?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme: "light" | "dark" = mounted && resolvedTheme === "dark" ? "dark" : "light";
  // Conecta la ficha con el bloque para lectores de pantalla (`aria-describedby`):
  // esta versión de `@base-ui/react` no lo arma sola (probado a mano — el
  // popup no lleva `role` ni el trigger `aria-describedby`), así que se arma
  // acá. El nombre del bloque (`aria-label`) no cambia — la ficha es
  // descripción, no nombre, así que no se duplica en el anuncio inicial.
  const infoCardId = useId();

  // Corrección de exactitud (tarea 3.3, D-B): el color de un evento viene
  // crudo de Google, sin el ajuste por tema que ya tiene el de proyecto o
  // etiqueta. El de tarea/hábito ya llega resuelto por tema desde quien
  // arma el bloque (`resolveProjectColorHex`), así que no se toca de nuevo acá.
  const displayColor = block.type === "event" ? eventColorForTheme(block.color, theme) : block.color;

  const Icon = TYPE_ICON[block.type];

  // Modo apretado (ver el comentario de `TIGHT_HEIGHT_THRESHOLD_PX`): aplica
  // a `timed` y a `overlay`, las únicas dos variantes que crecen con el
  // alto real (`overlay` corregido, ver el comentario de
  // `CalendarBlockChipVariant`).
  const isTight = (variant === "timed" || variant === "overlay") && timedBlockHeightPx(block) < TIGHT_HEIGHT_THRESHOLD_PX;

  // Bloque completado (defecto "un bloque completado no se atenúa ni se
  // tacha"): mismo tratamiento que ya usa el resto de la app para un ítem
  // cumplido — `habit-today-row.tsx`/`task-row.tsx`, `text-text-completed`
  // más `line-through` en el título —, no uno inventado acá. Antes usaba
  // `text-text-secondary` (un escalón menos apagado): con la paleta de
  // proyecto/hábito sin sobriar, el fondo del bloque (`displayColor` al
  // 10%) bajaba de 4.5:1 contra `text-text-completed` en dos de los diez
  // colores. La paleta sobria (`lib/validation/colors.ts`) lo despeja en
  // los diez, así que ya no hace falta el escalón intermedio acá. Se
  // distingue del hábito salteado (`opacity-60`, más abajo) porque no
  // comparten ninguna clase: un bloque puede estar completado o salteado,
  // nunca los dos a la vez (`useMarkHabitDone` borra el salteo del día al
  // completar), pero si algún día coexistieran no se confundirían entre sí.
  const completed = !block.isPreview && (block.completed ?? false);

  const sharedClassName = cn(
    // Sin `overflow-hidden` (defecto de accesibilidad, ver el comentario del
    // casillero de completar en `titleRow`): el área tocable del casillero
    // necesita desbordar por fuera de la caja del bloque en los bloques más
    // chicos, y no hay forma de lograrlo si el contenedor la recorta. No
    // hace falta para el texto: cada línea de la escalera ya trunca con su
    // propio `truncate` (que trae su `overflow-hidden` propio), así que
    // nada se desborda visualmente por sacarlo de acá.
    "flex min-w-0 text-foreground",
    isTight ? "text-[0.625rem] leading-3" : "text-xs",
    TYPE_SHAPE_CLASS[block.type],
    isTight ? TIGHT_TIMED_CLASS : VARIANT_CLASS[variant],
    block.isPreview && "border-dashed opacity-60",
    // Hábito salteado (grupo 7, D-F): "se queda en el calendario, marcado" —
    // atenuado como una vista previa, pero sigue interactivo (el casillero
    // de completar sigue funcionando: saltear es reversible).
    !block.isPreview && block.type === "habit" && block.skipped && "opacity-60",
    completed && "text-text-completed",
    className,
  );

  // Borde apagado en un bloque completado (reporte del dueño: "los bordes
  // siguen del mismo color"): `displayColor` es un hex arbitrario (proyecto,
  // hábito o Google), sin token al que bajar, así que se baja por alfa —
  // mismo mecanismo que ya usa el fondo de esta línea (`1a`, 10%) y el chip
  // suelto de `unscheduled-habits-row.tsx`. `b3` es el sufijo de Tailwind
  // para 70% (mismo alfa aritmético que `opacity-70`, ya el criterio de
  // "apagado" del resto de esta ronda — `PriorityDot`, punto de hábito y la
  // etiqueta completada de `task-row.tsx`), así que el vocabulario de
  // atenuado queda uniforme en vez de inventar un segundo número. El fondo
  // no se toca: ya está al 10%, bajarlo más no se nota y el borde es el
  // elemento que el reporte señala.
  const sharedStyle: CSSProperties = {
    borderColor: completed ? `${displayColor}b3` : displayColor,
    backgroundColor: `${displayColor}1a`,
    ...style,
  };

  // Formato mes: fuera de alcance (ver el comentario de la función). Mismo
  // contenido de siempre, sin escalera ni control de completar.
  if (variant === "compact") {
    const legacyContent = (
      <>
        <Icon aria-hidden className="size-3 shrink-0" style={{ color: displayColor }} />
        <span className="min-w-0 truncate">{block.title}</span>
      </>
    );
    if (block.isPreview) {
      return (
        <div className={cn(sharedClassName, "pointer-events-none")} style={sharedStyle} title={block.title}>
          {legacyContent}
        </div>
      );
    }
    return (
      <TooltipProvider delay={INFO_CARD_OPEN_DELAY_MS} closeDelay={0}>
        <Tooltip disabled={tooltipDisabled}>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => onSelect?.(block)}
                aria-describedby={infoCardId}
                className={cn(sharedClassName, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50")}
                style={sharedStyle}
              />
            }
          >
            {legacyContent}
          </TooltipTrigger>
          <TooltipContent id={infoCardId} className="w-72 max-w-[calc(100vw-2rem)] flex-col items-start gap-0 px-3 py-2.5">
            <CalendarBlockInfoCard block={block} timezone={timezone} timeFormat={timeFormat} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const steps = ladderSteps(block, variant);
  // `overlay` (tarea 4.1/4.2, D-C): la copia del `DragOverlay` es una vista,
  // no una acción — completar desde ahí no tiene sentido (el bloque real
  // sigue en la grilla, invisible mientras dura el gesto).
  const canComplete = !block.isPreview && variant !== "overlay" && (block.type === "task" || block.type === "habit");

  function handleTogglePointerDown(event: PointerEvent<HTMLButtonElement>) {
    // Igual técnica que la manija de redimensionar de `draggable-timed-block.tsx`:
    // cortar acá evita que `@dnd-kit` vea este `pointerdown` y arranque un arrastre.
    event.stopPropagation();
  }

  function handleToggleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onToggleComplete?.(block);
  }

  // El calendario ahora permite marcar hábitos de días pasados (no solo
  // "hoy"): el rótulo tiene que decir la verdad para cualquier día del
  // bloque, no solo el de hoy — si no, un lector de pantalla en un bloque
  // del lunes pasado anuncia "hecho hoy" sobre algo que no lo es. Mismo
  // patrón de nombrar el día que ya usa `calendarRangeLabel`
  // (`lib/calendar/navigation.ts`) para el formato "dia".
  const isBlockToday = todayInTimeZone(parseISO(block.start), timezone) === todayInTimeZone(new Date(), timezone);
  const blockDayName = formatInTimeZone(parseISO(block.start), timezone, "EEEE d 'de' MMMM", { locale: es });

  const completeLabel =
    block.type === "habit"
      ? completed
        ? `Desmarcar ${block.title} ${isBlockToday ? "de hoy" : `del ${blockDayName}`}`
        : `Marcar ${block.title} como hecho ${isBlockToday ? "hoy" : `el ${blockDayName}`}`
      : completed
        ? `Descompletar ${block.title}`
        : `Completar ${block.title}`;

  const titleRow = (
    <div className="flex min-w-0 w-full items-center gap-1">
      {canComplete && (
        // Defecto de accesibilidad medido, no supuesto: el casillero se
        // dibuja en 12×12 (`size-3`), la mitad del mínimo de la norma
        // (24×24, WCAG 2.5.8 — 44/48 son guías de Apple/Google, no la
        // norma). La decisión ya tomada es agrandar el área tocable sin
        // agrandar el punto: el `<button>` real (el que tiene el rol, el
        // estado y los manejadores) mide 24×24 vía `-inset-1.5` sobre un
        // ancla de 12×12 que no participa del layout (está fuera de flujo,
        // así que no empuja ni la fila ni la escalera de abajo); el círculo
        // que se ve sigue siendo el `span` interno de 12×12, sin cambios.
        // En un bloque chico (modo apretado, por debajo de los 15 minutos —
        // ver el comentario de `TIGHT_HEIGHT_THRESHOLD_PX`) esto excede la
        // caja del bloque — a propósito: se prefirió desbordar sin dibujar
        // nada ahí antes que sacar el control (el diseño dice que nunca se
        // cae por falta de espacio). El único límite real es que los
        // bloques vecinos son elementos separados y absolutamente
        // posicionados (`draggable-timed-block.tsx`): el desborde hacia
        // arriba gana el clic (por orden de DOM), hacia abajo puede quedar
        // tapado por el bloque siguiente si están pegados sin separación —
        // no se resuelve acá, ver el reporte de la tanda.
        //
        // `z-10` (grupo 4/5, defecto reportado por otra tanda): en un
        // bloque chico, este desborde se solapa con la manija de
        // redimensionar (`draggable-timed-block.tsx`, zona de toque de
        // 18px creciendo hacia abajo desde el borde inferior). Las dos son
        // absolutas con z-index automático, así que sin esto ganaba la
        // manija por venir después en el árbol — un control que se ve y no
        // responde, peor que uno ausente (D-A: el control de completar
        // nunca se cae). El mismo `z-10` también resuelve el caso de dos
        // bloques chicos pegados: el casillero del bloque de abajo le gana
        // a la manija del bloque de arriba aunque se solapen, sin depender
        // de en qué orden se dibujaron.
        <span className="relative z-10 size-3 shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={completed}
            aria-label={completeLabel}
            onPointerDown={handleTogglePointerDown}
            onClick={handleToggleClick}
            className="absolute -inset-1.5 flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-3 items-center justify-center rounded-full border-2",
                completed && "border-primary bg-primary",
              )}
              // Sin marcar (reporte del dueño: "que resalte un poco más, que
              // tenga el mismo borde que el recuadro"): mismo `displayColor`
              // que ya usa el borde del bloque, a color pleno — nunca el
              // `b3` de un bloque completado (ver el comentario de
              // `sharedStyle` más abajo), porque ese caso nunca se da acá:
              // marcado implica `completed`, que muestra el relleno
              // `border-primary bg-primary` en vez de esto. `border-2` (antes
              // `border`, 1px) es el resaltado: mismo grosor marcado y sin
              // marcar, para que tildar no le cambie el tamaño al círculo.
              // El estado marcado se queda con `--primary` a propósito: es
              // la misma señal de "hecho" que ya usa `task-row.tsx` y
              // `habit-today-row.tsx` en toda la app — cambiarla acá por
              // `displayColor` la volvería inconsistente con el resto sin
              // necesidad, cuando lo pedido era resaltar el sin marcar.
              style={completed ? undefined : { borderColor: displayColor }}
            >
              {completed && <span aria-hidden className="size-1 rounded-full bg-primary-foreground" />}
            </span>
          </button>
        </span>
      )}
      {block.type === "event" && <Icon aria-hidden className="size-3 shrink-0" style={{ color: displayColor }} />}
      {block.type === "habit" && block.icon && (
        // El emoji del hábito reemplaza el ícono de tipo (Repeat, tarea 2.5):
        // la forma de píldora (`TYPE_SHAPE_CLASS`) ya distingue el tipo, así
        // que mostrar los dos era redundante. Sin tamaño de fuente propio:
        // hereda el de `sharedClassName` (`text-xs` o, en modo apretado,
        // `text-[0.625rem]`), igual que el título — así no rompe el modo
        // apretado de un bloque de 15 minutos.
        <span aria-hidden className="shrink-0 leading-none">
          {block.icon}
        </span>
      )}
      <span className={cn("min-w-0 truncate", completed && "line-through")}>{block.title}</span>
    </div>
  );

  const showTime = steps >= 2;
  const showCalendarName = steps >= 3 && block.type === "event" && block.calendarName;
  const showProjectName = steps >= 3 && block.type !== "event" && block.projectName;
  const showLabels = steps >= 4 && block.type !== "event" && block.labels && block.labels.length > 0;

  const ladderContent = (
    <>
      {titleRow}
      {showTime && (
        <span className="min-w-0 truncate text-[0.65rem] text-foreground/80">
          {block.type === "habit" && block.skipped && "Salteado · "}
          {formatBlockTimeRange(block, timezone, timeFormat)}
        </span>
      )}
      {showCalendarName && <span className="min-w-0 truncate text-[0.65rem] text-foreground/80">{block.calendarName}</span>}
      {showProjectName && (
        // Mismo patrón que el peldaño de etiquetas de más abajo (`div` +
        // `span` truncado): sin proyecto con emoji, se ve exactamente igual
        // que antes — el emoji solo aparece si el proyecto tiene uno
        // (`projects.icon` es opcional).
        <div className="flex min-w-0 items-center gap-1">
          {block.projectIcon && (
            <span aria-hidden className="shrink-0 text-[0.65rem] leading-none">
              {block.projectIcon}
            </span>
          )}
          <span className="min-w-0 truncate text-[0.65rem] text-foreground/80">{block.projectName}</span>
        </div>
      )}
      {showLabels && (
        <div className="flex min-w-0 items-center gap-1">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: resolveProjectColorHex(block.labels![0]!.color, theme) }}
          />
          <span className="min-w-0 truncate text-[0.65rem] text-foreground/80">{block.labels!.map((label) => label.name).join(", ")}</span>
        </div>
      )}
    </>
  );

  if (block.isPreview) {
    return (
      <div className={cn(sharedClassName, "pointer-events-none")} style={sharedStyle} title={block.title}>
        {ladderContent}
      </div>
    );
  }

  // `overlay` (tarea 4.1, D-C): copia flotante dentro de `DragOverlay`, no
  // interactiva — igual criterio que `dragOverlay` en `TaskRow`/`board.tsx`.
  if (variant === "overlay") {
    return (
      <div className={cn(sharedClassName, "pointer-events-none")} style={sharedStyle} title={block.title}>
        {ladderContent}
      </div>
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Solo si el foco está en la raíz: un Enter/Espacio con foco en el
    // casillero de completar ya lo maneja el `<button>` nativo, y no debe
    // además abrir el detalle.
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(block);
    }
  }

  return (
    <TooltipProvider delay={INFO_CARD_OPEN_DELAY_MS} closeDelay={0}>
      <Tooltip disabled={tooltipDisabled}>
        <TooltipTrigger
          render={
            <div
              role="button"
              tabIndex={0}
              aria-label={block.title}
              aria-describedby={infoCardId}
              onClick={() => onSelect?.(block)}
              onKeyDown={handleKeyDown}
              className={cn(sharedClassName, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50")}
              style={sharedStyle}
            />
          }
        >
          {ladderContent}
        </TooltipTrigger>
        <TooltipContent id={infoCardId} className="w-72 max-w-[calc(100vw-2rem)] flex-col items-start gap-0 px-3 py-2.5">
          <CalendarBlockInfoCard block={block} timezone={timezone} timeFormat={timeFormat} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
