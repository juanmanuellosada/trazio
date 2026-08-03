"use client";

import { useId, useState, type ReactNode } from "react";
import { CalendarClock, Eye, EyeOff, Repeat, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { useLabels } from "@/lib/labels/use-labels";
import { TASK_PRIORITIES, priorityLabel } from "@/lib/validation/tasks";
import { PriorityDot } from "@/components/selectors/priority-select";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import {
  DEADLINE_FILTER_OPTIONS,
  GROUP_BY_OPTIONS,
  ORDER_OPTIONS,
  VIEW_SHAPE_OPTIONS,
  defaultOptionsForViewKey,
  effectivePanelGroupBy,
  type DeadlineFilterOption,
  type GroupByOption,
  type OrderOption,
  type QuickFilters,
  type ViewOptions,
  type ViewShape,
} from "@/lib/view-options/schema";
import { CALENDAR_FORMATS, CALENDAR_FORMAT_LABELS, type CalendarFormat } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";

const ORDER_LABELS: Record<OrderOption, string> = {
  manual: "Manual",
  nombre: "Nombre",
  fecha: "Fecha",
  prioridad: "Prioridad",
};

const GROUP_BY_LABELS: Record<GroupByOption, string> = {
  nada: "Nada",
  seccion: "Sección",
  fecha: "Fecha",
  prioridad: "Prioridad",
  etiqueta: "Etiqueta",
};

/** El panel no ofrece agrupar por etiqueta (D-B, capacidad `modo-panel`): ver `effectivePanelGroupBy` en `lib/view-options/schema.ts`. */
const PANEL_GROUP_BY_OPTIONS = GROUP_BY_OPTIONS.filter((groupBy) => groupBy !== "etiqueta");

const DEADLINE_FILTER_LABELS: Record<DeadlineFilterOption, string> = {
  cualquiera: "Cualquiera",
  con: "Con fecha límite",
  sin: "Sin fecha límite",
};

const VIEW_SHAPE_LABELS: Record<ViewShape, string> = {
  lista: "Lista",
  panel: "Panel",
  calendario: "Calendario",
};

/** Presets del control "días adelante" (bloque 6.3, solo en Próximos): entre una semana y tres meses (D-J), sin exigir un número libre en la barra. */
const DAYS_AHEAD_PRESETS = [7, 14, 30, 60, 90] as const;

const DAYS_AHEAD_ITEMS: Record<string, string> = Object.fromEntries(
  DAYS_AHEAD_PRESETS.map((days) => [String(days), `${days} días`]),
);

const PRIORITY_FILTER_ITEMS: Record<string, string> = {
  todas: "Todas",
  ...Object.fromEntries(TASK_PRIORITIES.map((priority) => [String(priority.value), priorityLabel(priority.value)])),
};

/**
 * Fila "etiqueta a la izquierda, desplegable a la derecha" (mismo criterio en
 * las secciones Vista, Orden y Filtro): un único desplegable resume las
 * opciones en vez de listarlas todas abiertas, lo que angosta y acorta el
 * panel (pedido del dueño en la cuarta ronda de refinamiento visual). Mismo
 * alto y ritmo que `SwitchRow`, para que interruptores y desplegables
 * convivan sin dos lenguajes visuales distintos.
 */
function FieldRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 px-2">
      <Label htmlFor={htmlFor} className="text-sm font-normal text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Fila de interruptor (completadas, hábitos, repeticiones futuras): un booleano no se pone en un desplegable, pero comparte alto y ritmo con `FieldRow`. */
function SwitchRow({ label, checked, onClick, icon }: { label: string; checked: boolean; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <span
        aria-hidden
        className={cn(
          "flex h-4 w-7 shrink-0 items-center rounded-full border border-input px-0.5 transition-colors",
          checked ? "justify-end bg-primary/15" : "justify-start",
        )}
      >
        <span className={cn("size-3 rounded-full bg-text-secondary transition-colors", checked && "bg-primary")} />
      </span>
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="px-2 text-sm font-semibold text-foreground">{children}</h3>;
}

function countActiveQuickFilters(quickFilters: QuickFilters): number {
  let count = 0;
  if (quickFilters.deadline !== "cualquiera") count += 1;
  if (quickFilters.priority != null) count += 1;
  if (quickFilters.labelId != null) count += 1;
  return count;
}

/**
 * Disparador y panel de opciones de vista (capacidad `opciones-de-vista`,
 * decisión **D-A** de `openspec/changes/interfaz-descubrible/design.md`).
 *
 * Panel (`Popover`, anclado al botón) con tres secciones — **Vista** (forma
 * de ver, formato de calendario solo en calendario, completadas, hábitos),
 * **Orden** (agrupar por, ordenar por) y **Filtro** (fecha límite,
 * prioridad, etiqueta) — y restablecer al pie.
 *
 * Cuarta ronda de refinamiento visual: cada opción de un solo valor es una
 * fila de "etiqueta a la izquierda, desplegable a la derecha" (`FieldRow` +
 * `Select`), el mismo criterio que ya usaban agrupar por/ordenar
 * por/fecha límite/prioridad/etiqueta. Antes, Vista era la única sección con
 * un lenguaje distinto — tres fichas grandes con ícono para la forma de ver
 * y listas abiertas para formato de calendario y días adelante — que además
 * era lo que más estiraba el panel. Unificar hacia el desplegable angosta y
 * acorta el panel sin sacar ni una opción. Los interruptores (completadas,
 * hábitos, repeticiones futuras) siguen siendo interruptores — un booleano
 * no se pone en un desplegable — pero comparten alto y ritmo con las filas
 * de desplegable (`SwitchRow`/`FieldRow`, mismo `min-h-10`).
 * Nada cambia en qué hacen las opciones ni en cómo se persisten:
 * `useViewOptions`/`view_preferences` siguen iguales.
 *
 * El disparador tiene que indicar cuándo hay opciones activas distintas de
 * las por defecto de la pantalla (spec `opciones-de-vista`, "El disparador
 * indica cuándo hay opciones activas..."): sin eso, agrupar los controles en
 * un panel esconde estado y la lista se ve distinta sin explicación visible.
 * `hasActiveOptions` compara contra `defaultOptionsForViewKey(viewKey)` en
 * orden, agrupación, filtros rápidos, completadas y hábitos — exactamente
 * las opciones que la spec fija, ni la forma de ver ni el formato de
 * calendario ni días adelante, que no cuentan para esta indicación.
 *
 * `showViewShape` y `showDaysAhead` acotan qué controles aparecen según la
 * pantalla (`specs/opciones-de-vista`: forma de ver solo donde existe modo
 * panel — Bandeja, Proyecto, Próximos y Hoy —, días adelante solo en
 * Próximos).
 *
 * `showCalendarFormat` (`hoy-con-eventos`, D-F): Hoy es la única pantalla
 * con forma de ver que fuerza el calendario a modo día y no lo persiste —
 * ofrecer el control ahí invitaría a cambiar un valor que la pantalla
 * ignora. Por default `true`: las demás pantallas (Bandeja, Proyecto,
 * Próximos) no necesitan pasarlo.
 */
export function ViewOptionsBar({
  viewKey,
  initialOptions,
  showViewShape,
  showDaysAhead,
  showCalendarFormat = true,
}: {
  viewKey: string;
  initialOptions: ViewOptions;
  showViewShape: boolean;
  showDaysAhead: boolean;
  showCalendarFormat?: boolean;
}) {
  const { options, setOption, setQuickFilters, reset } = useViewOptions(viewKey, initialOptions);
  const { data: labels } = useLabels();
  const [open, setOpen] = useState(false);

  const viewShapeId = useId();
  const calendarFormatId = useId();
  const daysAheadId = useId();
  const groupById = useId();
  const orderId = useId();
  const deadlineId = useId();
  const priorityId = useId();
  const labelFilterId = useId();

  // Panel no ofrece etiqueta (D-B): la lista sigue viendo las cinco opciones.
  // El valor mostrado usa `effectivePanelGroupBy` para que, si la preferencia
  // guardada es "etiqueta" (traída de la lista), el desplegable del panel
  // muestre "Nada" sin escribir nada — `setOption` solo se llama cuando la
  // persona elige algo.
  const groupByOptions = options.viewShape === "panel" ? PANEL_GROUP_BY_OPTIONS : GROUP_BY_OPTIONS;
  const groupByDisplayValue = options.viewShape === "panel" ? effectivePanelGroupBy(options.groupBy) : options.groupBy;

  const defaults = defaultOptionsForViewKey(viewKey);
  const hasActiveOptions =
    options.order !== defaults.order ||
    options.groupBy !== defaults.groupBy ||
    options.showCompleted !== defaults.showCompleted ||
    options.showHabits !== defaults.showHabits ||
    countActiveQuickFilters(options.quickFilters) > 0;

  const labelFilterItems: Record<string, string> = {
    todas: "Todas",
    ...Object.fromEntries((labels ?? []).map((label) => [label.id, label.name])),
  };

  return (
    <div role="group" aria-label="Opciones de vista">
      <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
        <PopoverTrigger render={<Button type="button" variant="ghost" size="sm" />}>
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Formato
          {hasActiveOptions && (
            <>
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              <span className="sr-only">, con opciones activas</span>
            </>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 max-w-[calc(100vw-2rem)] max-h-(--available-height) gap-0 overflow-y-auto p-0"
        >
          <div className="space-y-3 px-2 py-3">
            <div className="space-y-1">
              <SectionTitle>Vista</SectionTitle>

              {showViewShape && (
                <FieldRow label="Forma de ver" htmlFor={viewShapeId}>
                  <Select
                    items={VIEW_SHAPE_LABELS}
                    value={options.viewShape}
                    onValueChange={(value) => setOption("viewShape", value as ViewShape)}
                  >
                    <SelectTrigger id={viewShapeId} className="max-w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_SHAPE_OPTIONS.map((shape) => (
                        <SelectItem key={shape} value={shape}>
                          {VIEW_SHAPE_LABELS[shape]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              )}

              {showViewShape && showCalendarFormat && options.viewShape === "calendario" && (
                <FieldRow label="Formato de calendario" htmlFor={calendarFormatId}>
                  <Select
                    items={CALENDAR_FORMAT_LABELS}
                    value={options.formato_calendario}
                    onValueChange={(value) => setOption("formato_calendario", value as CalendarFormat)}
                  >
                    <SelectTrigger id={calendarFormatId} className="max-w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALENDAR_FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>
                          {CALENDAR_FORMAT_LABELS[format]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              )}

              {showViewShape && options.viewShape === "calendario" && (
                <SwitchRow
                  label="Repeticiones futuras"
                  checked={options.showFutureRecurrences}
                  onClick={() => setOption("showFutureRecurrences", !options.showFutureRecurrences)}
                  icon={<CalendarClock className="size-4 text-text-secondary" aria-hidden />}
                />
              )}

              {showDaysAhead && (
                <FieldRow label="Días adelante" htmlFor={daysAheadId}>
                  <Select
                    items={DAYS_AHEAD_ITEMS}
                    value={String(options.daysAhead)}
                    onValueChange={(value) => setOption("daysAhead", Number(value))}
                  >
                    <SelectTrigger id={daysAheadId} className="max-w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_AHEAD_PRESETS.map((days) => (
                        <SelectItem key={days} value={String(days)}>
                          {days} días
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              )}

              <SwitchRow
                label="Completadas"
                checked={options.showCompleted}
                onClick={() => setOption("showCompleted", !options.showCompleted)}
                icon={
                  options.showCompleted ? (
                    <Eye className="size-4 text-text-secondary" aria-hidden />
                  ) : (
                    <EyeOff className="size-4 text-text-secondary" aria-hidden />
                  )
                }
              />
              <SwitchRow
                label="Hábitos"
                checked={options.showHabits}
                onClick={() => setOption("showHabits", !options.showHabits)}
                icon={<Repeat className="size-4 text-text-secondary" aria-hidden />}
              />
            </div>

            <Separator />

            <div className="space-y-1">
              <SectionTitle>Orden</SectionTitle>

              <FieldRow label="Agrupar por" htmlFor={groupById}>
                <Select
                  items={GROUP_BY_LABELS}
                  value={groupByDisplayValue}
                  onValueChange={(value) => setOption("groupBy", value as GroupByOption)}
                >
                  <SelectTrigger id={groupById} className="max-w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupByOptions.map((groupBy) => (
                      <SelectItem key={groupBy} value={groupBy}>
                        {GROUP_BY_LABELS[groupBy]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label="Ordenar por" htmlFor={orderId}>
                <Select
                  items={ORDER_LABELS}
                  value={options.order}
                  onValueChange={(value) => setOption("order", value as OrderOption)}
                >
                  <SelectTrigger id={orderId} className="max-w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_OPTIONS.map((order) => (
                      <SelectItem key={order} value={order}>
                        {ORDER_LABELS[order]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            <Separator />

            <div className="space-y-1">
              <SectionTitle>Filtro</SectionTitle>

              <FieldRow label="Fecha límite" htmlFor={deadlineId}>
                <Select
                  items={DEADLINE_FILTER_LABELS}
                  value={options.quickFilters.deadline}
                  onValueChange={(value) => setQuickFilters({ deadline: value as DeadlineFilterOption })}
                >
                  <SelectTrigger id={deadlineId} className="max-w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEADLINE_FILTER_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {DEADLINE_FILTER_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label="Prioridad" htmlFor={priorityId}>
                <Select
                  items={PRIORITY_FILTER_ITEMS}
                  value={options.quickFilters.priority == null ? "todas" : String(options.quickFilters.priority)}
                  onValueChange={(value) => setQuickFilters({ priority: value === "todas" ? null : Number(value) })}
                >
                  <SelectTrigger id={priorityId} className="max-w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {TASK_PRIORITIES.map((priority) => (
                      <SelectItem key={priority.value} value={String(priority.value)}>
                        <PriorityDot priority={priority.value} />
                        {priorityLabel(priority.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              {labels && labels.length > 0 && (
                <FieldRow label="Etiqueta" htmlFor={labelFilterId}>
                  <Select
                    items={labelFilterItems}
                    value={options.quickFilters.labelId ?? "todas"}
                    onValueChange={(value) => setQuickFilters({ labelId: value === "todas" ? null : value })}
                  >
                    <SelectTrigger id={labelFilterId} className="max-w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {labels.map((label) => (
                        <SelectItem key={label.id} value={label.id}>
                          {label.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              )}
            </div>
          </div>

          <div className="border-t border-border p-2">
            <Button type="button" variant="ghost" onClick={reset} className="w-full justify-start text-text-secondary">
              <RotateCcw className="size-3.5" aria-hidden />
              Restablecer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
