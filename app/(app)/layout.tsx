import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSidebarProjects } from "@/lib/projects/get-sidebar-projects";
import { getAllProjects } from "@/lib/projects/get-all-projects";
import { getTodayTaskCount } from "@/lib/tasks/today-count";
import { getThemePreference } from "@/lib/preferences/get-theme-preference";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeSync } from "@/components/providers/theme-sync";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

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
  const [{ data: profile }, { data: preferences }, projects, initialProjects, theme] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("user_preferences").select("timezone").eq("user_id", user.id).single(),
    getSidebarProjects(user.id),
    getAllProjects(user.id),
    getThemePreference(),
  ]);

  const timezone = preferences?.timezone ?? "America/Argentina/Buenos_Aires";
  const todayCount = await getTodayTaskCount(user.id, timezone);
  const fullName = profile?.full_name ?? null;

  return (
    <QueryProvider>
      <ThemeSync serverTheme={theme} />
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
    </QueryProvider>
  );
}
