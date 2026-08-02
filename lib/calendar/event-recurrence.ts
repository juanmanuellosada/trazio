/**
 * Valor de repetición de un evento (`alta-de-evento-completa`, D-C): las
 * mismas tres partes que `CustomRecurrenceValue`
 * (`components/recurrence/custom-recurrence-dialog.tsx`) — `rule`
 * (`FREQ`/`INTERVAL`/`BYDAY`/etc, formato de `lib/recurrence/rule.ts`),
 * `endsAt` y `count` — pero sin ancla: un evento no se completa, ese
 * concepto no aplica acá. A diferencia de una tarea, que guarda `endsAt`/
 * `count` en columnas separadas de la regla, Google necesita una sola línea
 * `RRULE:` con `UNTIL`/`COUNT` ya embebido, así que este módulo hace esa
 * combinación (y su inversa, para prefiltrar el editor al abrir la edición
 * de una serie existente).
 */
export type EventRecurrenceValue = { rule: string; endsAt: string | null; count: number | null } | null;

export function eventRecurrenceEquals(a: EventRecurrenceValue, b: EventRecurrenceValue): boolean {
  if (a === null || b === null) return a === b;
  return a.rule === b.rule && a.endsAt === b.endsAt && a.count === b.count;
}

/**
 * Arma el array `recurrence` que espera Google: `null` se traduce a `[]`
 * (Google solo borra la recurrencia existente de un evento si se lo mandás
 * explícito; omitir el campo entero la deja como estaba, que es lo que hace
 * quien llama cuando no hay cambio de repetición que mandar). `endsAt`/
 * `count` se embeben como `UNTIL`/`COUNT` en la misma línea `RRULE:` — nunca
 * los dos a la vez, `count` gana si por algún motivo llegaran juntos.
 */
export function toGoogleRecurrenceLines(value: EventRecurrenceValue, allDay: boolean): string[] {
  if (!value) return [];
  let rule = value.rule;
  if (value.count !== null) {
    rule += `;COUNT=${value.count}`;
  } else if (value.endsAt) {
    const compact = value.endsAt.replaceAll("-", "");
    rule += allDay ? `;UNTIL=${compact}` : `;UNTIL=${compact}T235959Z`;
  }
  return [`RRULE:${rule}`];
}

/**
 * El inverso, para prefiltrar el editor de repetición al abrir la edición de
 * un evento que ya es parte de una serie (tarea 3.1/3.4): separa `rule` de
 * `UNTIL`/`COUNT`, para que quede en el mismo formato de
 * `lib/recurrence/rule.ts` que reconocen las opciones rápidas. Ignora
 * cualquier línea que no sea `RRULE:` (por ejemplo `EXDATE` de ocurrencias
 * sueltas ya borradas): esas no son parte de lo que este formulario edita, y
 * viajan intactas porque nunca se tocan al guardar sin cambiar la regla
 * (`googleBody`, `lib/calendar/events.ts`, solo manda `recurrence` cuando la
 * regla cambió).
 */
export function fromGoogleRecurrenceLines(lines: string[] | null | undefined): EventRecurrenceValue {
  const rruleLine = (lines ?? []).find((line) => line.toUpperCase().startsWith("RRULE:"));
  if (!rruleLine) return null;
  const body = rruleLine.replace(/^RRULE:/i, "");
  const untilMatch = /UNTIL=(\d{4})(\d{2})(\d{2})/.exec(body);
  const countMatch = /COUNT=(\d+)/.exec(body);
  const rule = body.replace(/;?UNTIL=[^;]+/i, "").replace(/;?COUNT=\d+/i, "");
  return {
    rule,
    endsAt: untilMatch ? `${untilMatch[1]}-${untilMatch[2]}-${untilMatch[3]}` : null,
    count: countMatch ? Number(countMatch[1]) : null,
  };
}
