"use client";

import { Copy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useConnectedApps, useRevokeConnectedApp } from "@/lib/oauth/use-connected-apps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastSuccess } from "@/lib/toast";

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
 * La URL del servidor MCP va siempre visible, no solo en el estado vacío:
 * alguien con un asistente ya conectado puede querer sumar otro. Se deriva
 * en runtime con `window.location.origin` (mismo recurso que
 * `buildShareUrl` en `share-project-dialog.tsx`) en vez de leer
 * `getSiteUrl` de `lib/site-url.ts` —esa función es para armar redirects
 * del lado servidor, y este componente es cliente.
 */
export function ConnectedAppsSection() {
  const { data, isPending, isError } = useConnectedApps();
  const revoke = useRevokeConnectedApp();
  const apps = data ?? [];

  function handleCopyMcpUrl() {
    navigator.clipboard.writeText(buildMcpServerUrl()).then(() => toastSuccess("URL copiada."));
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Aplicaciones conectadas</h2>
        <p className="text-sm text-text-secondary">
          Los asistentes de IA que autorizaste a leer y modificar tu cuenta por conversación, con la
          posibilidad de cortarles el acceso.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">URL del servidor MCP</p>
          <p className="text-xs text-text-secondary">
            Para conectar un asistente nuevo, pegá esta URL en un cliente compatible con MCP (por ejemplo,
            Claude). Te va a pedir iniciar sesión en Trazio y después aprobar el acceso desde una pantalla
            propia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input readOnly value={buildMcpServerUrl()} onFocus={(event) => event.currentTarget.select()} />
          <Button variant="outline" size="icon-sm" aria-label="Copiar URL del servidor MCP" onClick={handleCopyMcpUrl}>
            <Copy className="size-4" />
          </Button>
        </div>
        <p className="text-xs text-text-secondary">
          Un asistente conectado puede leer todo tu contenido y crear, editar, completar o archivar lo que
          corresponda; nunca borrar, eso lo impide la base de datos.
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

function buildMcpServerUrl(): string {
  return `${window.location.origin}/api/mcp`;
}

function formatGrantedAt(grantedAt: string): string {
  return format(parseISO(grantedAt), "d 'de' MMMM 'de' yyyy", { locale: es });
}
