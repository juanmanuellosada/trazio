"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CalendarAdminError, useGoogleCalendars, type GoogleCalendarListItem } from "@/lib/calendar/use-google-calendars";
import { Button } from "@/components/ui/button";
import { CalendarFormDialog } from "./calendar-form-dialog";
import { DeleteCalendarDialog } from "./delete-calendar-dialog";

/**
 * Sección Calendarios de Configuración (tarea 4.2, capacidad
 * `administracion-de-calendarios`): crear, renombrar, recolorear y
 * eliminar los calendarios de la cuenta de Google conectada. Mismo patrón
 * que `components/labels/labels-view.tsx` —lista con swatch de color e
 * iconos de acción inline, sin menú de tres puntos porque acá también son
 * solo dos acciones por fila— pero adaptado al espacio angosto del modal
 * de Configuración en vez de una pantalla propia.
 *
 * Todavía no está montada en `settings-modal.tsx`: ese archivo es del
 * grupo 7 (`components/settings/settings-modal.tsx` es de dueño único,
 * bloqueado con un test hasta que ese grupo agregue la pestaña
 * "Calendarios"). Este componente queda completo y listo para que ese
 * grupo lo monte con `<CalendarsSection />`, sin props.
 *
 * No incluye la selección de qué calendarios se muestran en Trazio
 * (`enabled_calendar_ids`): esa es la capacidad `conexion-google-calendar`,
 * ya resuelta del lado del servidor por la tanda anterior
 * (`app/api/calendar/calendars` GET/PATCH), y es una responsabilidad
 * distinta de administrar los calendarios en sí.
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

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Calendarios</h2>
          <p className="text-sm text-text-secondary">
            Administrá los calendarios de tu cuenta de Google conectada. Los cambios se hacen directamente en Google.
          </p>
        </div>
        {!isPending && !isError ? (
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nuevo calendario
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <p className="text-sm text-text-secondary">
          {isOffline
            ? "No hay conexión a internet. Trazio funciona 100% en línea: reconectate para ver tus calendarios."
            : "Cargando tus calendarios de Google…"}
        </p>
      ) : isError ? (
        <p className="text-sm text-text-secondary">{describeCalendarsError(error)}</p>
      ) : calendars.length === 0 ? (
        <p className="text-sm text-text-secondary">No encontramos ningún calendario en tu cuenta de Google.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {calendars.map((calendar) => (
            <li key={calendar.id} className="flex items-center gap-2.5 px-3 py-2.5">
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
          ))}
        </ul>
      )}

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
