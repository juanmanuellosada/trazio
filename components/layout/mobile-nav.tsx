"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Inbox, Sun, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar-content";
import type { SidebarProject } from "@/lib/projects/get-sidebar-projects";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { cn } from "@/lib/utils";

/**
 * Navegación de teléfono (bloque 5.4): una barra superior angosta con el
 * menú (abre el panel lateral completo en una hoja deslizable — "el resto
 * de las funciones ... se alcanza deslizando el panel lateral", spec de
 * `vistas-lista`) y la barra inferior con exactamente tres accesos. El
 * cuarto lugar queda vacío a propósito hasta que exista Próximos en fase 2.
 */
export function MobileNav({
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra la hoja al navegar: el layout no se remonta entre rutas de
  // `app/(app)/**`, así que sin esto quedaría abierta tapando la pantalla
  // nueva después de tocar un link de adentro.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con la navegación (sistema externo), no deriva estado de un render
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center border-b border-border bg-background px-2 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="flex size-9 items-center justify-center rounded-md text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 bg-background p-0">
            <SidebarContent
              fullName={fullName}
              email={email}
              todayCount={todayCount}
              projects={projects}
              initialProjects={initialProjects}
            />
          </SheetContent>
        </Sheet>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-border bg-background md:hidden"
        aria-label="Navegación principal"
      >
        <MobileTabLink href="/bandeja" label="Bandeja" icon={Inbox} active={pathname === "/bandeja"} />
        <MobileTabLink href="/hoy" label="Hoy" icon={Sun} active={pathname === "/hoy"} count={todayCount} />
        <button
          type="button"
          // TODO(bloque 9): abre el alta rápida con parseo de lenguaje natural.
          className="flex flex-col items-center justify-center gap-0.5 text-text-secondary outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Agregar tarea"
        >
          <Plus className="size-5" />
          <span className="text-[11px] font-medium">Agregar</span>
        </button>
        {/* Cuarto lugar vacío a propósito: es el de Próximos en fase 2. */}
        <span aria-hidden className="block" />
      </nav>
    </>
  );
}

function MobileTabLink({
  href,
  label,
  icon: Icon,
  active,
  count,
}: {
  href: string;
  label: string;
  icon: typeof Inbox;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "text-primary" : "text-text-secondary hover:text-foreground",
      )}
    >
      <span className="relative">
        <Icon className="size-5" />
        {count != null && count > 0 && (
          <span className="absolute -right-2 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}
