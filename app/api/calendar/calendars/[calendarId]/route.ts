import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { calendarAdminErrorResponse } from "@/lib/calendar/calendar-admin-http";
import { deleteCalendar, recolorCalendar, renameCalendar } from "@/lib/calendar/calendars";
import { calendarNameSchema } from "@/lib/validation/calendars";
import { z } from "zod";

/**
 * Renombrar o recolorear un calendario existente (tarea 4.1): un único
 * cuerpo con `name` o `colorId` —nunca los dos a la vez— porque
 * `calendars-section.tsx` los ofrece como dos acciones separadas del menú
 * de cada calendario ("Renombrar" y "Recolorear").
 */
const patchBodySchema = z.union([
  z.object({ name: calendarNameSchema }),
  z.object({ colorId: z.string().trim().min(1) }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ calendarId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const { calendarId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    if ("name" in parsed.data) {
      await renameCalendar(user.id, calendarId, parsed.data.name);
    } else {
      await recolorCalendar(user.id, calendarId, parsed.data.colorId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return calendarAdminErrorResponse(error);
  }
}

/** Elimina un calendario de la cuenta de Google entera (tarea 4.1/4.4). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ calendarId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const { calendarId } = await params;

  try {
    await deleteCalendar(user.id, calendarId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return calendarAdminErrorResponse(error);
  }
}
