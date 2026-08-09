"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Filter as FilterIcon, Tag } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFilters, type FilterRow } from "@/lib/filters/use-filters";
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
 * Lista colapsable de filtros (bloque 8.4, capacidad `filtros-guardados`,
 * requirement "La lista de filtros no desaparece por estar vacía"): solo
 * los no favoritos. Ya no se devuelve `null` sin filtros —eso es justo lo
 * que `filtros-alcanzables` corrigió (proposal.md): Filtros ahora también
 * tiene su propio acceso principal en `sidebar-content.tsx` y `G F`, pero
 * esta lista se queda igual, con un estado vacío que invita a crear el
 * primero (D-A de `filtros-alcanzables`), en vez de sacarse.
 *
 * No es el mismo tratamiento que recibió Etiquetas: su lista equivalente,
 * `LabelsCollapsibleList`, ya no existe en este archivo — se eliminó por
 * completo (no se ocultó) en `etiquetas-sin-lista-duplicada`, D-A, porque
 * Etiquetas ya tenía acceso principal y una segunda fila para lo mismo
 * sobraba (ese cambio, en su D-C, dejó anotado que a Filtros le tocaba
 * primero el acceso propio y recién después evaluar si la lista sobraba:
 * esta es esa evaluación). La diferencia de trato es a propósito: el árbol
 * de proyectos puede empujar esta lista fuera de la vista en una cuenta con
 * varios proyectos, así que sigue haciendo falta un rastro de "acá hay
 * filtros" cerca de Favoritos y Proyectos — cosa que la lista de etiquetas,
 * más corta y menos usada para saltar directo a un ítem puntual, no
 * necesitaba mantener duplicada.
 */
export function FiltersCollapsibleList() {
  const [open, setOpen] = useState(false);
  const { data } = useFilters();
  const filters = ((data ?? []) as FilterRow[]).filter((f) => !f.is_favorite);

  if (filters.length === 0) {
    return (
      <div className="flex flex-col gap-1 px-2.5 py-1">
        <div className="flex h-9 items-center gap-2 text-sm font-medium text-text-secondary">
          <FilterIcon className="size-4 shrink-0" />
          <span>Filtros</span>
        </div>
        <p className="pl-5 text-sm text-text-secondary">
          Todavía no tenés filtros.{" "}
          <Link href="/filtros" className="font-medium text-primary hover:underline">
            Creá el primero
          </Link>
        </p>
      </div>
    );
  }

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
