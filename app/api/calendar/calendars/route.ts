import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { calendarAdminErrorResponse } from "@/lib/calendar/calendar-admin-http";
import { createCalendar } from "@/lib/calendar/calendars";
import { enabledCalendarIdsSchema, listUserCalendars, updateEnabledCalendars } from "@/lib/calendar/connection";
import { calendarNameSchema } from "@/lib/validation/calendars";

/** Lista los calendarios de Google del usuario y cuáles tiene habilitados (tarea 2.7). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  try {
    const { calendars, enabledCalendarIds } = await listUserCalendars(user.id);
    return NextResponse.json({ calendars, enabledCalendarIds });
  } catch (error) {
    return calendarAdminErrorResponse(error);
  }
}

/** Crea un calendario nuevo en la cuenta de Google conectada (tarea 4.1). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = calendarNameSchema.safeParse(
    body && typeof body === "object" ? (body as { name?: unknown }).name : undefined,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  try {
    const calendar = await createCalendar(user.id, parsed.data);
    return NextResponse.json({ calendar }, { status: 201 });
  } catch (error) {
    return calendarAdminErrorResponse(error);
  }
}

/** Guarda cuáles calendarios de Google se muestran en Trazio (tarea 2.7). */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = enabledCalendarIdsSchema.safeParse(
    body && typeof body === "object" ? (body as { enabledCalendarIds?: unknown }).enabledCalendarIds : undefined,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await updateEnabledCalendars(user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
