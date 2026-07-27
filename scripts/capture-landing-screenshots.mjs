// Saca las capturas reales de la app que usa la landing, con Playwright.
// No inventa nada: navega la app logueada como la cuenta demo que siembra
// scripts/seed-landing-demo.mjs y fotografía lo que ve un usuario real.
//
// Uso (con la app corriendo contra el Supabase LOCAL):
//   APP_URL=http://localhost:3000 \
//   DEMO_EMAIL=sofia.bianchi@example.com \
//   DEMO_PASSWORD=TrazioDemo2026! \
//   node scripts/capture-landing-screenshots.mjs
//
// Config del contexto de Playwright (evita el problema del intento
// anterior: Chrome oscureciendo la página según el tema del sistema):
//   - colorScheme forzado a "light", no depende del SO.
//   - deviceScaleFactor 2, para pantallas retina.
//   - viewport fijo por captura, para que dos corridas den lo mismo.
//   - networkidle antes de cada captura, y transiciones/animaciones
//     desactivadas por CSS inyectado, para que no salgan estados a medias.

import { chromium, expect } from "@playwright/test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const APP_URL = process.env.APP_URL;
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!APP_URL || !DEMO_EMAIL || !DEMO_PASSWORD) {
  console.error("Faltan APP_URL, DEMO_EMAIL y/o DEMO_PASSWORD.");
  process.exit(1);
}

const OUT_DIR = path.resolve(import.meta.dirname, "../public/landing");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE_CROP = { width: 480, height: 640 };
const SYNC_DESKTOP = { width: 1280, height: 800 };
const SYNC_MOBILE = { width: 390, height: 844 };

// Duraciones casi nulas en vez de `0ms`: algunas librerías de animación
// ignoran `0` pero respetan un valor positivo mínimo.
const NO_MOTION_CSS = `
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-delay: -0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    transition-delay: 0.001ms !important;
    scroll-behavior: auto !important;
  }
`;

async function newContext(browser, viewport) {
  return browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "es-AR",
  });
}

/** Red quieta + animaciones apagadas, antes de cualquier captura. */
async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: NO_MOTION_CSS });
  await page.waitForTimeout(150);
}

async function login(page) {
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel("Correo").fill(DEMO_EMAIL);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
  await settle(page);
}

// Next dev (Turbopack) compila cada ruta la primera vez que se visita, así
// que un `networkidle` inmediatamente después del click puede quedar
// satisfecho mientras la página todavía muestra el contenido anterior.
// Esperar el `<h1>` de la página de destino evita capturar ese estado a medias.
async function gotoNavLink(page, linkName, headingName = linkName) {
  await page.getByRole("link", { name: linkName }).first().click();
  await page.getByRole("heading", { name: headingName, level: 1 }).waitFor({ timeout: 20000 });
  await settle(page);
}

async function shoot(page, tmpDir, name, options = {}) {
  const tmpPath = path.join(tmpDir, `${name}.png`);
  await page.screenshot({ path: tmpPath, ...options });
  return tmpPath;
}

/**
 * Caja de una fila de tarea: la del `<li>` que la contiene, no la del botón
 * de título — el botón, centrado verticalmente dentro de una fila más alta
 * (ícono de prioridad, checkbox), da una caja angosta que corta la fila a
 * la mitad si se usa para calcular el borde inferior del recorte. Si el
 * locator no está dentro de un `<li>` (por ejemplo, un encabezado de
 * sección como "Atrasadas"), usa su propia caja.
 */
async function rowBox(locator) {
  const row = locator.locator("xpath=ancestor::li[1]");
  if ((await row.count()) > 0) return row.boundingBox();
  return locator.boundingBox();
}

/**
 * Recorte por región (capturas 3 y 6): un rectángulo real alrededor de dos
 * elementos — nada de adivinar coordenadas fijas. El ancho abraza la
 * columna de contenido (`max-w-content`, docs/design-system.md §5.1), no el
 * `<main>` completo (que incluye el margen que centra esa columna); el alto
 * es el exacto entre el techo del primer elemento y el piso del último,
 * con un margen chico.
 */
async function clipBetween(page, topLocator, bottomLocator, { topPad = 12, bottomPad = 20 } = {}) {
  await topLocator.scrollIntoViewIfNeeded();
  const column = topLocator.locator(
    "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' max-w-content ')][1]",
  );
  const columnBox = await column.boundingBox();
  const top = await rowBox(topLocator);
  const bottom = await rowBox(bottomLocator);
  const y = top.y - topPad;
  return { x: columnBox.x, y, width: columnBox.width, height: bottom.y + bottom.height + bottomPad - y };
}

/**
 * Recorte desde el techo de la página (o de un viewport ya reducido a un
 * ancho angosto) hasta justo antes de una fila que no tiene que entrar en
 * la captura (un afiche "Agregar tarea"/"Agregar subtarea", por ejemplo):
 * a diferencia de `clipBetween`, conserva el ancho completo del viewport
 * (panel lateral/barra inferior incluidos, no solo la columna de
 * contenido). El borde inferior sale del techo real de esa fila menos un
 * margen chico, no de un padding a ojo después de la última fila "buena"
 * — así no importa cuán apretado esté el espacio entre una cosa y la otra.
 */
async function clipBeforeRow(page, locator, { pad = 8 } = {}) {
  const viewport = page.viewportSize();
  const box = await rowBox(locator);
  return { x: 0, y: 0, width: viewport.width, height: box.y - pad };
}

/**
 * Recorte desde el techo de una fila (o encabezado) hasta el piso del
 * viewport, o hasta justo antes de otra fila si se pasa `bottomLocator`
 * (captura 5, prioridades y fechas: hay un afiche "Agregar tarea" propio
 * de la sección "Este mes" que, sin este segundo límite, entra en el
 * cuadro por abajo tan fácil como el de "Tareas" entraba por arriba).
 */
async function clipFromRow(page, locator, { pad = 12, bottomLocator = null, bottomPad = 8 } = {}) {
  const viewport = page.viewportSize();
  const box = await rowBox(locator);
  const y = box.y - pad;
  const bottom = bottomLocator ? (await rowBox(bottomLocator)).y - bottomPad : viewport.height;
  return { x: 0, y, width: viewport.width, height: bottom - y };
}

async function toWebp(tmpPath, outName) {
  const outPath = path.join(OUT_DIR, `${outName}.webp`);
  const image = sharp(tmpPath);
  await image.webp({ quality: 82 }).toFile(outPath);
  const { width, height } = await sharp(outPath).metadata();
  return { file: `${outName}.webp`, width, height };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const tmpDir = await mkdtemp(path.join(tmpdir(), "trazio-landing-"));
  const browser = await chromium.launch();
  const results = [];

  try {
    // --- Sesión principal, usada para las capturas 1 a 6 ---
    const context = await newContext(browser, DESKTOP);
    const page = await context.newPage();
    await login(page);

    // 1. Hoy — hero ancho, panel lateral visible, atrasadas arriba.
    await gotoNavLink(page, "Hoy");
    results.push(await toWebp(await shoot(page, tmpDir, "today-hero"), "today-hero"));

    // 2. Bandeja de entrada.
    await gotoNavLink(page, "Bandeja de entrada");
    results.push(await toWebp(await shoot(page, tmpDir, "inbox"), "inbox"));

    // 3. Hoy, recorte más cerrado: un rectángulo real desde "Atrasadas"
    // hasta la última tarea de "Hoy", sin panel lateral ni encabezado de
    // página — un primer plano de verdad, no la misma foto en una ventana
    // más chica.
    await gotoNavLink(page, "Hoy");
    const detailClip = await clipBetween(
      page,
      page.getByText("Atrasadas", { exact: true }),
      page.getByText("Comprar regalo para el cumple de Ana", { exact: true }),
    );
    results.push(
      await toWebp(await shoot(page, tmpDir, "today-detail", { clip: detailClip }), "today-detail"),
    );

    // 4. Proyectos y secciones — árbol del panel lateral + Casa con sus
    // secciones. Recortada justo antes del primer afiche "Agregar
    // subtarea" que sigue a "Envolver la vajilla" (la última fila de
    // contenido real): el espacio entre esa fila y el afiche es angosto,
    // así que se corta contra el propio afiche en vez de adivinar un
    // padding después de la fila buena. Acotado a `<main>` por la misma
    // razón que la captura 5: no mezclar con controles del layout que
    // compartan nombre accesible.
    await gotoNavLink(page, "Casa");
    const projectsClip = await clipBeforeRow(
      page,
      page.locator("main").getByRole("button", { name: "Agregar subtarea", exact: true }).first(),
    );
    results.push(
      await toWebp(await shoot(page, tmpDir, "projects-sections", { clip: projectsClip }), "projects-sections"),
    );

    // 5. Prioridades y fechas — recorte angosto (cruza a layout móvil, sin
    // panel lateral) para que los puntos de prioridad y las fechas queden
    // grandes y legibles. Arranca en el encabezado "Secciones", no en el
    // techo de la página: así queda afuera el bloque de tareas sin sección
    // ("Pasar la aspiradora" + su afiche "Agregar tarea"), que en este
    // viewport angosto cae dentro del cuadro si se empieza desde arriba.
    // Termina justo antes del "Agregar tarea" propio de "Este mes" (el
    // segundo de los tres "Agregar tarea" *de contenido* de esta página —
    // el primero es el de "Tareas", ya afuera por el borde superior; el
    // tercero es el de "Pendiente"), no en el piso del viewport: ese
    // afiche entra en cuadro (por debajo de "Sacar turno para el
    // dentista") si se deja el borde inferior libre. Acotado a `<main>`:
    // por debajo de este ancho la barra de navegación inferior aparece, y
    // su botón "Agregar" comparte el mismo nombre accesible ("Agregar
    // tarea") — sin acotar, cuenta como un cuarto resultado y corre todos
    // los índices.
    await page.setViewportSize(MOBILE_CROP);
    await settle(page);
    const main = page.locator("main");
    const prioritiesClip = await clipFromRow(
      page,
      main.getByRole("heading", { name: "Secciones", level: 2 }),
      { bottomLocator: main.getByRole("button", { name: "Agregar tarea", exact: true }).nth(1) },
    );
    results.push(
      await toWebp(await shoot(page, tmpDir, "priorities-dates", { clip: prioritiesClip }), "priorities-dates"),
    );
    await page.setViewportSize(DESKTOP);
    await settle(page);

    // 6. Subtareas — "Organizar la mudanza" ya viene expandida en 3 niveles
    // por defecto (TaskRow arranca con `collapsed = false`); todo el árbol
    // (Casa, con sus secciones) entra en un solo viewport, así que sin
    // recorte esta captura sería igual a la 4. El rectángulo va del padre
    // hasta la última subtarea de tercer nivel ("Envolver la vajilla"), no
    // hasta "Contratar el flete": ese hermano va *antes* que "Embalar la
    // cocina" en el sembrado justamente para que el afiche "Agregar
    // subtarea" que sigue a los hijos de "Embalar la cocina" quede después
    // del borde del recorte, no adentro.
    const subtasksClip = await clipBetween(
      page,
      page.getByRole("button", { name: "Organizar la mudanza", exact: true }),
      page.getByRole("button", { name: "Envolver la vajilla", exact: true }),
      { bottomPad: 12 },
    );
    results.push(await toWebp(await shoot(page, tmpDir, "subtasks", { clip: subtasksClip }), "subtasks"));

    await context.close();

    // --- Sesión aparte, para la sincronización en tiempo real (7) ---
    const contextA = await newContext(browser, SYNC_DESKTOP);
    const pageA = await contextA.newPage();
    await login(pageA);
    await gotoNavLink(pageA, "Trabajo");

    const contextB = await newContext(browser, SYNC_MOBILE);
    const pageB = await contextB.newPage();
    await login(pageB);
    await pageB.goto(pageA.url());
    await settle(pageB);

    const taskTitle = "Entregar informe de gastos";
    const checkboxA = pageA.getByRole("checkbox", { name: `Completar ${taskTitle}` });
    const checkboxB = pageB.getByRole("checkbox", { name: `Completar ${taskTitle}` });
    await checkboxA.scrollIntoViewIfNeeded();
    await checkboxB.scrollIntoViewIfNeeded();
    await checkboxA.click();

    // Si esto no propaga, el problema es real (Realtime roto) — se corta
    // acá y se reporta en vez de forzar una captura que no muestra nada.
    await expect(checkboxB).toHaveAttribute("aria-checked", "true", { timeout: 8000 });
    await settle(pageA);
    await settle(pageB);

    // Recorte hasta justo antes del afiche "Agregar tarea" de la lista sin
    // sección (el primero de los dos "Agregar tarea" de la página: el otro
    // es de "Sprint actual", más abajo): esa fila cae *entre* la tarea
    // sincronizada y "Secciones", así que ningún borde inferior más abajo
    // la deja afuera — hay que cortar antes de llegar a ella. Se sacrifica
    // mostrar "Sprint actual" en esta captura para que ningún afiche quede
    // dentro del cuadro; el contenido real de las secciones ya se ve en
    // projects-sections.webp y subtasks.webp. Acotado a `<main>`: el panel
    // B es angosto (390px, layout móvil), donde la barra de navegación
    // inferior está presente y su botón "Agregar" comparte el mismo
    // nombre accesible — sin acotar sería el primer resultado ahí.
    const addTaskRowA = pageA.locator("main").getByRole("button", { name: "Agregar tarea", exact: true }).first();
    const addTaskRowB = pageB.locator("main").getByRole("button", { name: "Agregar tarea", exact: true }).first();
    const shotA = await shoot(pageA, tmpDir, "sync-a", {
      clip: await clipBeforeRow(pageA, addTaskRowA),
    });
    const shotB = await shoot(pageB, tmpDir, "sync-b", {
      clip: await clipBeforeRow(pageB, addTaskRowB),
    });

    const imgA = sharp(shotA);
    const imgB = sharp(shotB);
    const [metaA, metaB] = await Promise.all([imgA.metadata(), imgB.metadata()]);
    const gap = 64;
    const padding = 40;
    const canvasWidth = metaA.width + gap + metaB.width + padding * 2;
    const canvasHeight = Math.max(metaA.height, metaB.height) + padding * 2;

    const composite = sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: "#FFFFFF",
      },
    }).composite([
      { input: shotA, left: padding, top: padding },
      { input: shotB, left: padding + metaA.width + gap, top: padding },
    ]);

    const syncOutPath = path.join(OUT_DIR, "sync.webp");
    await composite.webp({ quality: 82 }).toFile(syncOutPath);
    const syncMeta = await sharp(syncOutPath).metadata();
    results.push({ file: "sync.webp", width: syncMeta.width, height: syncMeta.height });

    await contextA.close();
    await contextB.close();
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true });
  }

  console.log("\nCapturas generadas en public/landing/:");
  for (const r of results) {
    console.log(`  ${r.file} — ${r.width}x${r.height}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
