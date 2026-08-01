"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import {
  CalendarAdminError,
  useGoogleCalendars,
  type CalendarAdminErrorCode,
  type GoogleCalendarListItem,
} from "@/lib/calendar/use-google-calendars";
import { useDisconnectGoogleConnection, useUpdateEnabledCalendars } from "@/lib/calendar/calendar-admin-mutations";
import { Button } from "@/components/ui/button";
import { CalendarFormDialog } from "./calendar-form-dialog";
import { DeleteCalendarDialog } from "./delete-calendar-dialog";
import { cn } from "@/lib/utils";

/**
 * Sección Calendarios de Configuración (tarea 4.2 + bloque 7.4/7.10, spec
 * `configuracion` "Sección Calendarios"): estado de la conexión con Google
 * siempre visible, conectar/desconectar/reconectar, elegir qué calendarios
 * de Google se muestran en Trazio, y crear/renombrar/recolorear/eliminar
 * los calendarios de la cuenta conectada. Mismo patrón que
 * `components/labels/labels-view.tsx` —lista con swatch de color e iconos
 * de acción inline— pero adaptado al espacio angosto del modal de
 * Configuración.
 *
 * Montada en `settings-modal.tsx` (bloque 7.4): antes quedaba completa pero
 * sin montar, a la espera de que este grupo agregara la pestaña
 * "Calendarios".
 */
export function CalendarsSection() {
  // `isPending`, no `isLoading`: `isLoading` es `isPending && isFetching`, y
  // queda en `false` mientras la consulta está `pending` mismo sin datos
  // —por ejemplo, pausada por D1 mientras no hay conexión (`fetchStatus`
  // `"paused"`)—, lo que hacía que esta sección mostrara "no hay
  // calendarios" en vez de avisar que no pudo cargar. Encontrado al
  // verificar en el navegador, no lo cubría ningún test con `fetch`
  // mockeado.
  const { data, isPending, isError, error, fetchStatus } = useGoogleCalendars();
  const isOffline = isPending && fetchStatus === "paused";
  const disconnect = useDisconnectGoogleConnection();
  const updateEnabled = useUpdateEnabledCalendars();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<GoogleCalendarListItem | undefined>(undefined);
  const [deletingCalendar, setDeletingCalendar] = useState<GoogleCalendarListItem | null>(null);

  function openCreate() {
    setEditingCalendar(undefined);
    setFormOpen(true);
  }

  function openEdit(calendar: GoogleCalendarListItem) {
    setEditingCalendar(calendar);
    setFormOpen(true);
  }

  const calendars = data?.calendars ?? [];
  const enabledCalendarIds = data?.enabledCalendarIds ?? [];
  const isConnected = !isPending && !isError;
  const code = classifyError(error);
  // "insufficient_scope" también se resuelve reconectando: es la misma
  // conexión pidiendo el permiso `calendar` completo otra vez (D19/tarea 4.3).
  const canReconnect = code === "needs_reauth" || code === "insufficient_scope";
  const connectionStatus = describeConnectionStatus({ isConnected, code, error });

  function toggleCalendarEnabled(calendarId: string, checked: boolean) {
    const next = checked ? [...enabledCalendarIds, calendarId] : enabledCalendarIds.filter((id) => id !== calendarId);
    updateEnabled.mutate(next);
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Calendarios</h2>
        <p className="text-sm text-text-secondary">
          Administrá tu conexión con Google Calendar y elegí qué calendarios se muestran en Trazio.
        </p>
      </div>

      {!isPending && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{connectionStatus.title}</p>
            <p className="text-xs text-text-secondary">{connectionStatus.description}</p>
          </div>
          {isConnected ? (
            <Button type="button" variant="outline" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              Desconectar
            </Button>
          ) : code === "not_connected" || canReconnect ? (
            <Button size="sm" render={<a href="/api/auth/google" />}>
              {canReconnect ? "Reconectar" : "Conectar con Google"}
            </Button>
          ) : null}
        </div>
      )}

      {isConnected && (
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">Tus calendarios</h3>
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nuevo calendario
          </Button>
        </div>
      )}

      {isPending ? (
        <p className="text-sm text-text-secondary">
          {isOffline
            ? "No hay conexión a internet. Trazio funciona 100% en línea: reconectate para ver tus calendarios."
            : "Cargando tus calendarios de Google…"}
        </p>
      ) : isConnected && calendars.length === 0 ? (
        <p className="text-sm text-text-secondary">No encontramos ningún calendario en tu cuenta de Google.</p>
      ) : isConnected ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {calendars.map((calendar) => {
            const enabled = enabledCalendarIds.includes(calendar.id);
            return (
              <li key={calendar.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={enabled}
                  aria-label={enabled ? `Dejar de mostrar ${calendar.summary} en Trazio` : `Mostrar ${calendar.summary} en Trazio`}
                  onClick={() => toggleCalendarEnabled(calendar.id, !enabled)}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    enabled ? "border-primary bg-primary" : "border-input",
                  )}
                >
                  {enabled && <Check className="size-3 text-primary-foreground" aria-hidden />}
                </button>
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: calendar.backgroundColor ?? "var(--text-secondary)" }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{calendar.summary}</span>
                {calendar.primary ? <span className="text-xs text-text-secondary">Principal</span> : null}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${calendar.summary}`}
                  onClick={() => openEdit(calendar)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    calendar.primary
                      ? `No se puede eliminar ${calendar.summary} porque es el calendario principal`
                      : `Eliminar ${calendar.summary}`
                  }
                  disabled={calendar.primary}
                  onClick={() => setDeletingCalendar(calendar)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <CalendarFormDialog open={formOpen} onOpenChange={setFormOpen} calendar={editingCalendar} />
      {deletingCalendar && (
        <DeleteCalendarDialog
          open={!!deletingCalendar}
          onOpenChange={(open) => {
            if (!open) setDeletingCalendar(null);
          }}
          calendar={deletingCalendar}
        />
      )}
    </section>
  );
}

/**
 * Título y descripción del estado de la conexión, siempre visible (tarea
 * 7.10, spec `configuracion` "Sección Calendarios"): distingue conectado,
 * sin conexión, y necesita reconectarse, en vez de un único texto de error
 * genérico — es lo primero que se ve al abrir la sección.
 */
function describeConnectionStatus({
  isConnected,
  code,
  error,
}: {
  isConnected: boolean;
  code: ReturnType<typeof classifyError>;
  error: unknown;
}): { title: string; description: string } {
  if (isConnected) {
    return { title: "Conectado con Google", description: "Trazio puede leer y editar los eventos de tu cuenta." };
  }
  if (code === "not_connected") {
    return { title: "Sin conexión con Google", description: "Conectá tu cuenta de Google para ver y crear eventos desde Trazio." };
  }
  if (code === "needs_reauth" || code === "insufficient_scope") {
    return { title: "La conexión necesita reconectarse", description: describeCalendarsError(error) };
  }
  return { title: "No pudimos conectar con Google", description: describeCalendarsError(error) };
}

function classifyError(error: unknown): CalendarAdminErrorCode | null {
  return error instanceof CalendarAdminError ? error.code : null;
}

/**
 * Traduce el error de `useGoogleCalendars` (tarea 2.7, mismos códigos que
 * `lib/calendar/calendar-admin-mutations.ts`) a un texto de estado, no a un
 * toast: es lo primero que se ve al abrir la sección, no la reacción a una
 * acción puntual.
 */
function describeCalendarsError(error: unknown): string {
  if (error instanceof CalendarAdminError) {
    switch (error.code) {
      case "not_connected":
        return "Todavía no hay ninguna cuenta de Google conectada.";
      case "needs_reauth":
        return "La conexión con Google necesita reconectarse.";
      case "google_transient":
        return "No pudimos conectarnos con Google ahora mismo. Volvé a intentar en un momento.";
      case "insufficient_scope":
        return "La conexión no tiene el permiso completo para administrar calendarios. Reconectá tu cuenta de Google.";
      default:
        return "No pudimos cargar tus calendarios porque algo falló de nuestro lado.";
    }
  }
  return "No pudimos cargar tus calendarios porque se cortó la conexión. Revisá tu internet y volvé a intentar.";
}
