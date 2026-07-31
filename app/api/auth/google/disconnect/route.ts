import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { disconnectConnection } from "@/lib/calendar/connection";

/**
 * Desconecta la cuenta de Google (tarea 2.6): borra únicamente el registro
 * de `calendar_connections` del usuario. Los eventos nunca se guardaron en
 * Trazio (decisión D-C), así que no hay ningún otro dato que tocar.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  await disconnectConnection(user.id);
  return NextResponse.json({ ok: true });
}
