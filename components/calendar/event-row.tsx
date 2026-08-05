"use client";

import type { MouseEvent, ReactNode } from "react";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { useTheme } from "next-themes";
import { ExternalLink, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppContextMenu, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import { Button } from "@/components/ui/button";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMounted } from "@/hooks/use-mounted";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import { EVENT_FALLBACK_COLOR, eventColorForTheme } from "@/lib/calendar/screen-blocks";
import { todayInTimeZone } from "@/lib/dates/today";
import { cn } from "@/lib/utils";

/**
 * Segundo armado de las mismas `menuEntries` (misma técnica que
 * `components/tasks/task-row.tsx`, `menu-contextual-de-tarea` D-A): la
 * primitiva `AppContextMenu` ya sabe recorrerlas para el clic derecho; el
 * botón "…" usa `DropdownMenu*` en su lugar, así que esta función espeja
 * `renderEntries` de `components/primitives/context-menu.tsx` en vez de
 * escribir el árbol de ítems una segunda vez a mano.
 */
function renderDropdownEntries(items: AppContextMenuEntry[]): ReactNode[] {
  return items.map((item, index) => {
    if (item.type === "separator") return <DropdownMenuSeparator key={index} />;
    if (item.type === "submenu") return null; // el menú de evento no tiene submenús.
    return (
      <DropdownMenuItem key={index} variant={item.destructive ? "destructive" : "default"} onClick={item.onSelect}>
        {item.icon}
        {item.label}
      </DropdownMenuItem>
    );
  });
}

/**
 * Un evento arrastrado de ayer mostraba su hora de inicio cruda ("20:00 –
 * 02:00"), leída como si durara seis horas al revés en vez de haber
 * empezado el día anterior (bug reportado en tarea 6.6 de
 * `hoy-con-eventos-y-formatos`). La corrección compara el día calendario
 * (en `timezone`) del inicio y del fin contra el de hoy: si alguno de los
 * dos no es hoy, se lo nombra ("ayer"/"mañana") en vez de mostrar su hora,
 * misma lógica para el caso simétrico (empieza hoy, sigue mañana).
 */
function formatEventTimeLabel(event: CalendarEventInstance, timezone: string, timeFormat: 12 | 24, now: Date): string {
  if (event.allDay) return "Todo el día";
  const pattern = timeFormat === 24 ? "HH:mm" : "h:mm aaaa";
  const start = formatInTimeZone(parseISO(event.start), timezone, pattern, { locale: es });
  const end = formatInTimeZone(parseISO(event.end), timezone, pattern, { locale: es });

  const today = todayInTimeZone(now, timezone);
  const startsToday = formatInTimeZone(parseISO(event.start), timezone, "yyyy-MM-dd") === today;
  const endsToday = formatInTimeZone(parseISO(event.end), timezone, "yyyy-MM-dd") === today;

  if (!startsToday && !endsToday) return "Desde ayer · sigue mañana";
  if (!startsToday) return `Desde ayer · hasta las ${end}`;
  if (!endsToday) return `${start} · hasta mañana`;
  return `${start} – ${end}`;
}

/**
 * Fila de evento (`hoy-con-eventos`, D-C de `design.md`): hermana de
 * `TaskRow`, no una variante polimórfica de ella — `TaskRow` tiene cuatro
 * mutaciones de tarea adentro, lee campos de tarea sin abstracción y arma
 * veintisiete ítems de menú, así que volverla genérica costaría mucho más
 * que esta fila propia. Reusa de `TaskRow` las clases del contenedor y la
 * estructura en dos niveles (`fila-de-tarea-en-niveles`, D41), y la forma de
 * armar el menú con `AppContextMenu`/`DropdownMenu*` a partir de una sola
 * lista de `menuEntries` (D-A de `menu-contextual-de-tarea`).
 *
 * Vive en `components/calendar/` (no en `components/tasks/`, donde nació):
 * `event.title`/`calendarColor`/`location`/`allDay`/`start`/`end` son
 * `CalendarEventInstance` real (`lib/calendar/events.ts`), sin un tipo
 * reducido propio que lo duplique. `components/tasks/` sí tiene prohibido
 * importar de `lib/calendar/` —`tasks-and-habits-never-publish-to-google.test.ts`
 * lo verifica escaneando esa carpeta—, así que quien monta esta fila desde
 * Hoy (`hoy-view.tsx`) lo hace a través de un componente puente de
 * `components/calendar/` (`use-hoy-events.ts`/`hoy-event-row.tsx`), nunca
 * importando `lib/calendar/` directo.
 *
 * Sin casillero de completar, punto de prioridad, chevron, manija de
 * arrastre ni casillero de selección (D-C): esa ausencia es la señal de que
 * no es una tarea. Por eso tampoco se llama a `useSortable` acá — a
 * diferencia de `TaskRow`, que sí lo hace incondicionalmente porque en Hoy
 * nunca hay contenedor de arrastre alrededor de una fila de evento.
 *
 * La marca de color del calendario es una barra, no un punto: un punto
 * `rounded-full` oculto a lectores (`aria-hidden`) es exactamente la forma
 * en la que una prueba ya existente (`task-list.test.tsx`) detecta el punto
 * de prioridad con un selector de CSS crudo — compartir esas dos
 * características la haría caer en el mismo selector.
 *
 * Editar (D-D): doble clic abre el diálogo que ya existe en
 * `components/calendar/`, vía `onEdit`. Por D24 el mismo camino está también
 * en el menú contextual y en el botón de acciones. En teléfono no hay doble
 * tap confiable, así que un toque simple abre directo — mismo criterio que
 * `handleTitleClick` de `TaskRow`, copiado acá.
 *
 * Las tres acciones son callbacks sin argumentos (`onEdit`,
 * `onOpenInGoogleCalendar`, `onDelete`): quien monta la lista ya tiene el
 * evento completo a mano (viene de iterar el resultado de Google) y arma el
 * cierre por fila (`onEdit={() => abrirEdicion(event)}`), así que esta fila
 * no necesita devolverlo.
 *
 * Solo lectura: `canEdit` llega resuelto por props — cruzar el calendario
 * del evento contra la lista de calendarios es trabajo de quien monta la
 * lista, no de esta fila. Cuando `canEdit` es `false`, se saca "Eliminar"
 * del menú: esa acción fallaría contra Google y prometería algo que no
 * puede cumplir. "Editar" se deja igual (abre el mismo diálogo, que ya
 * degrada a solo lectura) y "Abrir en Google Calendar" siempre funciona,
 * sea cual sea el permiso.
 */
export function EventRow({
  event,
  calendarName,
  canEdit,
  now,
  onEdit,
  onOpenInGoogleCalendar,
  onDelete,
}: {
  event: CalendarEventInstance;
  calendarName: string;
  /** Resuelto afuera (permiso del calendario, no del evento): esta fila no cruza contra la lista de calendarios. */
  canEdit: boolean;
  /** Para saber si el inicio o el fin del evento caen fuera del día de hoy (ver `formatEventTimeLabel`). */
  now: Date;
  onEdit: () => void;
  onOpenInGoogleCalendar: () => void;
  onDelete: () => void;
}) {
  const preferences = useUserPreferences();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const timeLabel = formatEventTimeLabel(event, preferences.timezone, preferences.timeFormat, now);

  // Mismo color y mismo ajuste por tema que la grilla (tarea 3.2/3.3, D-B,
  // `calendar-block-chip.tsx`): un solo fallback (`EVENT_FALLBACK_COLOR`, ya
  // no `var(--text-secondary)` aparte) y el mismo ajuste de contraste del
  // color crudo de Google, que antes solo tenía la grilla.
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const barColor = eventColorForTheme(event.calendarColor ?? EVENT_FALLBACK_COLOR, theme);

  // Mismo problema de ancho que el proyecto anclado de `TaskRow` (D-F de
  // `fila-de-tarea-en-niveles`): en 390px el nombre del calendario a la
  // derecha del título le come el espacio que menos sobra, así que baja al
  // segundo nivel, junto al horario y la ubicación.
  const calendarNameInFirstLevel = !isMobile;
  const calendarNameInSecondLevel = isMobile;

  // Mismo criterio que `handleTitleClick` de `TaskRow`: un clic real de
  // mouse llega con `detail >= 1` y solo abre con el segundo (doble clic);
  // una activación por teclado (Enter/Espacio) llega con `detail === 0` y
  // abre directo, para no exigirle un doble Enter a quien navega sin mouse.
  // En teléfono no hay doble tap confiable, así que cualquier toque abre.
  function handleTitleClick(mouseEvent: MouseEvent<HTMLButtonElement>) {
    if (isMobile || mouseEvent.detail === 0) onEdit();
  }

  const menuEntries: AppContextMenuEntry[] = [
    { label: "Editar", icon: <Pencil className="size-3.5" />, onSelect: onEdit },
    {
      label: "Abrir en Google Calendar",
      icon: <ExternalLink className="size-3.5" />,
      onSelect: onOpenInGoogleCalendar,
    },
    ...(canEdit
      ? ([
          { type: "separator" as const },
          {
            label: "Eliminar",
            icon: <Trash2 className="size-3.5" />,
            onSelect: onDelete,
            destructive: true,
          },
        ] satisfies AppContextMenuEntry[])
      : []),
  ];

  const rowContent = (
    <div className="flex items-start gap-1.5 rounded-md px-1 py-1.5 hover:bg-surface">
      <span aria-hidden className="w-1 shrink-0 self-stretch rounded-sm" style={{ backgroundColor: barColor }} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleTitleClick}
            onDoubleClick={onEdit}
            className="min-w-0 flex-1 overflow-hidden rounded px-0.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="block min-w-0 max-w-lg truncate">{event.title}</span>
          </button>

          {calendarNameInFirstLevel && (
            <span className="shrink-0 truncate text-xs text-text-secondary" title={calendarName}>
              {calendarName}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="shrink-0 text-xs text-text-secondary">{timeLabel}</span>

          {event.location && (
            <span className="flex min-w-0 items-center gap-1 text-xs text-text-secondary">
              <MapPin aria-hidden className="size-3 shrink-0" />
              <span className="min-w-0 truncate">{event.location}</span>
            </span>
          )}

          {calendarNameInSecondLevel && (
            <span className="ml-auto shrink-0 truncate text-xs text-text-secondary" title={calendarName}>
              {calendarName}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Más acciones para ${event.title}`}
              className={cn(
                "order-last shrink-0",
                isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100",
              )}
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {renderDropdownEntries(menuEntries)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <li className="group">
      <AppContextMenu items={menuEntries} trigger={rowContent} />
    </li>
  );
}
