"use client";

import { CalendarAdminError, useGoogleCalendars } from "@/lib/calendar/use-google-calendars";
import { useSettings } from "@/components/settings/settings-context";

/**
 * Banner global de reconexión (bloque 7.7, D-I de `design.md`): cuando la
 * conexión con Google pasa a `needs_reauth`, el aviso vive en cada pantalla,
 * no escondido en Configuración — un calendario que dejó de actualizarse
 * engaña en todas las pantallas donde aparece. Reusa `useGoogleCalendars`
 * (mismo `queryKey` que la sección Calendarios, `googleCalendarsQueryKey`):
 * no es una consulta nueva, es la misma caché compartida por TanStack Query.
 *
 * Por D5, no usa el `--error` semántico (el rojo de marca): esto no es un
 * error del usuario ni una urgencia, es un estado que se resuelve con un
 * clic — mismo criterio que ya usa `--warning` para "Atrasadas" en Hoy.
 *
 * Vive en `app/(app)/layout.tsx`, junto a `OfflineBanner`: mismo patrón,
 * sticky arriba de todo, `null` cuando no aplica.
 */
export function GoogleReconnectBanner() {
  const { isError, error } = useGoogleCalendars();
  const { open } = useSettings();
  const needsReauth = isError && error instanceof CalendarAdminError && error.code === "needs_reauth";
  if (!needsReauth) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-foreground"
    >
      <span>Tu conexión con Google Calendar necesita reconectarse: los eventos dejaron de actualizarse.</span>
      <button
        type="button"
        onClick={() => open("calendarios")}
        className="font-medium underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Reconectar
      </button>
    </div>
  );
}
