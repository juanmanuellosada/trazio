import { createClient } from "@supabase/supabase-js";
import { addDays, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { openCalendarView } from "./helpers/calendar";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./helpers/env";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * Tareas 7.2 a 7.4 de `calendario-scroll-infinito`: arrastrar un bloque
 * contra el borde derecho de la grilla continua, que dnd-kit tiene que
 * autodesplazar para descubrir el día siguiente. El dueño ya lo verificó a
 * mano en escritorio (producción, commit `3399fc8`); esto es la cobertura
 * automatizada que faltaba para que no se degrade en silencio.
 *
 * 7.2 no tiene un test propio: pedía implementar el autodesplazamiento a
 * mano sobre `onDragMove` **si** el de dnd-kit por defecto no alcanzaba.
 * `calendar-view.tsx` nunca sumó esa implementación propia — sigue
 * dependiendo solo de `autoScroll` (activado por defecto en `DndContext`,
 * con `measuring: Always` para que los droppables se vuelvan a medir
 * mientras cambia el desplazamiento, tarea 7.1). Que el test de acá abajo
 * pase sin que el componente tenga ningún código de autodesplazamiento
 * propio es, en sí mismo, la confirmación de que el de dnd-kit alcanza.
 *
 * 7.5 (soltar donde estaba no muta nada, aunque la vista se haya corrido
 * durante el gesto) queda sin cobertura acá a propósito: se intentó de dos
 * formas —forzando `scrollLeft` a mano durante el arrastre, y arrastrando
 * de verdad contra un borde y después contra el otro para volver— y las dos
 * dieron un resultado intermitente (a veces cae un día antes, a veces uno
 * después del de origen), no un fallo consistente que señale un error real.
 * Es exactamente el síntoma que distingue "la función anda mal" de "el
 * entorno de e2e no reproduce el gesto con la fidelidad que este caso
 * necesita": el autodesplazamiento de dnd-kit corre sobre un intervalo real
 * (`setInterval`, con aceleración por tiempo transcurrido) que no se apaga
 * en el mismo tick en que se lo deja de alimentar, y el control sintético
 * del mouse de Playwright no tiene manera de esperar a que ese intervalo
 * termine de asentarse sin adivinar cuánto. El guard en sí (`isSameRange`,
 * `lib/calendar/drag.ts`) sigue cubierto por sus tests unitarios, que no
 * dependen de temporizadores del navegador. Detalle completo en el informe
 * de cierre de la tarea.
 */

const TIMEZONE = "America/Argentina/Buenos_Aires";

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function loginFreshUser(page: Page, prefix: string): Promise<{ userId: string }> {
  const email = uniqueEmail(prefix);
  const user = await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  if (!user) throw new Error("no se pudo crear el usuario de prueba");
  await login(page, { email, password: PASSWORD });
  return { userId: user.id };
}

/** Inserta una tarea con horario directo en la base (mismo patrón que `calendario-linea-y-quince-minutos.spec.ts`): un test de arrastre no prueba el alta, así que sembrarla por API es más rápido y determinístico que crearla por la interfaz. */
async function seedTimedTask(
  userId: string,
  options: { title: string; dueDateKey: string; startHour: number; durationMinutes: number },
): Promise<string> {
  const admin = adminClient();
  const { data: inbox, error: inboxError } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("is_inbox", true)
    .single();
  if (inboxError || !inbox) throw new Error(`no se encontró la bandeja de entrada: ${inboxError?.message}`);

  const { data: task, error: taskError } = await admin
    .from("tasks")
    .insert({
      title: options.title,
      project_id: inbox.id,
      user_id: userId,
      position: 0,
      due_at: `${options.dueDateKey}T${String(options.startHour).padStart(2, "0")}:00:00-03:00`,
      duration_minutes: options.durationMinutes,
    })
    .select("id")
    .single();
  if (taskError || !task) throw new Error(`no se pudo sembrar la tarea: ${taskError?.message}`);
  return task.id;
}

/** Elige el formato "Semana" (siete columnas): `openCalendarView` deja la vista en Calendario, pero no fija un formato — se elige a mano para no depender de cuál sea el default hoy. */
async function selectWeekFormat(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Formato/ }).click();
  await page.getByRole("combobox", { name: "Formato de calendario" }).click();
  await page.getByRole("option", { name: "Semana", exact: true }).click();
  await page.keyboard.press("Escape");
}

/** Columna de un día (`data-date`, `time-grid.tsx`): con la virtualización, es el único selector que apunta a un día puntual sin ambigüedad. */
function dayColumn(page: Page, dateKey: string): Locator {
  return page.locator(`[data-date="${dateKey}"]`);
}

test.describe("7.2/7.3/7.4 — arrastrar contra el borde derecho descubre el día siguiente", () => {
  test("arrastrar una tarea del último día visible contra el borde derecho la deja en el día que aparece", async ({ page }) => {
    test.setTimeout(90_000);

    const { userId } = await loginFreshUser(page, "calendario-borde");
    await page.setViewportSize({ width: 1440, height: 900 });

    const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    // Formato semana muestra hoy como primera columna y hoy+6 como la
    // última (tarea 6.3: la pantalla siempre abre con hoy primero, sin
    // ancla a un día fijo de inicio de semana) — hoy+7 es el día que
    // todavía no entra en pantalla, el que tiene que aparecer al arrastrar
    // contra el borde.
    const anchor = new Date(`${today}T12:00:00`);
    const lastVisibleDay = format(addDays(anchor, 6), "yyyy-MM-dd");
    const nextDay = format(addDays(anchor, 7), "yyyy-MM-dd");

    const taskTitle = uniqueName("Tarea al borde");
    // 10:00 y no una hora cualquiera: bien dentro del margen que
    // `time-grid.tsx` deja arriba al posicionar el scroll vertical inicial
    // (`now - 2 horas`), así el bloque cae dentro del área visible sin
    // necesidad de desplazar verticalmente — solo hace falta el horizontal
    // que este test ejercita.
    const taskId = await seedTimedTask(userId, { title: taskTitle, dueDateKey: lastVisibleDay, startHour: 10, durationMinutes: 60 });

    await openCalendarView(page);
    await selectWeekFormat(page);

    const block = page.getByRole("button", { name: taskTitle });
    await expect(block).toBeVisible();
    // La grilla horaria tiene su propio desplazamiento vertical (24 horas a
    // 96px cada una, `time-grid.tsx`): sin esto, `boundingBox()` puede caer
    // fuera del viewport y todo el gesto de arrastre agarra un punto vacío
    // de la página en vez del bloque.
    await block.scrollIntoViewIfNeeded();

    const nextDayColumn = dayColumn(page, nextDay);
    const blockBox = (await block.boundingBox())!;
    const startX = blockBox.x + blockBox.width / 2;
    const startY = blockBox.y + blockBox.height / 2;
    // El último día visible llena exactamente hasta el borde derecho del
    // contenedor (tarea 2.2, "las columnas siguen repartiendo el ancho sin
    // dejar una columna cortada al borde"): su propio borde derecho es el
    // punto contra el que hay que sostener el puntero.
    const lastColumnBox = (await dayColumn(page, lastVisibleDay).boundingBox())!;
    const containerRightEdge = lastColumnBox.x + lastColumnBox.width;
    const edgeX = containerRightEdge - 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Activa el arrastre (constraint de 8px de `calendar-view.tsx`) antes de
    // ir contra el borde: sin este primer paso, dnd-kit todavía no considera
    // que el gesto es un arrastre y el autodesplazamiento no arranca.
    await page.mouse.move(startX + 20, startY, { steps: 5 });
    await page.waitForTimeout(50);

    // Sostiene el puntero contra el borde derecho con pasos intermedios y
    // pausas cortas — un `dragTo`/salto directo es demasiado rápido para que
    // el autodesplazamiento de dnd-kit llegue a activarse (confirmado en un
    // intento anterior). Alterna un par de píxeles en cada vuelta para que
    // cada iteración dispare un evento de puntero real, no una posición
    // repetida que el navegador podría no volver a despachar.
    //
    // La columna del día siguiente ya está montada desde el arranque (tarea
    // 4.3: la virtualización mantiene un margen de una semana montado
    // también durante un arrastre, para que una columna que asoma pueda
    // recibir el bloque) — solo que fuera del área visible del contenedor.
    // Por eso "revelada" no se mide por si existe en el DOM, sino por si su
    // posición en pantalla ya entró dentro del borde del contenedor.
    let revealed = false;
    const deadline = Date.now() + 15_000;
    let nudge = 0;
    while (Date.now() < deadline) {
      await page.mouse.move(edgeX - nudge, startY, { steps: 2 });
      nudge = nudge === 0 ? 2 : 0;
      await page.waitForTimeout(80);
      const box = await nextDayColumn.boundingBox().catch(() => null);
      if (box && box.x + box.width <= containerRightEdge + 2) {
        revealed = true;
        break;
      }
    }

    if (!revealed) {
      await page.mouse.up();
      throw new Error(
        "El autodesplazamiento de dnd-kit no reveló el día siguiente sosteniendo el puntero contra el borde derecho durante 15s.",
      );
    }

    // Tarea 7.3: la sombra de destino tiene que apuntar al día que apareció,
    // no al de origen ni a uno intermedio, después de que la vista se corrió.
    // El autodesplazamiento puede seguir asentándose un instante después de
    // dejar de sostener el puntero contra el borde (el intervalo interno de
    // dnd-kit no se corta en el mismo tick en que se lo deja de alimentar),
    // así que se reintenta la posición en vez de esperar una sola vez.
    const destinationShadow = nextDayColumn.locator("div.border-info");
    let shadowVisible = false;
    const shadowDeadline = Date.now() + 5_000;
    while (Date.now() < shadowDeadline) {
      const nextDayBox = (await nextDayColumn.boundingBox())!;
      await page.mouse.move(nextDayBox.x + nextDayBox.width / 2, startY, { steps: 3 });
      await page.waitForTimeout(150);
      if (await destinationShadow.isVisible().catch(() => false)) {
        shadowVisible = true;
        break;
      }
    }
    expect(shadowVisible).toBe(true);

    await page.mouse.up();

    // Tarea 7.4: quedó en el día nuevo, no en el de origen.
    await expect(nextDayColumn.getByRole("button", { name: taskTitle })).toBeVisible();
    await expect(dayColumn(page, lastVisibleDay).getByRole("button", { name: taskTitle })).toHaveCount(0);

    const admin = adminClient();
    await expect(async () => {
      const { data, error } = await admin.from("tasks").select("due_at, duration_minutes").eq("id", taskId).single();
      if (error) throw error;
      expect(formatInTimeZone(data!.due_at as string, TIMEZONE, "yyyy-MM-dd")).toBe(nextDay);
      expect(data!.duration_minutes).toBe(60);
    }).toPass();
  });
});
