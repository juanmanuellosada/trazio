"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronRight, Filter as FilterIcon, Tag } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMounted } from "@/hooks/use-mounted";
import { useLabels, type Label } from "@/lib/labels/use-labels";
import { useFilters, type FilterRow } from "@/lib/filters/use-filters";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { ProjectMark } from "./project-tree";
import { cn } from "@/lib/utils";

/** Fila de un ítem dentro de una lista colapsable del panel lateral (bloque 8.3/8.4). */
function ListItemLink({ href, mark, name }: { href: string; mark: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-0 items-center gap-2 rounded-md px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface font-medium text-primary"
          : "text-text-secondary hover:bg-surface hover:text-foreground",
      )}
    >
      {mark}
      <span className="flex-1 truncate">{name}</span>
    </Link>
  );
}

/** Encabezado clickeable de una lista colapsable, con su chevron. */
function ListTrigger({ icon: Icon, label, open }: { icon: typeof Tag; label: string; open: boolean }) {
  return (
    <CollapsibleTrigger className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-medium text-text-secondary outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
      <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </CollapsibleTrigger>
  );
}

/**
 * Lista colapsable de etiquetas (bloque 8.3, capacidad
 * `navegacion-por-etiqueta`, requirement "Acceso 'Etiquetas' en el panel
 * lateral"): solo las que no están marcadas como favoritas, esas ya se
 * muestran en la sección Favoritos. Colapsada por defecto para que el panel
 * no se alargue de entrada; sin `initialData` porque el layout del servidor
 * no siembra etiquetas (mismo motivo que en `FavoritesSection`).
 */
export function LabelsCollapsibleList() {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const { data } = useLabels();
  const labels = ((data ?? []) as Label[]).filter((l) => !l.is_favorite);

  if (labels.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <ListTrigger icon={Tag} label="Etiquetas" open={open} />
      <CollapsibleContent>
        <ul className="flex flex-col gap-0.5 py-0.5 pl-5">
          {labels.map((label) => (
            <li key={label.id}>
              <ListItemLink
                href={`/etiquetas/${label.id}`}
                name={label.name}
                mark={
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: resolveProjectColorHex(label.color, theme) }}
                  />
                }
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Lista colapsable de filtros (bloque 8.4, capacidad `filtros-guardados`,
 * requirement "Ubicación de los filtros en el panel lateral"): solo los no
 * favoritos. Mismo patrón que `LabelsCollapsibleList`.
 */
export function FiltersCollapsibleList() {
  const [open, setOpen] = useState(false);
  const { data } = useFilters();
  const filters = ((data ?? []) as FilterRow[]).filter((f) => !f.is_favorite);

  if (filters.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <ListTrigger icon={FilterIcon} label="Filtros" open={open} />
      <CollapsibleContent>
        <ul className="flex flex-col gap-0.5 py-0.5 pl-5">
          {filters.map((filter) => (
            <li key={filter.id}>
              <ListItemLink
                href={`/filtros/${filter.id}`}
                name={filter.name}
                mark={<ProjectMark project={filter} />}
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
