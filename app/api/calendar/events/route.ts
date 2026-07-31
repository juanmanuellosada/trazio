import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createEvent, eventInputSchema, getEventsForRange } from "@/lib/calendar/events";

/**
 * Lee los eventos de los calendarios habilitados en un rango (tarea 3.1).
 * A diferencia de `app/api/calendar/calendars/route.ts`, acá "no
 * conectado"/"conexión rota"/"Google no responde" se devuelven con 200: son
 * estados normales que la pantalla tiene que poder pintar sin tratarlos
 * como una falla de la petición (tarea 3.7, degradación sin pantalla en
 * blanco). Un 401 sigue siendo un 401: eso sí es "no hay sesión".
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  if (!timeMin || !timeMax || Number.isNaN(Date.parse(timeMin)) || Number.isNaN(Date.parse(timeMax))) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const result = await getEventsForRange(user.id, { startISO: timeMin, endISO: timeMax });
  return NextResponse.json(result);
}

/** Crea un evento nuevo (tarea 3.4). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await createEvent(user.id, parsed.data);
  if (result.status === "not_connected") return NextResponse.json({ error: "not_connected" }, { status: 404 });
  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: result.reason === "needs_reauth" ? "needs_reauth" : "google_transient" },
      { status: result.reason === "needs_reauth" ? 409 : 502 },
    );
  }
  return NextResponse.json(result.event, { status: 201 });
}
