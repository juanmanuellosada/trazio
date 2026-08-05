"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { differenceInMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { useTheme } from "next-themes";
import { CalendarDays, Repeat, SquareCheck } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import type { CalendarBlock, CalendarBlockType } from "@/lib/calendar/block";
import { eventColorForTheme } from "@/lib/calendar/screen-blocks";
import { HOUR_ROW_HEIGHT_PX } from "./grid-metrics";

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

type CalendarBlockChipVariant = "timed" | "bar" | "compact";

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
 * `LINE_HEIGHT_PX` más cada uno. Solo la variante `timed` crece: `bar` y
 * `compact` miden siempre lo mismo, así que se quedan en el peldaño mínimo
 * (`compact`, además, está fuera de alcance de esta ronda — ver más abajo).
 */
function ladderSteps(block: CalendarBlock, variant: CalendarBlockChipVariant): number {
  const maxSteps = block.type === "event" ? 3 : 4;
  if (variant !== "timed") return 1;
  const heightPx = timedBlockHeightPx(block);
  let steps = 1;
  while (steps < maxSteps && heightPx >= VERTICAL_PADDING_PX + (steps + 1) * LINE_HEIGHT_PX) steps++;
  return steps;
}

/**
 * Modo apretado (defecto encontrado, no en la lista original de tareas):
 * un bloque de quince minutos mide 12px (`HOUR_ROW_HEIGHT_PX` es 48), y el
 * primer peldaño de la escalera —relleno vertical más una línea de
 * texto— pide `VERTICAL_PADDING_PX + LINE_HEIGHT_PX` = 24px. Por debajo de
 * eso el contenido se recortaba en fragmentos sueltos y el control de
 * completar quedaba invisible. El diseño descartó un alto mínimo (mentiría
 * sobre la duración), así que la salida es **apretar, no agrandar**: sin
 * relleno vertical, tipografía y altura de línea más chicas, una sola
 * línea sin envolver — el mismo recurso que usa Google Calendar. El
 * umbral es exactamente el mismo cálculo que ya usa `ladderSteps` para el
 * primer peldaño, así que con el paso de 15 minutos de la grilla (D-C)
 * solo el bloque de 15 minutos cae en este modo; el de 30 ya entra normal.
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
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme: "light" | "dark" = mounted && resolvedTheme === "dark" ? "dark" : "light";

  // Corrección de exactitud (tarea 3.3, D-B): el color de un evento viene
  // crudo de Google, sin el ajuste por tema que ya tiene el de proyecto o
  // etiqueta. El de tarea/hábito ya llega resuelto por tema desde quien
  // arma el bloque (`resolveProjectColorHex`), así que no se toca de nuevo acá.
  const displayColor = block.type === "event" ? eventColorForTheme(block.color, theme) : block.color;

  const Icon = TYPE_ICON[block.type];

  // Modo apretado (ver el comentario de `TIGHT_HEIGHT_THRESHOLD_PX`): solo
  // aplica a la variante `timed`, la única que crece con el alto real.
  const isTight = variant === "timed" && timedBlockHeightPx(block) < TIGHT_HEIGHT_THRESHOLD_PX;

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
    className,
  );

  const sharedStyle: CSSProperties = {
    borderColor: displayColor,
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
      <button
        type="button"
        onClick={() => onSelect?.(block)}
        className={cn(sharedClassName, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50")}
        style={sharedStyle}
        title={block.title}
      >
        {legacyContent}
      </button>
    );
  }

  const steps = ladderSteps(block, variant);
  const canComplete = !block.isPreview && (block.type === "task" || block.type === "habit");
  const completed = block.completed ?? false;

  function handleTogglePointerDown(event: PointerEvent<HTMLButtonElement>) {
    // Igual técnica que la manija de redimensionar de `draggable-timed-block.tsx`:
    // cortar acá evita que `@dnd-kit` vea este `pointerdown` y arranque un arrastre.
    event.stopPropagation();
  }

  function handleToggleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onToggleComplete?.(block);
  }

  const completeLabel =
    block.type === "habit"
      ? completed
        ? `Desmarcar ${block.title} de hoy`
        : `Marcar ${block.title} como hecho hoy`
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
        // En un bloque de quince minutos (12px de alto total) esto excede
        // la caja del bloque — a propósito: se prefirió desbordar sin
        // dibujar nada ahí antes que sacar el control (el diseño dice que
        // nunca se cae por falta de espacio). El único límite real es que
        // los bloques vecinos son elementos separados y absolutamente
        // posicionados (`draggable-timed-block.tsx`): el desborde hacia
        // arriba gana el clic (por orden de DOM), hacia abajo puede quedar
        // tapado por el bloque siguiente si están pegados sin separación —
        // no se resuelve acá, ver el reporte de la tanda.
        <span className="relative size-3 shrink-0">
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
                "flex size-3 items-center justify-center rounded-full border",
                completed ? "border-primary bg-primary" : "border-input",
              )}
            >
              {completed && <span aria-hidden className="size-1 rounded-full bg-primary-foreground" />}
            </span>
          </button>
        </span>
      )}
      {(block.type === "event" || block.type === "habit") && <Icon aria-hidden className="size-3 shrink-0" style={{ color: displayColor }} />}
      <span className="min-w-0 truncate">{block.title}</span>
    </div>
  );

  const showTime = steps >= 2;
  const showCalendarName = steps >= 3 && block.type === "event" && block.calendarName;
  const showProjectName = steps >= 3 && block.type !== "event" && block.projectName;
  const showLabels = steps >= 4 && block.type !== "event" && block.labels && block.labels.length > 0;

  const ladderContent = (
    <>
      {titleRow}
      {showTime && <span className="min-w-0 truncate text-[0.65rem] text-foreground/80">{formatBlockTimeRange(block, timezone, timeFormat)}</span>}
      {showCalendarName && <span className="min-w-0 truncate text-[0.65rem] text-foreground/80">{block.calendarName}</span>}
      {showProjectName && <span className="min-w-0 truncate text-[0.65rem] text-foreground/80">{block.projectName}</span>}
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
    <div
      role="button"
      tabIndex={0}
      aria-label={block.title}
      onClick={() => onSelect?.(block)}
      onKeyDown={handleKeyDown}
      className={cn(sharedClassName, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50")}
      style={sharedStyle}
      title={block.title}
    >
      {ladderContent}
    </div>
  );
}
