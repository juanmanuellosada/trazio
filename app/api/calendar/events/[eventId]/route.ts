import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import {
  RecurrenceScopeRequiredError,
  deleteEvent,
  eventInputSchema,
  recurrenceEditScopeSchema,
  updateEvent,
  type OccurrenceTarget,
} from "@/lib/calendar/events";

/**
 * Editar y eliminar un evento puntual, o una ocurrencia de una serie
 * recurrente (tareas 3.4/3.5). `recurringEventId`/`originalStartTime`/`scope`
 * viajan siempre juntos: si el evento pertenece a una serie, el llamador ya
 * tuvo que preguntar con `components/calendar/recurrence-scope-dialog.tsx`
 * (tarea 3.6) antes de llegar acá. Si no preguntó, `updateEvent`/`deleteEvent`
 * tiran `RecurrenceScopeRequiredError` en vez de aplicar un default.
 */

const patchBodySchema = z.object({
  calendarId: z.string().min(1),
  recurringEventId: z.string().min(1).nullable(),
  originalStartTime: z.string().min(1).nullable(),
  scope: recurrenceEditScopeSchema.optional(),
  changes: eventInputSchema,
});

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const target: OccurrenceTarget = {
    calendarId: parsed.data.calendarId,
    eventId,
    recurringEventId: parsed.data.recurringEventId,
    originalStartTime: parsed.data.originalStartTime,
  };

  try {
    const result = await updateEvent(user.id, target, parsed.data.changes, parsed.data.scope);
    if (result.status === "not_connected") return NextResponse.json({ error: "not_connected" }, { status: 404 });
    if (result.status === "unavailable") {
      return NextResponse.json(
        { error: result.reason === "needs_reauth" ? "needs_reauth" : "google_transient" },
        { status: result.reason === "needs_reauth" ? 409 : 502 },
      );
    }
    return NextResponse.json(result.event);
  } catch (error) {
    if (error instanceof RecurrenceScopeRequiredError) {
      return NextResponse.json({ error: "recurrence_scope_required" }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }

  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const calendarId = searchParams.get("calendarId");
  if (!calendarId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const scopeParam = searchParams.get("scope");
  const scopeParsed = scopeParam ? recurrenceEditScopeSchema.safeParse(scopeParam) : undefined;
  if (scopeParam && !scopeParsed?.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const target: OccurrenceTarget = {
    calendarId,
    eventId,
    recurringEventId: searchParams.get("recurringEventId"),
    originalStartTime: searchParams.get("originalStartTime"),
  };

  try {
    const result = await deleteEvent(user.id, target, scopeParsed?.data);
    if (result.status === "not_connected") return NextResponse.json({ error: "not_connected" }, { status: 404 });
    if (result.status === "unavailable") {
      return NextResponse.json(
        { error: result.reason === "needs_reauth" ? "needs_reauth" : "google_transient" },
        { status: result.reason === "needs_reauth" ? 409 : 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RecurrenceScopeRequiredError) {
      return NextResponse.json({ error: "recurrence_scope_required" }, { status: 400 });
    }
    throw error;
  }
}
