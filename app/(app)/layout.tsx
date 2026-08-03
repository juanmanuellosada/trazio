import { redirect } from "next/navigation";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSidebarProjects } from "@/lib/projects/get-sidebar-projects";
import { getAllProjects } from "@/lib/projects/get-all-projects";
import { getInboxProjectId } from "@/lib/projects/get-inbox-project";
import { getAllSections } from "@/lib/sections/get-all-sections";
import { AllSectionsSeed } from "@/components/providers/all-sections-seed";
import { HoyEventsSeed } from "@/components/calendar/hoy-events-seed";
import { todayInTimeZone } from "@/lib/dates/today";
import { getTodayTaskCount } from "@/lib/tasks/today-count";
import { getThemePreference } from "@/lib/preferences/get-theme-preference";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeSync } from "@/components/providers/theme-sync";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { UndoProvider } from "@/components/providers/undo-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { OfflineBanner } from "@/components/providers/offline-banner";
import { GoogleReconnectBanner } from "@/components/providers/google-reconnect-banner";
import { OfflineBoundary } from "@/components/providers/offline-boundary";
import { ShortcutProvider } from "@/components/shortcuts/shortcut-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { ComposeContextProvider } from "@/components/tasks/compose-context";
import { SettingsProvider } from "@/components/settings/settings-context";
import { SettingsModal } from "@/components/settings/settings-modal";

/**
 * Layout de la app privada (bloque 5): panel lateral de escritorio, barra +
 * hoja de teléfono, y el `QueryClientProvider` de TanStack Query que
 * necesitan las mutaciones de los bloques siguientes. El proxy
 * (`lib/supabase/proxy.ts`) ya protege estas rutas; el `redirect` de acá es
 * un resguardo, no la barrera principal.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [{ data: profile }, preferences, sidebarProjects, initialProjects, initialSections, theme, inboxProjectId] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      getUserPreferences(user.id),
      getSidebarProjects(user.id),
      getAllProjects(user.id),
      getAllSections(user.id),
      getThemePreference(),
      getInboxProjectId(user.id),
    ]);
  const { projects, inboxTaskCount } = sidebarProjects;

  const todayCount = await getTodayTaskCount(user.id, preferences.timezone);
  const fullName = profile?.full_name ?? null;
  const todayDate = todayInTimeZone(new Date(), preferences.timezone);

  return (
    <QueryProvider>
      {/* También se monta en `app/(marketing)/layout.tsx`: quien se registra y
          entra directo a `/bandeja` sin pasar por la landing necesita el
          service worker igual, o "Activar" en Configuración → Notificaciones
          nunca encuentra una registración y se queda esperando para siempre. */}
      <RegisterServiceWorker />
      <AllSectionsSeed initialSections={initialSections} />
      {/* Precarga los eventos de hoy antes de llegar a Hoy, para que la
          pantalla no salte al insertarlos (ver el comentario del propio
          componente). */}
      <HoyEventsSeed todayDate={todayDate} timezone={preferences.timezone} />
      <ThemeSync serverTheme={theme} />
      <PreferencesProvider preferences={preferences}>
        <UndoProvider>
          <RealtimeProvider userId={user.id}>
            <TaskDetailProvider>
              <SettingsProvider>
                {/* Por encima de `ShortcutProvider` y de `AppSidebar` (bloque
                    `alta-de-tareas-en-contexto`, D-A): la vista actual (dentro
                    de `children`) publica acá su proyecto/sección/fecha, y los
                    dos diálogos globales —el del panel lateral y el del atajo
                    `Q`, ambos descendientes de este mismo punto— lo leen. */}
                <ComposeContextProvider>
                  <ShortcutProvider inboxProjectId={inboxProjectId}>
                    <OfflineBanner />
                    <GoogleReconnectBanner />
                    <OfflineBoundary>
                      <div className="flex min-h-dvh">
                        <AppSidebar
                          fullName={fullName}
                          email={user.email}
                          todayCount={todayCount}
                          inboxTaskCount={inboxTaskCount}
                          projects={projects}
                          initialProjects={initialProjects}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <MobileNav
                            fullName={fullName}
                            email={user.email}
                            todayCount={todayCount}
                            inboxTaskCount={inboxTaskCount}
                            projects={projects}
                            initialProjects={initialProjects}
                          />
                          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
                        </div>
                      </div>
                      <TaskDetailPanel />
                      <SettingsModal />
                    </OfflineBoundary>
                  </ShortcutProvider>
                </ComposeContextProvider>
              </SettingsProvider>
            </TaskDetailProvider>
          </RealtimeProvider>
        </UndoProvider>
      </PreferencesProvider>
    </QueryProvider>
  );
}
