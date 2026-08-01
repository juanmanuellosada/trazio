"use client";

import { useState, type ReactNode } from "react";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Repeat,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  type DeadlineFilterOption,
  type GroupByOption,
  type OrderOption,
  type QuickFilters,
  type ViewOptions,
  type ViewShape,
} from "@/lib/view-options/schema";
import { CALENDAR_FORMATS, CALENDAR_FORMAT_LABELS } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";

const ORDER_LABELS: Record<OrderOption, string> = {
  manual: "Manual",
  nombre: "Nombre",
  fecha: "Fecha",
  prioridad: "Prioridad",
};

const GROUP_BY_LABELS: Record<GroupByOption, string> = {
  nada: "Nada",
  prioridad: "Prioridad",
  etiqueta: "Etiqueta",
};

const DEADLINE_FILTER_LABELS: Record<DeadlineFilterOption, string> = {
  cualquiera: "Cualquiera",
  con: "Con fecha límite",
  sin: "Sin fecha límite",
};

const VIEW_SHAPE_ICONS: Record<ViewShape, typeof List> = {
  lista: List,
  panel: LayoutGrid,
  calendario: CalendarDays,
};

const VIEW_SHAPE_LABELS: Record<ViewShape, string> = {
  lista: "Lista",
  panel: "Panel",
  calendario: "Calendario",
};

/** Presets del control "días adelante" (bloque 6.3, solo en Próximos): entre una semana y tres meses (D-J), sin exigir un número libre en la barra. */
const DAYS_AHEAD_PRESETS = [7, 14, 30, 60, 90] as const;

/** Fila de una sola opción (radio): usada para orden, agrupar, filtros rápidos, formato de calendario y días adelante. */
function OptionRow({ label, selected, onClick, icon }: { label: string; selected: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "bg-surface font-medium text-foreground",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {selected && <Check className="size-3.5 shrink-0 text-primary" aria-hidden />}
    </button>
  );
}

/** Fila de interruptor (completadas, hábitos, repeticiones futuras): mismo lenguaje visual que `OptionRow`, con una marca a la derecha en vez del check de selección única. */
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

/** Sub-encabezado de un grupo de opciones dentro de una sección (p. ej. "Ordenar por" dentro de Orden). Mismo estilo que ya usaba el popover de filtros de la barra plana. */
function OptionGroupLabel({ children }: { children: ReactNode }) {
  return <p className="px-2 pt-1 pb-1 text-xs font-medium text-text-secondary">{children}</p>;
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
 * Antes era una tira plana de siete controles sueltos que en 390px ya se
 * envolvía. Pasa a ser un único disparador que abre un panel (`Sheet`) con
 * tres secciones — **Vista** (forma de ver, formato de calendario solo en
 * calendario, completadas, hábitos), **Orden** (agrupar por, ordenar por) y
 * **Filtro** (fecha límite, prioridad, etiqueta) — y restablecer al pie.
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
 * panel — Bandeja, Proyecto y Próximos —, días adelante solo en Próximos).
 */
export function ViewOptionsBar({
  viewKey,
  initialOptions,
  showViewShape,
  showDaysAhead,
}: {
  viewKey: string;
  initialOptions: ViewOptions;
  showViewShape: boolean;
  showDaysAhead: boolean;
}) {
  const { options, setOption, setQuickFilters, reset } = useViewOptions(viewKey, initialOptions);
  const { data: labels } = useLabels();
  const [open, setOpen] = useState(false);

  const defaults = defaultOptionsForViewKey(viewKey);
  const hasActiveOptions =
    options.order !== defaults.order ||
    options.groupBy !== defaults.groupBy ||
    options.showCompleted !== defaults.showCompleted ||
    options.showHabits !== defaults.showHabits ||
    countActiveQuickFilters(options.quickFilters) > 0;

  return (
    <div className="flex items-center border-b border-border px-4 py-2 sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button type="button" variant="ghost" size="sm" />}>
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Formato
          {hasActiveOptions && (
            <>
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              <span className="sr-only">, con opciones activas</span>
            </>
          )}
        </SheetTrigger>
        <SheetContent className="w-full gap-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Formato</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
            <div className="space-y-1">
              <SectionTitle>Vista</SectionTitle>

              {showViewShape && (
                <div className="px-2 pt-1">
                  <div className="flex items-center gap-1 rounded-lg border border-input p-1" role="radiogroup" aria-label="Forma de ver">
                    {VIEW_SHAPE_OPTIONS.map((shape) => {
                      const Icon = VIEW_SHAPE_ICONS[shape];
                      return (
                        <button
                          key={shape}
                          type="button"
                          role="radio"
                          aria-checked={options.viewShape === shape}
                          onClick={() => setOption("viewShape", shape)}
                          className={cn(
                            "flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-xs text-text-secondary outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                            options.viewShape === shape && "bg-surface font-medium text-foreground",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                          {VIEW_SHAPE_LABELS[shape]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showViewShape && options.viewShape === "calendario" && (
                <div>
                  <OptionGroupLabel>Formato de calendario</OptionGroupLabel>
                  <div role="radiogroup" aria-label="Formato de calendario">
                    {CALENDAR_FORMATS.map((format) => (
                      <OptionRow
                        key={format}
                        label={CALENDAR_FORMAT_LABELS[format]}
                        selected={format === options.formato_calendario}
                        onClick={() => setOption("formato_calendario", format)}
                      />
                    ))}
                  </div>
                </div>
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
                <div>
                  <OptionGroupLabel>Días adelante</OptionGroupLabel>
                  <div role="radiogroup" aria-label="Días adelante">
                    {DAYS_AHEAD_PRESETS.map((days) => (
                      <OptionRow
                        key={days}
                        label={`${days} días`}
                        selected={days === options.daysAhead}
                        onClick={() => setOption("daysAhead", days)}
                      />
                    ))}
                  </div>
                </div>
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

              <div>
                <OptionGroupLabel>Agrupar por</OptionGroupLabel>
                <div role="radiogroup" aria-label="Agrupar por">
                  {GROUP_BY_OPTIONS.map((groupBy) => (
                    <OptionRow
                      key={groupBy}
                      label={GROUP_BY_LABELS[groupBy]}
                      selected={groupBy === options.groupBy}
                      onClick={() => setOption("groupBy", groupBy)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <OptionGroupLabel>Ordenar por</OptionGroupLabel>
                <div role="radiogroup" aria-label="Ordenar por">
                  {ORDER_OPTIONS.map((order) => (
                    <OptionRow
                      key={order}
                      label={ORDER_LABELS[order]}
                      selected={order === options.order}
                      onClick={() => setOption("order", order)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <SectionTitle>Filtro</SectionTitle>

              <div>
                <OptionGroupLabel>Fecha límite</OptionGroupLabel>
                <div role="radiogroup" aria-label="Fecha límite">
                  {DEADLINE_FILTER_OPTIONS.map((value) => (
                    <OptionRow
                      key={value}
                      label={DEADLINE_FILTER_LABELS[value]}
                      selected={value === options.quickFilters.deadline}
                      onClick={() => setQuickFilters({ deadline: value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <OptionGroupLabel>Prioridad</OptionGroupLabel>
                <div role="radiogroup" aria-label="Prioridad">
                  <OptionRow label="Todas" selected={options.quickFilters.priority == null} onClick={() => setQuickFilters({ priority: null })} />
                  {TASK_PRIORITIES.map((priority) => (
                    <OptionRow
                      key={priority.value}
                      label={priorityLabel(priority.value)}
                      selected={priority.value === options.quickFilters.priority}
                      onClick={() => setQuickFilters({ priority: priority.value })}
                      icon={<PriorityDot priority={priority.value} />}
                    />
                  ))}
                </div>
              </div>

              {labels && labels.length > 0 && (
                <div>
                  <OptionGroupLabel>Etiqueta</OptionGroupLabel>
                  <div role="radiogroup" aria-label="Etiqueta" className="max-h-40 overflow-y-auto">
                    <OptionRow label="Todas" selected={options.quickFilters.labelId == null} onClick={() => setQuickFilters({ labelId: null })} />
                    {labels.map((label) => (
                      <OptionRow
                        key={label.id}
                        label={label.name}
                        selected={label.id === options.quickFilters.labelId}
                        onClick={() => setQuickFilters({ labelId: label.id })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="border-t border-border">
            <Button type="button" variant="ghost" onClick={reset} className="w-full justify-start text-text-secondary">
              <RotateCcw className="size-3.5" aria-hidden />
              Restablecer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
