import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { calendarAdminErrorResponse } from "@/lib/calendar/calendar-admin-http";
import { listCalendarColorOptions } from "@/lib/calendar/calendars";

/** Colores de calendario que admite Google, para el selector de "Recolorear" (tarea 4.3). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  try {
    const colors = await listCalendarColorOptions(user.id);
    return NextResponse.json({ colors });
  } catch (error) {
    return calendarAdminErrorResponse(error);
  }
}
