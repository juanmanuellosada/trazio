import { NextResponse } from "next/server";
import { GoogleConnectionNotFoundError } from "@/lib/calendar/connection";
import { GoogleInsufficientPermissionError } from "@/lib/calendar/google-calendars-client";
import { GoogleReauthRequiredError, GoogleTransientError } from "@/lib/calendar/google-client";

/**
 * Traduce los errores tipados de `lib/calendar/calendars.ts` (tarea 4.1) al
 * mismo vocabulario de códigos que ya usa
 * `app/api/calendar/calendars/route.ts` GET (tarea 2.7), para que las cuatro
 * rutas de administración de calendarios y esa lectura compartan un solo
 * diccionario de mensajes en el cliente.
 */
export function calendarAdminErrorResponse(error: unknown): NextResponse {
  if (error instanceof GoogleConnectionNotFoundError) {
    return NextResponse.json({ error: "not_connected" }, { status: 404 });
  }
  if (error instanceof GoogleReauthRequiredError) {
    return NextResponse.json({ error: "needs_reauth" }, { status: 409 });
  }
  if (error instanceof GoogleInsufficientPermissionError) {
    return NextResponse.json({ error: "insufficient_scope" }, { status: 403 });
  }
  if (error instanceof GoogleTransientError) {
    return NextResponse.json({ error: "google_transient" }, { status: 502 });
  }
  return NextResponse.json({ error: "unknown" }, { status: 500 });
}
