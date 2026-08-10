"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useConnectedApps, useRevokeConnectedApp } from "@/lib/oauth/use-connected-apps";
import { Button } from "@/components/ui/button";

/**
 * Sección "Aplicaciones conectadas" de Configuración (bloque 5.6 de
 * `servidor-mcp`, spec `configuracion` "Aplicaciones conectadas"): lista los
 * asistentes de IA que el usuario autorizó por MCP y deja cortarles el
 * acceso, uno por uno. Mismo patrón que `calendars-section.tsx` —lista de
 * conexiones externas con acción de desconectar inline— porque es el mismo
 * gesto: revocar acá no es destructivo para los datos de la cuenta (solo
 * corta el acceso), así que no lleva el diálogo de confirmación de una
 * acción destructiva, a diferencia de eliminar un calendario.
 *
 * Hasta que exista el servidor MCP (Olas 6 y 7 de `servidor-mcp`), el estado
 * vacío es lo único que esta sección muestra en la práctica — el texto está
 * escrito para tener sentido por sí solo, no como un "todavía no hay nada"
 * genérico.
 */
export function ConnectedAppsSection() {
  const { data, isPending, isError } = useConnectedApps();
  const revoke = useRevokeConnectedApp();
  const apps = data ?? [];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Aplicaciones conectadas</h2>
        <p className="text-sm text-text-secondary">
          Los asistentes de IA que autorizaste a leer y modificar tu cuenta por conversación, con la
          posibilidad de cortarles el acceso.
        </p>
      </div>

      {isPending ? (
        <p className="text-sm text-text-secondary">Cargando tus aplicaciones conectadas…</p>
      ) : isError ? (
        <p className="text-sm text-error">
          No pudimos cargar tus aplicaciones conectadas porque se cortó la conexión. Revisá tu internet y volvé a
          intentar.
        </p>
      ) : apps.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Todavía no autorizaste ningún asistente de IA. Cuando conectes uno (por ejemplo Claude) para leer o
          modificar tu cuenta por conversación, vas a verlo acá, con la posibilidad de cortarle el acceso cuando
          quieras.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {apps.map((app) => (
            <li key={app.clientId} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{app.name}</p>
                <p className="text-xs text-text-secondary">Desde el {formatGrantedAt(app.grantedAt)}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => revoke.mutate(app.clientId)}
                disabled={revoke.isPending}
              >
                Cortar acceso
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatGrantedAt(grantedAt: string): string {
  return format(parseISO(grantedAt), "d 'de' MMMM 'de' yyyy", { locale: es });
}
