"use client";

import { useState } from "react";
import {
  ArrowDownUp,
  Check,
  Columns3,
  Eye,
  EyeOff,
  Filter,
  LayoutGrid,
  List,
  Layers,
  Repeat,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLabels } from "@/lib/labels/use-labels";
import { TASK_PRIORITIES, priorityLabel } from "@/lib/validation/tasks";
import { PriorityDot } from "@/components/selectors/priority-select";
import { useViewOptions } from "@/lib/view-options/use-view-options";
import {
  DEADLINE_FILTER_OPTIONS,
  GROUP_BY_OPTIONS,
  ORDER_OPTIONS,
  type DeadlineFilterOption,
  type GroupByOption,
  type OrderOption,
  type ViewOptions,
} from "@/lib/view-options/schema";
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

/** Presets del control "días adelante" (bloque 6.3, solo en Próximos): entre una semana y tres meses (D-J), sin exigir un número libre en la barra. */
const DAYS_AHEAD_PRESETS = [7, 14, 30, 60, 90] as const;

function triggerClassName(active: boolean) {
  return cn(
    "flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    active && "border-primary/40 bg-primary/5 text-primary",
  );
}

function countActiveQuickFilters(quickFilters: ViewOptions["quickFilters"]): number {
  let count = 0;
  if (quickFilters.deadline !== "cualquiera") count += 1;
  if (quickFilters.priority != null) count += 1;
  if (quickFilters.labelId != null) count += 1;
  return count;
}

/**
 * Barra de opciones de vista (bloque 6.3/6.5, capacidad
 * `opciones-de-vista`): forma de ver, mostrar completadas, mostrar hábitos
 * (tarea 5.7 de fase 3 — el de repeticiones futuras sigue reservado, sin
 * control propio, es de fase 4), días adelante, orden, agrupar por, filtros
 * rápidos y restablecer. Un único componente
 * para las seis pantallas (`.claude/rules/frontend.md`: consultar
 * `ui-ux-pro-max` antes de crear un componente visual nuevo — acá se
 * decidió por control binario para forma de ver, menús desplegables para
 * orden/agrupar, y un popover de divulgación progresiva para los filtros
 * rápidos, en vez de tres controles sueltos siempre visibles).
 *
 * `showViewShape` y `showDaysAhead` acotan qué controles aparecen según la
 * pantalla (`specs/opciones-de-vista`: forma de ver solo donde existe modo
 * panel — Bandeja, Proyecto y Próximos —, días adelante solo en Próximos).
 * El resto de los controles es igual en las seis pantallas.
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeQuickFilters = countActiveQuickFilters(options.quickFilters);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6" role="toolbar" aria-label="Opciones de vista">
      {showViewShape && (
        <div className="flex items-center rounded-lg border border-input p-0.5" role="radiogroup" aria-label="Forma de ver">
          <button
            type="button"
            role="radio"
            aria-checked={options.viewShape === "lista"}
            aria-label="Ver en lista"
            onClick={() => setOption("viewShape", "lista")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-text-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              options.viewShape === "lista" && "bg-surface text-foreground",
            )}
          >
            <List className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={options.viewShape === "panel"}
            aria-label="Ver en panel"
            onClick={() => setOption("viewShape", "panel")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-text-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              options.viewShape === "panel" && "bg-surface text-foreground",
            )}
          >
            <LayoutGrid className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={options.showCompleted}
        onClick={() => setOption("showCompleted", !options.showCompleted)}
        className={cn(options.showCompleted && "text-foreground")}
      >
        {options.showCompleted ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
        {options.showCompleted ? "Completadas" : "Sin completadas"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={options.showHabits}
        onClick={() => setOption("showHabits", !options.showHabits)}
        className={cn(options.showHabits && "text-foreground")}
      >
        <Repeat className="size-3.5" aria-hidden />
        Hábitos
      </Button>

      {showDaysAhead && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" className={triggerClassName(false)} />}>
            <Columns3 className="size-3.5 text-text-secondary" aria-hidden />
            {options.daysAhead} días
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Días adelante</DropdownMenuLabel>
              {DAYS_AHEAD_PRESETS.map((days) => (
                <DropdownMenuItem key={days} onClick={() => setOption("daysAhead", days)}>
                  {days} días
                  {days === options.daysAhead && <Check className="ml-auto size-3.5" aria-hidden />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" className={triggerClassName(options.order !== "manual")} />}>
          <ArrowDownUp className="size-3.5 text-text-secondary" aria-hidden />
          {ORDER_LABELS[options.order]}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Orden</DropdownMenuLabel>
            {ORDER_OPTIONS.map((order) => (
              <DropdownMenuItem key={order} onClick={() => setOption("order", order)}>
                {ORDER_LABELS[order]}
                {order === options.order && <Check className="ml-auto size-3.5" aria-hidden />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" className={triggerClassName(options.groupBy !== "nada")} />}>
          <Layers className="size-3.5 text-text-secondary" aria-hidden />
          Agrupar: {GROUP_BY_LABELS[options.groupBy]}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Agrupar por</DropdownMenuLabel>
            {GROUP_BY_OPTIONS.map((groupBy) => (
              <DropdownMenuItem key={groupBy} onClick={() => setOption("groupBy", groupBy)}>
                {GROUP_BY_LABELS[groupBy]}
                {groupBy === options.groupBy && <Check className="ml-auto size-3.5" aria-hidden />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
        <PopoverTrigger className={triggerClassName(activeQuickFilters > 0)}>
          <Filter className="size-3.5 text-text-secondary" aria-hidden />
          Filtrar
          {activeQuickFilters > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[0.65rem] font-medium text-primary-foreground">
              {activeQuickFilters}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <div className="space-y-1">
            <p className="px-0.5 text-xs font-medium text-text-secondary">Fecha límite</p>
            <div className="flex flex-col gap-0.5">
              {DEADLINE_FILTER_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQuickFilters({ deadline: value })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                    value === options.quickFilters.deadline && "bg-surface font-medium text-foreground",
                  )}
                >
                  {DEADLINE_FILTER_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-0.5 text-xs font-medium text-text-secondary">Prioridad</p>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setQuickFilters({ priority: null })}
                className={cn(
                  "rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                  options.quickFilters.priority == null && "bg-surface font-medium text-foreground",
                )}
              >
                Todas
              </button>
              {TASK_PRIORITIES.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setQuickFilters({ priority: priority.value })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                    priority.value === options.quickFilters.priority && "bg-surface font-medium text-foreground",
                  )}
                >
                  <PriorityDot priority={priority.value} />
                  {priorityLabel(priority.value)}
                </button>
              ))}
            </div>
          </div>

          {labels && labels.length > 0 && (
            <div className="space-y-1">
              <p className="px-0.5 text-xs font-medium text-text-secondary">Etiqueta</p>
              <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setQuickFilters({ labelId: null })}
                  className={cn(
                    "rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                    options.quickFilters.labelId == null && "bg-surface font-medium text-foreground",
                  )}
                >
                  Todas
                </button>
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => setQuickFilters({ labelId: label.id })}
                    className={cn(
                      "rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                      label.id === options.quickFilters.labelId && "bg-surface font-medium text-foreground",
                    )}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Button type="button" variant="ghost" size="sm" onClick={reset} className="text-text-secondary">
        <RotateCcw className="size-3.5" aria-hidden />
        Restablecer
      </Button>
    </div>
  );
}
