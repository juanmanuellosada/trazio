import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { GoogleReauthRequiredError, GoogleTransientError } from "@/lib/calendar/google-client";
import {
  GoogleConnectionNotFoundError,
  enabledCalendarIdsSchema,
  listUserCalendars,
  updateEnabledCalendars,
} from "@/lib/calendar/connection";

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
    if (error instanceof GoogleConnectionNotFoundError) {
      return NextResponse.json({ error: "not_connected" }, { status: 404 });
    }
    if (error instanceof GoogleReauthRequiredError) {
      return NextResponse.json({ error: "needs_reauth" }, { status: 409 });
    }
    if (error instanceof GoogleTransientError) {
      return NextResponse.json({ error: "google_transient" }, { status: 502 });
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
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
