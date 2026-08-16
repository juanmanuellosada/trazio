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
 * Reporte del dueño: "una tarea de todo el día en modo calendario no se
 * puede arrastrar a otro día. Se puede, pero dándole un horario. Quiero que
 * se pueda a la sección de arriba de todo el día". La fila de todo el día no
 * era destino de arrastre —solo lo eran las columnas horarias—, así que el
 * gesto siempre terminaba dándole hora a la tarea.
 *
 * Va a e2e y no solo a jsdom porque lo que hay que probar es geometría real:
 * qué destino gana cuando el puntero está sobre una fila de 26px que tiene
 * debajo una columna de 24 horas de alto. Eso depende del layout del
 * navegador, que jsdom no calcula.
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

async function inboxId(userId: string): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin.from("projects").select("id").eq("user_id", userId).eq("is_inbox", true).single();
  if (error || !data) throw new Error(`no se encontró la bandeja de entrada: ${error?.message}`);
  return data.id;
}

/** Tarea de todo el día: `due_date` con valor y `due_at` en `null`, las dos columnas excluyentes de D9. */
async function seedAllDayTask(userId: string, options: { title: string; dueDateKey: string }): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("tasks")
    .insert({ title: options.title, project_id: await inboxId(userId), user_id: userId, position: 0, due_date: options.dueDateKey })
    .select("id")
    .single();
  if (error || !data) throw new Error(`no se pudo sembrar la tarea de todo el día: ${error?.message}`);
  return data.id;
}

/** Tarea con horario: el caso inverso, para probar que soltarla arriba le saca la hora. */
async function seedTimedTask(userId: string, options: { title: string; dueDateKey: string; startHour: number }): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("tasks")
    .insert({
      title: options.title,
      project_id: await inboxId(userId),
      user_id: userId,
      position: 0,
      due_at: `${options.dueDateKey}T${String(options.startHour).padStart(2, "0")}:00:00-03:00`,
      duration_minutes: 60,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`no se pudo sembrar la tarea con horario: ${error?.message}`);
  return data.id;
}

/** Formato "Semana" (siete columnas, hoy primero): el que deja ver varios días a la vez para arrastrar de uno a otro. */
async function selectWeekFormat(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Formato/ }).click();
  await page.getByRole("combobox", { name: "Formato de calendario" }).click();
  await page.getByRole("option", { name: "Semana", exact: true }).click();
  await page.keyboard.press("Escape");
}

/** Celda de destino de la fila de todo el día (`all-day-row.tsx`): solo existe mientras hay un arrastre de bloque en curso. */
function allDayCell(page: Page, dateKey: string): Locator {
  return page.locator(`[data-all-day-drop="${dateKey}"]`);
}

/**
 * Arrastra un bloque hasta la celda de todo el día de `targetDay`. El
 * destino se ubica recién con el gesto empezado, porque antes no existe en
 * el DOM: la fila solo ofrece destinos mientras se está arrastrando.
 */
async function dragToAllDayRow(page: Page, block: Locator, targetDay: string): Promise<void> {
  await block.scrollIntoViewIfNeeded();
  const box = (await block.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Pasa el umbral de activación de 8px (`calendar-view.tsx`): hasta acá
  // dnd-kit todavía no considera que el gesto sea un arrastre.
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2, { steps: 5 });
  await page.waitForTimeout(100);

  const cell = allDayCell(page, targetDay);
  await expect(cell).toBeVisible();
  const cellBox = (await cell.boundingBox())!;
  await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2, { steps: 8 });
  await page.waitForTimeout(150);

  // El destino se resalta: si esto falla, el puntero está adentro de la
  // celda pero la detección de colisiones le está dando la columna horaria.
  await expect(cell).toHaveClass(/border-info/);

  await page.mouse.up();
}

test.describe("arrastrar a la fila de todo el día", () => {
  test("una tarea de todo el día se mueve a otro día sin recibir horario", async ({ page }) => {
    test.setTimeout(90_000);

    const { userId } = await loginFreshUser(page, "todo-el-dia-mover");
    await page.setViewportSize({ width: 1440, height: 900 });

    const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    const anchor = new Date(`${today}T12:00:00`);
    const originDay = format(addDays(anchor, 1), "yyyy-MM-dd");
    const targetDay = format(addDays(anchor, 3), "yyyy-MM-dd");

    const title = uniqueName("Renovar el pasaporte");
    const taskId = await seedAllDayTask(userId, { title, dueDateKey: originDay });

    await openCalendarView(page);
    await selectWeekFormat(page);

    const block = page.getByRole("button", { name: title });
    await expect(block).toBeVisible();

    await dragToAllDayRow(page, block, targetDay);

    const admin = adminClient();
    await expect(async () => {
      const { data, error } = await admin.from("tasks").select("due_date, due_at").eq("id", taskId).single();
      expect(error).toBeNull();
      expect(data?.due_date).toBe(targetDay);
      expect(data?.due_at).toBeNull();
    }).toPass({ timeout: 10_000 });
  });

  test("una tarea con horario soltada en la fila pierde la hora y queda en ese día", async ({ page }) => {
    test.setTimeout(90_000);

    const { userId } = await loginFreshUser(page, "todo-el-dia-sin-hora");
    await page.setViewportSize({ width: 1440, height: 900 });

    const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    const anchor = new Date(`${today}T12:00:00`);
    const originDay = format(addDays(anchor, 1), "yyyy-MM-dd");
    const targetDay = format(addDays(anchor, 2), "yyyy-MM-dd");

    const title = uniqueName("Llamar al banco");
    // 10:00: dentro del tramo que la grilla deja visible al abrir, sin
    // necesidad de desplazarse verticalmente para encontrar el bloque.
    const taskId = await seedTimedTask(userId, { title, dueDateKey: originDay, startHour: 10 });

    await openCalendarView(page);
    await selectWeekFormat(page);

    const block = page.getByRole("button", { name: title });
    await expect(block).toBeVisible();

    await dragToAllDayRow(page, block, targetDay);

    const admin = adminClient();
    await expect(async () => {
      const { data, error } = await admin.from("tasks").select("due_date, due_at, duration_minutes").eq("id", taskId).single();
      expect(error).toBeNull();
      expect(data?.due_date).toBe(targetDay);
      expect(data?.due_at).toBeNull();
      // La duración estimada sobrevive a perder el horario.
      expect(data?.duration_minutes).toBe(60);
    }).toPass({ timeout: 10_000 });
  });
});
