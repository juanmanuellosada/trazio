import { CalendarDays, CheckCircle2, Inbox, Repeat, Search, Sun } from "lucide-react";
import { NavLink } from "./nav-link";
import { SidebarAddTask } from "./sidebar-add-task";
import { SidebarAddEvent } from "./sidebar-add-event";
import { AccountMenu } from "./account-menu";
import { FavoritesSection, ProjectsSection } from "./project-tree";
import { LabelsCollapsibleList, FiltersCollapsibleList } from "./label-filter-lists";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SidebarProject } from "@/lib/projects/get-sidebar-projects";
import type { ProjectRow } from "@/lib/projects/use-projects";

export type { SidebarProject };

export type SidebarContentProps = {
  collapsed?: boolean;
  fullName: string | null;
  email: string | null;
  todayCount: number;
  projects: SidebarProject[];
  initialProjects: ProjectRow[];
};

function getInitials(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Contenido del panel lateral (bloque 5.3, ampliado en el bloque 8 de fase
 * 2), compartido por la versión de escritorio (`app-sidebar.tsx`, colapsable)
 * y la hoja de teléfono (`mobile-nav.tsx`, siempre expandida). De arriba a
 * abajo, el orden de "Panel lateral (escritorio)" en `docs/product-spec.md`:
 * cuenta, accesos rápidos (agregar tarea, agregar evento —bloque 7.6— y
 * buscar), accesos principales (Bandeja, Hoy, Próximos, Hábitos, Completado
 * — ese orden lo fija `docs/product-spec.md`), Favoritos
 * (proyectos, etiquetas y filtros marcados como tales), árbol de proyectos,
 * listas colapsables de etiquetas y filtros, y pie.
 */
export function SidebarContent({
  collapsed = false,
  fullName,
  email,
  todayCount,
  projects,
  initialProjects,
}: SidebarContentProps) {
  const initials = getInitials(fullName ?? email ?? "?");
  // El conteo de tareas por proyecto todavía sale de la proyección liviana
  // del Server Component (`getSidebarProjects`): el bloque 6 no toca
  // `tasks`, así que ese número se actualiza recién con el bloque 7.
  const taskCounts = new Map(projects.map((p) => [p.id, p.taskCount]));
  // Destino del acceso rápido de alta del bloque 10.2: la Bandeja de
  // entrada ya viene en `initialProjects` (D27, siempre existe una por
  // usuario), así que no hace falta un fetch aparte para resolverla.
  const inboxProjectId = initialProjects.find((p) => p.is_inbox)?.id ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2.5 p-3", collapsed && "justify-center px-0")}>
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          {initials}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{fullName ?? "Tu cuenta"}</p>
            {email && <p className="truncate text-xs text-text-secondary">{email}</p>}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-0.5 p-2">
        <SidebarAddTask collapsed={collapsed} inboxProjectId={inboxProjectId} />
        <SidebarAddEvent collapsed={collapsed} />
        <NavLink href="/buscar" label="Buscar" icon={Search} collapsed={collapsed} />
        {/* `contents`: agrupa solo los links bajo el landmark de navegación, sin duplicar el `gap`/`padding` que ya pone el contenedor de arriba. */}
        <nav className="contents" aria-label="Navegación principal">
          <NavLink href="/bandeja" label="Bandeja de entrada" icon={Inbox} collapsed={collapsed} />
          <NavLink href="/hoy" label="Hoy" icon={Sun} collapsed={collapsed} count={todayCount} />
          <NavLink href="/proximos" label="Próximos" icon={CalendarDays} collapsed={collapsed} />
          <NavLink href="/habitos" label="Hábitos" icon={Repeat} collapsed={collapsed} />
          <NavLink href="/completado" label="Completado" icon={CheckCircle2} collapsed={collapsed} />
        </nav>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <FavoritesSection initialProjects={initialProjects} taskCounts={taskCounts} />
          <Separator />
          <ProjectsSection initialProjects={initialProjects} taskCounts={taskCounts} />
          <Separator />
          <div className="flex flex-col gap-0.5 p-2">
            <LabelsCollapsibleList />
            <FiltersCollapsibleList />
          </div>
        </div>
      )}
      {collapsed && <div className="flex-1" />}

      <Separator />
      <div className="p-2">
        <AccountMenu collapsed={collapsed} />
      </div>
    </div>
  );
}
