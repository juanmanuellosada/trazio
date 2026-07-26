"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PROJECT_COLORS, type ProjectColor } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";

export type SidebarProject = {
  id: string;
  name: string;
  color: ProjectColor;
  icon: string | null;
  parentId: string | null;
  isFavorite: boolean;
  taskCount: number;
};

function ProjectMark({ project }: { project: SidebarProject }) {
  const { resolvedTheme } = useTheme();

  if (project.icon) {
    return (
      <span aria-hidden className="shrink-0 text-sm leading-none">
        {project.icon}
      </span>
    );
  }

  const hex =
    resolvedTheme === "dark" ? PROJECT_COLORS[project.color].dark : PROJECT_COLORS[project.color].light;

  return <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />;
}

function ProjectLink({ project }: { project: SidebarProject }) {
  const pathname = usePathname();
  const active = pathname === `/proyecto/${project.id}`;

  return (
    <Link
      href={`/proyecto/${project.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md pr-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface font-medium text-primary"
          : "text-text-secondary hover:bg-surface hover:text-foreground",
      )}
    >
      <ProjectMark project={project} />
      <span className="flex-1 truncate">{project.name}</span>
      {project.taskCount > 0 && (
        <span className="text-xs tabular-nums text-text-secondary">{project.taskCount}</span>
      )}
    </Link>
  );
}

/** Nodo recursivo del árbol: hasta 3 niveles, según el límite ya impuesto por la base. */
function ProjectTreeItem({
  project,
  all,
  depth,
}: {
  project: SidebarProject;
  all: SidebarProject[];
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const children = all.filter((p) => p.parentId === project.id);

  if (children.length === 0) {
    return (
      <li style={{ paddingLeft: `${depth * 16}px` }} className="flex items-center">
        <span aria-hidden className="size-7 shrink-0" />
        <ProjectLink project={project} />
      </li>
    );
  }

  return (
    <li style={{ paddingLeft: `${depth * 16}px` }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center">
          <CollapsibleTrigger
            aria-label={open ? `Contraer ${project.name}` : `Expandir ${project.name}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          </CollapsibleTrigger>
          <ProjectLink project={project} />
        </div>
        <CollapsibleContent>
          <ul>
            {children.map((child) => (
              <ProjectTreeItem key={child.id} project={child} all={all} depth={depth + 1} />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/**
 * Árbol de proyectos del panel lateral (bloque 5.3). Si el usuario no
 * tiene más que la Bandeja (que no viaja acá, ver `get-sidebar-projects.ts`),
 * `projects` llega vacío y esto renderiza una lista vacía sin romper nada.
 */
export function ProjectTree({ projects }: { projects: SidebarProject[] }) {
  const roots = projects.filter((p) => p.parentId === null);

  return (
    <ul className="flex flex-col gap-0.5">
      {roots.map((project) => (
        <ProjectTreeItem key={project.id} project={project} all={projects} depth={0} />
      ))}
    </ul>
  );
}

/** Lista plana de favoritos (sección aparte, sin jerarquía ni chevrons). */
export function FavoriteList({ projects }: { projects: SidebarProject[] }) {
  const favorites = projects.filter((p) => p.isFavorite);

  if (favorites.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {favorites.map((project) => (
        <li key={project.id}>
          <ProjectLink project={project} />
        </li>
      ))}
    </ul>
  );
}
