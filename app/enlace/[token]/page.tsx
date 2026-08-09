import type { Metadata } from "next";
import { Link2Off } from "lucide-react";
import { getSharedProject } from "@/lib/public-project/get-shared-project";
import { PublicProjectView } from "@/components/public/public-project-view";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";

/**
 * Vista pública de un enlace de lectura (`enlace-de-lectura-de-un-proyecto`,
 * D-F): fuera de `app/(app)/` a propósito, así que no hereda su layout —
 * ese layout consulta perfil, preferencias y árbol de proyectos con la
 * sesión de quien mira, y acá no hay ninguna sesión que usar para nada,
 * tenga cuenta propia o no (`lib/supabase/anon-client.ts`). Sin
 * `getCurrentUser()`, sin panel lateral, sin atajos.
 *
 * `robots: { index: false, follow: false }` es la mitad "meta" de D-D; la
 * otra mitad —la cabecera `X-Robots-Tag`, más `Referrer-Policy: no-referrer`
 * de D-C— vive en `next.config.ts`, matcheando esta misma ruta.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedProject(token);

  return {
    title: shared ? `${shared.project.name} · Trazio` : "Enlace no disponible · Trazio",
    robots: { index: false, follow: false },
  };
}

export default async function EnlaceLecturaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedProject(token);

  if (!shared) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <TaskListEmptyState
          icon={Link2Off}
          title="Este enlace no funciona"
          description="Puede que ya no exista o que se haya desactivado. Pedile a quien te lo compartió que te pase uno nuevo."
        />
      </div>
    );
  }

  return <PublicProjectView shared={shared} />;
}
