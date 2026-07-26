"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarContent } from "./sidebar-content";
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
  todayCount,
  projects,
  initialProjects,
}: {
  fullName: string | null;
  email: string | null;
  todayCount: number;
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
        todayCount={todayCount}
        projects={projects}
        initialProjects={initialProjects}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expandir panel lateral" : "Colapsar panel lateral"}
        className="absolute -right-3 top-16 flex size-6 items-center justify-center rounded-full border border-border bg-background text-text-secondary shadow-sm outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
      </button>
    </aside>
  );
}
