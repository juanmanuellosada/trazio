import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSidebarProjects } from "@/lib/projects/get-sidebar-projects";
import { getAllProjects } from "@/lib/projects/get-all-projects";
import { getTodayTaskCount } from "@/lib/tasks/today-count";
import { getThemePreference } from "@/lib/preferences/get-theme-preference";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeSync } from "@/components/providers/theme-sync";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { OfflineBanner } from "@/components/providers/offline-banner";
import { OfflineBoundary } from "@/components/providers/offline-boundary";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";

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
  const [{ data: profile }, preferences, projects, initialProjects, theme] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getUserPreferences(user.id),
    getSidebarProjects(user.id),
    getAllProjects(user.id),
    getThemePreference(),
  ]);

  const todayCount = await getTodayTaskCount(user.id, preferences.timezone);
  const fullName = profile?.full_name ?? null;

  return (
    <QueryProvider>
      <ThemeSync serverTheme={theme} />
      <PreferencesProvider preferences={preferences}>
        <RealtimeProvider userId={user.id}>
          <TaskDetailProvider>
            <OfflineBanner />
            <OfflineBoundary>
              <div className="flex min-h-dvh">
                <AppSidebar
                  fullName={fullName}
                  email={user.email}
                  todayCount={todayCount}
                  projects={projects}
                  initialProjects={initialProjects}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <MobileNav
                    fullName={fullName}
                    email={user.email}
                    todayCount={todayCount}
                    projects={projects}
                    initialProjects={initialProjects}
                  />
                  <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
                </div>
              </div>
              <TaskDetailPanel />
            </OfflineBoundary>
          </TaskDetailProvider>
        </RealtimeProvider>
      </PreferencesProvider>
    </QueryProvider>
  );
}
