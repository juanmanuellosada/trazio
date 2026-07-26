import { Inbox, Sun, CheckCircle2, Settings } from "lucide-react";
import { NavLink } from "./nav-link";
import { FavoritesSection, ProjectsSection } from "./project-tree";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
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
 * Contenido del panel lateral (bloque 5.3), compartido por la versión de
 * escritorio (`app-sidebar.tsx`, colapsable) y la hoja de teléfono
 * (`mobile-nav.tsx`, siempre expandida). De arriba a abajo, exactamente lo
 * que pide el requirement "Navegación de escritorio en fase 1": cuenta,
 * accesos principales, favoritos, árbol de proyectos y pie.
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

      <nav className="flex flex-col gap-0.5 p-2" aria-label="Navegación principal">
        <NavLink href="/bandeja" label="Bandeja de entrada" icon={Inbox} collapsed={collapsed} />
        <NavLink href="/hoy" label="Hoy" icon={Sun} collapsed={collapsed} count={todayCount} />
        <NavLink href="/completado" label="Completado" icon={CheckCircle2} collapsed={collapsed} />
      </nav>

      {!collapsed && (
        <>
          <FavoritesSection initialProjects={initialProjects} taskCounts={taskCounts} />
          <Separator />
          <ProjectsSection initialProjects={initialProjects} taskCounts={taskCounts} />
        </>
      )}
      {collapsed && <div className="flex-1" />}

      <Separator />
      <div className="flex flex-col gap-0.5 p-2">
        <ThemeToggle collapsed={collapsed} />
        <NavLink href="/configuracion" label="Configuración" icon={Settings} collapsed={collapsed} />
        <LogoutButton
          variant="ghost"
          collapsed={collapsed}
          className={cn("h-10 w-full justify-start gap-2.5 px-2.5 font-medium")}
        />
      </div>
    </div>
  );
}
