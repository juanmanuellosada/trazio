"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarContent } from "./sidebar-content";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SidebarProject } from "@/lib/projects/get-sidebar-projects";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "trazio:sidebar-collapsed";

/**
 * Panel lateral de escritorio (bloque 5.3), oculto en teléfono (la
 * navegación móvil vive en `mobile-nav.tsx`). El estado de colapso se
 * guarda en `localStorage`: es una preferencia de presentación del
 * dispositivo, no de la cuenta, así que no va a `user_preferences`.
 */
export function AppSidebar({
  fullName,
  email,
  avatarUrl,
  todayCount,
  inboxTaskCount,
  projects,
  initialProjects,
}: {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  todayCount: number;
  inboxTaskCount: number;
  projects: SidebarProject[];
  initialProjects: ProjectRow[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // En el servidor no hay `localStorage`, así que el primer render
    // siempre es expandido; leerlo acá (después de montar) es la forma de
    // no romper la hidratación, a costa de un ajuste de un frame si el
    // dispositivo lo tenía colapsado.
    if (window.localStorage.getItem(STORAGE_KEY) === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ver comentario de arriba
      setCollapsed(true);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const toggleLabel = collapsed ? "Expandir panel lateral" : "Colapsar panel lateral";
  // Antes este control solo tenía `aria-label` (invisible para quien usa el
  // mouse) y un ícono de 14px casi pegado al borde: nada explicaba qué hacía
  // antes de apretarlo. El `Tooltip` (mismo patrón que `NavLink` para sus
  // accesos colapsados) lo pone en texto visible al pasar el mouse, y el
  // ícono ya cambia de dirección según el estado — `PanelLeftOpen` "entra"
  // al panel, `PanelLeftClose` "sale" de él.
  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={toggleLabel}
      className="absolute -right-3.5 top-16 flex size-7 items-center justify-center rounded-full border border-border bg-background text-text-secondary shadow-sm outline-none hover:border-ring hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </button>
  );

  return (
    <aside
      className={cn(
        "relative sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-background transition-[width] duration-150 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarContent
        collapsed={collapsed}
        fullName={fullName}
        email={email}
        avatarUrl={avatarUrl}
        todayCount={todayCount}
        inboxTaskCount={inboxTaskCount}
        projects={projects}
        initialProjects={initialProjects}
      />
      <Tooltip>
        <TooltipTrigger render={toggleButton} />
        <TooltipContent side="right">{toggleLabel}</TooltipContent>
      </Tooltip>
    </aside>
  );
}
