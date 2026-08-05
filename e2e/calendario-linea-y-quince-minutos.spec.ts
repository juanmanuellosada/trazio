import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { openCalendarView } from "./helpers/calendar";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./helpers/env";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

// Verificación manual (no forma parte del gate) de `calendario-legible-y-manipulable`,
// grupo 1 y el defecto de legibilidad de quince minutos encontrado al hacerlo:
// - La línea de la hora actual se movía nunca (se resolvía una sola vez al
//   montar). Acá se prueba que avanza sola, en el navegador real, sin volver
//   a cargar la página — y que es roja, no el color de marca.
// - Un bloque de quince minutos medía 12px y no entraba ni una línea de
//   texto: se prueba que convive legible junto a bloques de media hora, una
//   hora y tres horas, y que el control de completar sigue siendo clickeable.

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

const TODAY = new Date().toISOString().slice(0, 10);

const BLOCKS = [
  { minutes: 15, startHour: 9, title: "Quince minutos" },
  { minutes: 30, startHour: 10, title: "Treinta minutos" },
  { minutes: 60, startHour: 11, title: "Sesenta minutos" },
  { minutes: 180, startHour: 14, title: "Ciento ochenta minutos" },
];

test("la línea de la hora actual avanza sola y es roja; quince/treinta/sesenta/ciento ochenta minutos conviven legibles", async ({ page }) => {
  test.setTimeout(180_000);

  const email = uniqueEmail("calendario-legible");
  const user = await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Test") });
  if (!user) throw new Error("no se pudo crear el usuario de prueba");

  const admin = adminClient();
  const { data: inbox, error: inboxError } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_inbox", true)
    .single();
  if (inboxError || !inbox) throw new Error(`no se encontró la bandeja de entrada: ${inboxError?.message}`);

  const { error: tasksError } = await admin.from("tasks").insert(
    BLOCKS.map((b, index) => ({
      title: b.title,
      project_id: inbox.id,
      user_id: user.id,
      position: index,
      due_at: `${TODAY}T${String(b.startHour).padStart(2, "0")}:00:00-03:00`,
      duration_minutes: b.minutes,
    })),
  );
  if (tasksError) throw new Error(`no se pudieron sembrar las tareas: ${tasksError.message}`);

  await login(page, { email, password: PASSWORD });
  await openCalendarView(page);

  // Próximos arranca en formato "semana" (`defaultOptionsForViewKey`); se
  // pasa a "Día" para ver los cuatro bloques uno junto al otro, sin repartir
  // el ancho entre columnas de otros días.
  await page.getByRole("button", { name: /^Formato/ }).click();
  await page.getByRole("combobox", { name: "Formato de calendario" }).click();
  await page.getByRole("option", { name: "Día", exact: true }).click();
  await page.keyboard.press("Escape");

  for (const b of BLOCKS) await expect(page.getByRole("button", { name: b.title })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/calendario-legible-claro-ancho.png" });

  // El control de completar del bloque de quince minutos: usable, no
  // decorativo — visible, con un objetivo de clic real (no unos pocos
  // píxeles) y sin disparar el resto del bloque (`onSelect`) al tocarlo. El
  // cableado a la mutación real de completar es de otra tanda del cambio
  // (ver el comentario de `calendar-block-chip.tsx`), así que acá no hay
  // `aria-checked` que verificar todavía — solo que el gancho es clickeable
  // sin abrir el detalle de la tarea.
  const fifteenBlock = page.getByRole("button", { name: "Quince minutos" });
  const checkbox = fifteenBlock.getByRole("checkbox");
  await expect(checkbox).toBeVisible();
  const box = await checkbox.boundingBox();
  if (!box) throw new Error("no se pudo medir el control de completar");
  expect(box.width).toBeGreaterThanOrEqual(10);
  expect(box.height).toBeGreaterThanOrEqual(10);
  await checkbox.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // La línea de la hora actual: roja (no el color de marca) y en movimiento —
  // dos mediciones separadas por tiempo real, sin recargar la pantalla.
  const dot = page.locator(".bg-destructive").first();
  await expect(dot).toBeVisible();
  await expect(dot).not.toHaveClass(/bg-primary/);
  const firstBox = await dot.boundingBox();
  if (!firstBox) throw new Error("no se pudo medir la línea de la hora actual");

  await page.waitForTimeout(65_000);

  const secondBox = await dot.boundingBox();
  if (!secondBox) throw new Error("no se pudo medir la línea de la hora actual (segunda vez)");
  expect(secondBox.y).toBeGreaterThan(firstBox.y);

  // 390px, todavía en tema claro.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/calendario-legible-claro-390.png" });
  await page.setViewportSize({ width: 1440, height: 900 });

  // Tema oscuro: no alcanza con `localStorage` (se pisa al recargar con la
  // preferencia guardada), así que se cambia desde el selector real — que sí
  // persiste en `user_preferences.theme` — y se recarga para confirmarlo.
  await page.getByRole("button", { name: "Menú de cuenta" }).click();
  const temaTrigger = page.getByRole("menuitem", { name: /^Tema/ });
  await temaTrigger.click();

  // `.click()`/`.hover()` saltan directo a destino en vez de recorrer el
  // camino, y ese salto dispara un defecto conocido de Base UI en Chrome
  // (`guardStaleOpen`, ver `MenuSubmenuTrigger`): confunde el salto con el
  // mouse saliendo del submenú y lo cierra solo, milisegundos después de
  // abrirlo. No pasa con una persona real moviendo el mouse (confirmado a
  // mano) — es un artefacto de cómo Playwright mueve el cursor, así que la
  // solución es moverlo en varios pasos, como lo haría una mano de verdad,
  // en vez de escondar el cierre con una espera.
  const temaBox = await temaTrigger.boundingBox();
  const oscuro = page.getByRole("menuitem", { name: "Oscuro" });
  const oscuroBox = await oscuro.boundingBox();
  if (!temaBox || !oscuroBox) throw new Error("no se pudieron medir el submenú de tema");
  await page.mouse.move(temaBox.x + temaBox.width / 2, temaBox.y + temaBox.height / 2);
  await page.mouse.move(oscuroBox.x + oscuroBox.width / 2, oscuroBox.y + oscuroBox.height / 2, { steps: 15 });
  await oscuro.click();
  await page.keyboard.press("Escape");
  await page.reload();

  for (const b of BLOCKS) await expect(page.getByRole("button", { name: b.title })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/calendario-legible-oscuro-ancho.png" });
});
