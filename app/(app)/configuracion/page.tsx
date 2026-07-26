import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getSettingsData } from "@/lib/preferences/get-settings-data";
import { ProfileSection } from "@/components/settings/profile-section";
import { ThemeSection } from "@/components/settings/theme-section";
import { GeneralSection } from "@/components/settings/general-section";
import { InstallSection } from "@/components/settings/install-section";

export const metadata: Metadata = {
  title: "Configuración — Trazio",
};

/**
 * Pantalla de configuración (bloque 11): Perfil, Tema, General e
 * Instalación — las cuatro secciones de fase 1 del spec de
 * `openspec/changes/fase-1-base-usable/specs/configuracion/spec.md`.
 * Notificaciones y Calendarios son de fases posteriores y no van acá. No
 * hay selector de idioma (D4): Trazio es solo en español.
 */
export default async function ConfiguracionPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const data = await getSettingsData(user.id);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <ProfileSection userId={data.userId} fullName={data.fullName} email={data.email} hasPassword={data.hasPassword} />
        <ThemeSection />
        <GeneralSection
          userId={data.userId}
          timezone={data.timezone}
          dateFormat={data.dateFormat}
          timeFormat={data.timeFormat}
          weekStartsOn={data.weekStartsOn}
          defaultView={data.defaultView}
        />
        <InstallSection />
      </div>
    </div>
  );
}
