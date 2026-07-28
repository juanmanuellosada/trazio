"use client";

import { useState, type ComponentType } from "react";
import { ChevronLeft, Download, Palette, SlidersHorizontal, User } from "lucide-react";
import { AppDialog } from "@/components/primitives/dialog";
import { useSettings } from "./settings-context";
import { useSettingsData } from "@/lib/preferences/use-settings-data";
import { AccountSection } from "./account-section";
import { GeneralSection } from "./general-section";
import { ThemeSection } from "./theme-section";
import { InstallSection } from "./install-section";
import { cn } from "@/lib/utils";

type SectionId = "cuenta" | "general" | "tema" | "instalacion";

const SECTIONS: { id: SectionId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "cuenta", label: "Cuenta", icon: User },
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "tema", label: "Tema", icon: Palette },
  { id: "instalacion", label: "Instalación", icon: Download },
];

/**
 * Modal de configuración (bloque 9): secciones navegables en vez de la
 * vieja pantalla propia (`docs/design-system.md` §9.2, spec `configuracion`
 * "Secciones del modal de configuración en fase 1"). Solo Cuenta, General,
 * Tema e Instalación — Notificaciones y Calendarios no tienen contenido
 * todavía y no aparecen ni deshabilitadas ni con aviso de "próximamente"
 * (D7, OQ3): mostrar una opción inerte no resuelve el problema de
 * confianza, lo anuncia.
 *
 * Vive una sola vez en `app/(app)/layout.tsx`, junto a `TaskDetailPanel`:
 * cualquier punto de entrada la abre a través de `useSettings()` sin
 * navegar a una ruta separada, así que la pantalla de fondo sigue siendo la
 * vista en la que estaba la persona (mismo patrón que el detalle de
 * tarea).
 *
 * En mobile, la lista de secciones y el contenido de la elegida ocupan el
 * modal por turnos (con un botón "Volver") en vez de mostrarse lado a
 * lado: no entran los dos a la vez en un ancho de teléfono. Los cuatro
 * paneles de contenido quedan siempre montados —solo se ocultan con
 * `hidden`— para no perder lo que la persona esté escribiendo si navega
 * entre secciones dentro de la misma apertura del modal.
 */
export function SettingsModal() {
  const { isOpen, close } = useSettings();
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { data, isLoading, isError } = useSettingsData(isOpen);

  function handleOpenChange(next: boolean) {
    if (!next) {
      close();
      setActiveSection(null);
    }
  }

  const effectiveSection = activeSection ?? "cuenta";

  return (
    <AppDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Configuración"
      size="lg"
      className="flex h-[32rem] max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl"
    >
      {isLoading || !data ? (
        <div className="flex flex-1 items-center justify-center text-sm text-text-secondary">Cargando…</div>
      ) : isError ? (
        <div className="flex flex-1 items-center justify-center text-sm text-error">
          No pudimos cargar tu configuración porque se cortó la conexión. Cerrá y volvé a abrirla en un momento.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 sm:gap-6">
          <nav
            aria-label="Secciones de configuración"
            className={cn("shrink-0 space-y-0.5", activeSection == null ? "block w-full sm:w-44" : "hidden sm:block sm:w-44")}
          >
            {SECTIONS.map((section) => {
              const active = effectiveSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-text-secondary hover:bg-accent hover:text-foreground",
                  )}
                >
                  <section.icon className="size-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className={cn("min-h-0 flex-1 overflow-y-auto", activeSection == null ? "hidden sm:block" : "block")}>
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="mb-4 flex items-center gap-1 text-sm text-text-secondary hover:text-foreground sm:hidden"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Volver
            </button>

            <div data-testid="panel-cuenta" className={effectiveSection === "cuenta" ? "block" : "hidden"}>
              <AccountSection
                userId={data.userId}
                fullName={data.fullName}
                email={data.email}
                hasPassword={data.hasPassword}
                googleIdentity={data.googleIdentity}
              />
            </div>
            <div data-testid="panel-general" className={effectiveSection === "general" ? "block" : "hidden"}>
              <GeneralSection
                userId={data.userId}
                timezone={data.timezone}
                dateFormat={data.dateFormat}
                timeFormat={data.timeFormat}
                weekStartsOn={data.weekStartsOn}
                defaultView={data.defaultView}
              />
            </div>
            <div data-testid="panel-tema" className={effectiveSection === "tema" ? "block" : "hidden"}>
              <ThemeSection />
            </div>
            <div data-testid="panel-instalacion" className={effectiveSection === "instalacion" ? "block" : "hidden"}>
              <InstallSection />
            </div>
          </div>
        </div>
      )}
    </AppDialog>
  );
}
