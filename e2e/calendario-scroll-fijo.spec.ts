import { createClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { openCalendarView } from "./helpers/calendar";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./helpers/env";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * Bug reportado: al scrollear verticalmente en semana/día/4-días, la fila
 * de encabezados de día desaparecía en vez de quedar fija, porque el
 * contenedor `overflow-auto` de `time-grid.tsx` (línea ~482) nunca llegaba
 * a ser el elemento que de verdad scrollea — ningún ancestro entre él y
 * `<body>` tenía una altura acotada, así que scrolleaba la PÁGINA ENTERA
 * en vez de solo la grilla. El fix agrega `h-dvh`/`min-h-0` a la cadena de
 * `app/(app)/layout.tsx` y a los wrappers de pantalla que montan
 * `ScreenCalendar` — nada dentro de `components/calendar/` cambió.
 *
 * Cubre además el pedido explícito del dueño ("el scroll únicamente sea
 * para las tareas, no para todo el contenido"): la página en sí
 * (`document.scrollingElement`) no debe moverse nunca en estas pantallas.
 */

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

const TIMEZONE = "America/Argentina/Buenos_Aires";

/** Celda de encabezado del día de hoy (`isToday`, `time-grid.tsx` línea ~504): única combinación `font-semibold text-primary` en la pantalla de calendario. */
function todayHeaderCell(page: Page): Locator {
  return page.locator("div.font-semibold.text-primary");
}

/** Ancla top-left, `sticky top-0 z-30` (`data-gutter-cell` de la fila de encabezados, `time-grid.tsx` línea ~492-495): el primer `data-gutter-cell` en el DOM es el del encabezado, no el de la columna de horas. */
function headerGutterCell(page: Page): Locator {
  return page.locator("[data-gutter-cell]").first();
}

/** Scrollea el contenedor interno de la grilla (el único `overflow-auto` de `time-grid.tsx`), no la página. */
async function scrollTimeGrid(page: Page, scrollTop: number): Promise<void> {
  await page.evaluate((top) => {
    const gutter = document.querySelector("[data-gutter-cell]");
    const container = gutter?.closest(".overflow-auto");
    if (!container) throw new Error("no se encontró el contenedor con scroll de la grilla");
    container.scrollTop = top;
  }, scrollTop);
}

test.describe("calendario-scroll-fijo — la fila de encabezados de día queda fija al scrollear", () => {
  test("en semana, la fila de encabezados sigue visible y en el mismo lugar al scrollear verticalmente, y solo la grilla scrollea (no la página ni el header 'Próximos')", async ({
    page,
  }) => {
    await loginFreshUser(page, "calendario-scroll-fijo");
    await openCalendarView(page);

    const title = page.getByRole("heading", { name: "Próximos" });
    await expect(title).toBeVisible();
    await expect(headerGutterCell(page)).toBeVisible();
    await expect(todayHeaderCell(page)).toBeVisible();

    const titleBoxBefore = (await title.boundingBox())!;
    const headerBoxBefore = (await headerGutterCell(page).boundingBox())!;
    const todayBoxBefore = (await todayHeaderCell(page).boundingBox())!;

    // 800px: bien dentro de las 24 horas (2304px de grilla) para forzar un
    // scroll real sin necesidad de sembrar tareas.
    await scrollTimeGrid(page, 800);
    await page.waitForTimeout(150);

    const scrollState = await page.evaluate(() => ({
      pageScrollTop: document.scrollingElement?.scrollTop ?? 0,
      gridScrollTop: document.querySelector("[data-gutter-cell]")?.closest(".overflow-auto")?.scrollTop ?? 0,
    }));
    // La grilla es la que de verdad scrolleó...
    expect(scrollState.gridScrollTop).toBeGreaterThan(0);
    // ...y la página, no.
    expect(scrollState.pageScrollTop).toBe(0);

    // El header "Próximos" + barra de opciones no se movió ni un píxel.
    const titleBoxAfter = (await title.boundingBox())!;
    expect(Math.round(titleBoxAfter.y)).toBe(Math.round(titleBoxBefore.y));

    // La fila de encabezados de día sigue visible, en el mismo lugar en
    // pantalla que antes de scrollear (esto es lo que fallaba: desaparecía).
    await expect(headerGutterCell(page)).toBeVisible();
    await expect(todayHeaderCell(page)).toBeVisible();
    const headerBoxAfter = (await headerGutterCell(page).boundingBox())!;
    const todayBoxAfter = (await todayHeaderCell(page).boundingBox())!;
    expect(Math.round(headerBoxAfter.y)).toBe(Math.round(headerBoxBefore.y));
    expect(Math.round(todayBoxAfter.y)).toBe(Math.round(todayBoxBefore.y));
  });

  test("scrollear horizontalmente mantiene cada encabezado de día alineado con su columna (D55 no se rompió)", async ({ page }) => {
    await loginFreshUser(page, "calendario-scroll-horizontal");
    await openCalendarView(page);

    await expect(todayHeaderCell(page)).toBeVisible();

    await page.evaluate(() => {
      const gutter = document.querySelector("[data-gutter-cell]");
      const scrollEl = gutter?.closest(".overflow-auto");
      if (scrollEl) scrollEl.scrollLeft += 300;
    });
    await page.waitForTimeout(150);

    const todayKey = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    const todayColumn = page.locator(`[data-date="${todayKey}"]`);
    const columnBox = (await todayColumn.boundingBox())!;
    const headerBox = (await todayHeaderCell(page).boundingBox())!;
    // El centro del encabezado tiene que caer dentro del ancho de su
    // columna, no desplazado por el scroll horizontal a mano
    // (`translateX`, D55).
    const headerCenterX = headerBox.x + headerBox.width / 2;
    expect(headerCenterX).toBeGreaterThanOrEqual(columnBox.x - 1);
    expect(headerCenterX).toBeLessThanOrEqual(columnBox.x + columnBox.width + 1);
  });

  test("arrastrar y redimensionar un bloque siguen cayendo donde corresponde con la grilla desplazada verticalmente", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { userId } = await loginFreshUser(page, "calendario-scroll-arrastre");

    const todayKey = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    const dragTitle = uniqueName("Bloque a mover");
    const resizeTitle = uniqueName("Bloque a redimensionar");
    // 22:00, bien fuera del área visible inicial (la grilla abre cerca de
    // la hora actual) para forzar que haga falta scrollear la grilla para
    // llegar a estos bloques.
    const dragTaskId = await seedTimedTask(userId, { title: dragTitle, dueDateKey: todayKey, startHour: 22, durationMinutes: 60 });
    const resizeTaskId = await seedTimedTask(userId, { title: resizeTitle, dueDateKey: todayKey, startHour: 20, durationMinutes: 60 });

    await openCalendarView(page);

    // 2100px: el final de la grilla (24h × 96px = 2304px), para revelar
    // los bloques de las 20 y las 22.
    await scrollTimeGrid(page, 2100);
    await page.waitForTimeout(150);

    const dragBlock = page.getByRole("button", { name: dragTitle });
    await expect(dragBlock).toBeVisible();

    // Mover el bloque 60px hacia arriba (~30 minutos a 96px/hora, ajustado
    // a cuarto de hora) dentro del mismo día.
    const dragBox = (await dragBlock.boundingBox())!;
    await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2 - 60, { steps: 8 });
    await page.waitForTimeout(80);
    await page.mouse.up();

    const admin = adminClient();
    await expect(async () => {
      const { data, error } = await admin.from("tasks").select("due_at").eq("id", dragTaskId).single();
      if (error || !data) throw new Error("no se pudo leer la tarea movida");
      // Se movió de las 22:00 hacia una hora anterior, sin saltar de día
      // (el offset correcto pese a la grilla desplegada verticalmente).
      expect(formatInTimeZone(data.due_at as string, TIMEZONE, "yyyy-MM-dd")).toBe(todayKey);
      expect(formatInTimeZone(data.due_at as string, TIMEZONE, "HH:mm")).not.toBe("22:00");
    }).toPass({ timeout: 5_000 });

    const resizeBlock = page.getByRole("button", { name: resizeTitle });
    await expect(resizeBlock).toBeVisible();
    const resizeContainer = page.locator("div.group", { has: resizeBlock });
    const resizeHandle = resizeContainer.locator('[role="presentation"]');
    const handleBox = (await resizeHandle.boundingBox())!;

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 48, { steps: 6 });
    await page.waitForTimeout(80);
    await page.mouse.up();

    await expect(async () => {
      const { data, error } = await admin.from("tasks").select("duration_minutes").eq("id", resizeTaskId).single();
      if (error || !data) throw new Error("no se pudo leer la tarea redimensionada");
      // Se estiró: la duración ya no es la original de 60 minutos.
      expect(data.duration_minutes).not.toBe(60);
    }).toPass({ timeout: 5_000 });
  });

  /** Abre el panel "Formato" y elige un `formato_calendario` (día/4 días/semana/mes). */
  async function selectCalendarFormat(page: Page, label: string): Promise<void> {
    await page.getByRole("button", { name: /^Formato/ }).click();
    await page.getByRole("combobox", { name: "Formato de calendario" }).click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await page.keyboard.press("Escape");
  }

  /** Abre el panel "Formato" y elige una `viewShape` (lista/panel/calendario). */
  async function selectViewShape(page: Page, label: string): Promise<void> {
    await page.getByRole("button", { name: /^Formato/ }).click();
    await page.getByRole("combobox", { name: "Forma de ver" }).click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await page.keyboard.press("Escape");
  }

  test("los cuatro formatos de calendario, las formas 'lista'/'panel', una pantalla de proyecto y la landing pública siguen funcionando", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const { userId } = await loginFreshUser(page, "calendario-scroll-smoke");
    await openCalendarView(page);

    // Los cuatro formatos de `CALENDAR_FORMAT_LABELS` (`lib/calendar/block.ts`):
    // ninguno de los wrappers tocados en el fix depende del formato, pero
    // los cuatro montan `time-grid.tsx`/`month-grid.tsx` distinto.
    for (const label of ["Día", "4 días", "Semana", "Mes"]) {
      await selectCalendarFormat(page, label);
      await expect(page.getByRole("heading", { name: "Próximos" })).toBeVisible();
    }

    // Formas "lista" y "panel": el header (título + `ViewOptionsBar`) tiene
    // que seguir fijo arriba y el contenido de abajo scrollear — mismo
    // wrapper de `main`/`app/(app)/layout.tsx` que la rama calendario.
    await selectViewShape(page, "Lista");
    await expect(page.getByRole("heading", { name: "Próximos" })).toBeVisible();
    await selectViewShape(page, "Panel");
    await expect(page.getByRole("heading", { name: "Próximos" })).toBeVisible();

    // Hoy, en su forma por defecto ("lista").
    await page.goto("/hoy");
    await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();

    // Una pantalla de proyecto (`sectioned-tasks.tsx`, el otro wrapper
    // tocado por el fix): la bandeja de entrada, que todo usuario nuevo
    // tiene.
    const admin = adminClient();
    const { data: inbox, error: inboxError } = await admin.from("projects").select("id").eq("user_id", userId).eq("is_inbox", true).single();
    if (inboxError || !inbox) throw new Error(`no se encontró la bandeja de entrada: ${inboxError?.message}`);
    await page.goto(`/proyecto/${inbox.id}`);
    await expect(page.getByRole("main")).toBeVisible();

    expect(pageErrors).toEqual([]);

    // Landing pública y login: nunca tocados por el fix (`app/layout.tsx`
    // queda intacto a propósito) — siguen scrolleando como página normal.
    await page.context().clearCookies();
    await page.goto("/");
    const landingScroll = await page.evaluate(() => ({
      scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
      clientHeight: document.scrollingElement?.clientHeight ?? 0,
    }));
    expect(landingScroll.scrollHeight).toBeGreaterThan(landingScroll.clientHeight);

    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });
});
