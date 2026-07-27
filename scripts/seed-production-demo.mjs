// ⚠️⚠️⚠️ ESTE SCRIPT ESCRIBE EN LA BASE DE DATOS DE PRODUCCIÓN ⚠️⚠️⚠️
//
// NO es el seed local (ver scripts/seed-landing-demo.mjs, que solo corre
// contra localhost/127.0.0.1). Este apunta al proyecto de Supabase de
// producción (aqijvhoesjozstzojlzr) y siembra datos de prueba realistas
// en la cuenta YA EXISTENTE de juanmalosada01@gmail.com, para poder
// evaluar la interfaz con contenido real.
//
// NO borra ni modifica nada existente: no toca el proyecto "TEST", la
// tarea "Test" ni la Bandeja de entrada. Si algún nombre a sembrar
// colisionara con algo ya existente, hay que ajustarlo en este archivo
// antes de correr — el script no pisa datos.
//
// Es idempotente por las dudas: si ya existe un proyecto "Casa" para esta
// cuenta (evidencia de que ya se corrió), aborta sin insertar nada, para
// no duplicar la siembra por error.
//
// Uso (las credenciales salen de .env.local, nunca se loguean):
//   node --env-file=.env.local scripts/seed-production-demo.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = "juanmalosada01@gmail.com";
const PROD_PROJECT_REF = "aqijvhoesjozstzojlzr";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (¿corriste con --env-file=.env.local?).");
  process.exit(1);
}

// Guarda de seguridad inversa a la del seed local: este script se niega a
// correr contra cualquier proyecto que no sea el de producción conocido,
// para no sembrar por error contra otro entorno.
if (!SUPABASE_URL.includes(PROD_PROJECT_REF)) {
  console.error(
    `SUPABASE_URL (${SUPABASE_URL}) no corresponde al proyecto de producción esperado (${PROD_PROJECT_REF}). Abortando.`,
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function must(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

// --- Fechas, en huso horario de Buenos Aires (UTC-3, sin horario de verano) ---

const ART_OFFSET_HOURS = 3;

function argTodayParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

const today = argTodayParts();
const anchor = Date.UTC(today.year, today.month - 1, today.day);

function dateOnly(offsetDays) {
  const d = new Date(anchor + offsetDays * 86400000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function timestampAt(offsetDays, hour, minute = 0) {
  const d = new Date(anchor + offsetDays * 86400000);
  const utc = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    hour + ART_OFFSET_HOURS,
    minute,
  );
  return new Date(utc).toISOString();
}

// --- Descripciones jsonb (formato de documento de Tiptap) ---

function textDoc(paragraphs, bullets = []) {
  const content = paragraphs.map((text) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  }));
  if (bullets.length > 0) {
    content.push({
      type: "bulletList",
      content: bullets.map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    });
  }
  return { type: "doc", content };
}

const descPresentacion = textDoc(
  ["Presentación para el cliente sobre el avance del sprint. Repasar los números de conversión antes de armar las slides."],
  [
    "Actualizar el gráfico de usuarios activos",
    "Sumar el resumen de feedback de la última encuesta",
    "Revisar tiempos con Fede antes de mandarla",
  ],
);

const descVacaciones = textDoc(
  ["Comparar Aerolíneas Argentinas y Latam para la semana del 20 al 27. Anotar precios acá.", "Fechas ideales:"],
  ["Salida: viernes a la noche", "Vuelta: domingo siguiente"],
);

async function main() {
  console.log(`Sembrando datos de prueba en producción (${SUPABASE_URL})...`);

  // --- 1. Ubicar al usuario ya existente ---

  const { data: listed } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const owner = listed?.users.find((u) => u.email === OWNER_EMAIL);
  if (!owner) {
    throw new Error(`No se encontró un usuario con email ${OWNER_EMAIL} en auth.users.`);
  }
  const userId = owner.id;
  console.log(`Usuario encontrado: ${OWNER_EMAIL} (${userId})`);

  const inbox = must(
    await supabase.from("projects").select("id").eq("user_id", userId).eq("is_inbox", true).single(),
    "select inbox",
  );
  const inboxId = inbox.id;

  // --- 2. Guarda de idempotencia: no volver a sembrar si ya se corrió ---

  const { data: casaExistente } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Casa")
    .eq("is_inbox", false)
    .maybeSingle();
  if (casaExistente) {
    console.error('Ya existe un proyecto "Casa" en esta cuenta: parece que este script ya corrió. Abortando para no duplicar.');
    process.exit(1);
  }

  // --- 3. Proyectos (uno anidado a 3 niveles, uno favorito) ---

  let projectPosition = 100000;
  async function insertProject({ name, color, icon, parent_id = null, is_favorite = false }) {
    const row = must(
      await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name,
          color,
          icon,
          parent_id,
          is_favorite,
          position: (projectPosition += 1000),
        })
        .select("id")
        .single(),
      `insert project ${name}`,
    );
    return row.id;
  }

  const casaId = await insertProject({ name: "Casa", color: "turquesa", icon: "🏠", is_favorite: true });
  const trabajoId = await insertProject({ name: "Trabajo", color: "indigo", icon: "💼" });
  const clienteAcmeId = await insertProject({
    name: "Cliente Acme",
    color: "celeste",
    icon: "🧩",
    parent_id: trabajoId,
  });
  const sitioNuevoId = await insertProject({
    name: "Sitio nuevo",
    color: "violeta",
    icon: "🌐",
    parent_id: clienteAcmeId,
  });
  const estudioId = await insertProject({ name: "Estudio", color: "amarillo", icon: "📚" });
  const finanzasId = await insertProject({ name: "Finanzas", color: "verde", icon: "💰" });

  const insertedProjectIds = [casaId, trabajoId, clienteAcmeId, sitioNuevoId, estudioId, finanzasId];

  // --- 4. Secciones (en Casa y en Trabajo) ---

  let sectionPosition = 100000;
  async function insertSection(project_id, name) {
    const row = must(
      await supabase
        .from("sections")
        .insert({ user_id: userId, project_id, name, position: (sectionPosition += 1000) })
        .select("id")
        .single(),
      `insert section ${name}`,
    );
    return row.id;
  }

  const seccionEsteMes = await insertSection(casaId, "Este mes");
  const seccionPendiente = await insertSection(casaId, "Pendiente");
  const seccionSprintActual = await insertSection(trabajoId, "Sprint actual");
  const insertedSectionIds = [seccionEsteMes, seccionPendiente, seccionSprintActual];

  // --- 5. Etiquetas (reusa si ya existe una con el mismo nombre) ---

  async function insertLabel(name, color) {
    const { data: existing } = await supabase
      .from("labels")
      .select("id")
      .eq("user_id", userId)
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      console.log(`Etiqueta "${name}" ya existía, la reuso.`);
      return existing.id;
    }
    const row = must(
      await supabase.from("labels").insert({ user_id: userId, name, color }).select("id").single(),
      `insert label ${name}`,
    );
    return row.id;
  }

  const labelImportante = await insertLabel("Importante", "magenta");
  const labelCompras = await insertLabel("Compras", "amarillo");
  const labelUrgente = await insertLabel("Urgente", "celeste");
  const labelPersonal = await insertLabel("Personal", "violeta");

  // --- 6. Tareas ---

  const positionByProject = new Map();
  function nextPosition(project_id) {
    const next = (positionByProject.get(project_id) ?? 1000000) + 1000;
    positionByProject.set(project_id, next);
    return next;
  }

  const insertedTaskIds = [];
  const bucketCounts = {};
  const priorityCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let completedCount = 0;

  async function insertTask({
    bucket,
    title,
    project_id,
    section_id = null,
    parent_id = null,
    priority = 4,
    due_date = null,
    due_at = null,
    duration_minutes = null,
    deadline = null,
    completed_at = null,
    description = null,
    recurrence_rule = null,
    labels = [],
  }) {
    const row = must(
      await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          project_id,
          section_id,
          parent_id,
          title,
          description,
          priority,
          due_date,
          due_at,
          duration_minutes,
          deadline,
          completed_at,
          recurrence_rule,
          position: nextPosition(project_id),
        })
        .select("id")
        .single(),
      `insert task ${title}`,
    );
    if (labels.length > 0) {
      must(
        await supabase
          .from("task_labels")
          .insert(labels.map((label_id) => ({ task_id: row.id, label_id, user_id: userId }))),
        `insert task_labels for ${title}`,
      );
    }
    insertedTaskIds.push(row.id);
    bucketCounts[bucket] = (bucketCounts[bucket] ?? 0) + 1;
    priorityCounts[priority] += 1;
    if (completed_at) completedCount += 1;
    return row.id;
  }

  // Atrasadas, de distinta antigüedad
  await insertTask({
    bucket: "atrasadas",
    title: "Pagar el alquiler",
    project_id: finanzasId,
    priority: 1,
    due_date: dateOnly(-2),
    duration_minutes: 15,
    labels: [labelImportante],
  });
  await insertTask({
    bucket: "atrasadas",
    title: "Renovar la VTV",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 2,
    due_date: dateOnly(-5),
  });
  await insertTask({
    bucket: "atrasadas",
    title: "Renovar el seguro del auto",
    project_id: finanzasId,
    priority: 4,
    due_date: dateOnly(-9),
  });
  await insertTask({
    bucket: "atrasadas",
    title: "Devolver los libros a la biblioteca",
    project_id: estudioId,
    priority: 4,
    due_date: dateOnly(-15),
  });
  await insertTask({
    bucket: "atrasadas",
    title: "Mandar el presupuesto a un cliente nuevo",
    project_id: clienteAcmeId,
    priority: 2,
    due_date: dateOnly(-21),
  });

  // Hoy, con hora
  await insertTask({
    bucket: "hoy_con_hora",
    title: "Turno con el dentista",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 2,
    due_at: timestampAt(0, 10, 30),
    duration_minutes: 60,
    labels: [labelImportante],
  });
  await insertTask({
    bucket: "hoy_con_hora",
    title: "Reunión de standup",
    project_id: clienteAcmeId,
    priority: 4,
    due_at: timestampAt(0, 9, 0),
    duration_minutes: 30,
  });
  await insertTask({
    bucket: "hoy_con_hora",
    title: "Revisar el PR de Fede",
    project_id: trabajoId,
    section_id: seccionSprintActual,
    priority: 3,
    due_at: timestampAt(0, 15, 0),
    duration_minutes: 30,
  });

  // Hoy, todo el día
  await insertTask({
    bucket: "hoy_todo_el_dia",
    title: "Llamar al contador por el monotributo",
    project_id: finanzasId,
    priority: 1,
    due_date: dateOnly(0),
    labels: [labelUrgente],
  });
  await insertTask({
    bucket: "hoy_todo_el_dia",
    title: "Entregar la reseña del libro",
    project_id: estudioId,
    priority: 4,
    due_date: dateOnly(0),
  });
  await insertTask({
    bucket: "hoy_todo_el_dia",
    title: "Pasar la aspiradora",
    project_id: casaId,
    priority: 4,
    due_date: dateOnly(0),
  });
  await insertTask({
    bucket: "hoy_todo_el_dia",
    title: "Comprar el regalo para el cumple de Ana",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 3,
    due_date: dateOnly(0),
    labels: [labelCompras],
  });

  // Próximos días
  await insertTask({
    bucket: "proximos",
    title: "Entregar informe de gastos",
    project_id: trabajoId,
    priority: 2,
    due_date: dateOnly(6),
    duration_minutes: 45,
  });
  await insertTask({
    bucket: "proximos",
    title: "Rendir el parcial de Estadística",
    project_id: estudioId,
    priority: 1,
    due_date: dateOnly(7),
    duration_minutes: 120,
    labels: [labelUrgente],
  });
  await insertTask({
    bucket: "proximos",
    title: "Revisión técnica del auto",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 4,
    due_date: dateOnly(5),
  });
  await insertTask({
    bucket: "proximos",
    title: "Preparar la presentación para el viernes",
    project_id: trabajoId,
    section_id: seccionSprintActual,
    priority: 2,
    due_date: dateOnly(3),
    deadline: dateOnly(4),
    description: descPresentacion,
  });
  await insertTask({
    bucket: "proximos",
    title: "Mandar el reporte semanal a Acme",
    project_id: clienteAcmeId,
    priority: 4,
    due_date: dateOnly(2),
  });
  await insertTask({
    bucket: "proximos",
    title: "Pagar la cuota del gimnasio",
    project_id: casaId,
    priority: 4,
    due_date: dateOnly(4),
    recurrence_rule: "FREQ=MONTHLY",
  });
  await insertTask({
    bucket: "proximos",
    title: "Definir la paleta de colores del sitio",
    project_id: sitioNuevoId,
    priority: 4,
    due_date: dateOnly(8),
  });

  // Sin fecha, en la Bandeja de entrada
  await insertTask({
    bucket: "sin_fecha_inbox",
    title: "Leer el libro que me recomendó Pedro",
    project_id: inboxId,
    priority: 4,
  });
  await insertTask({
    bucket: "sin_fecha_inbox",
    title: "Buscar curso de inglés online",
    project_id: inboxId,
    priority: 4,
  });
  await insertTask({
    bucket: "sin_fecha_inbox",
    title: "Averiguar precio de pasajes para las vacaciones",
    project_id: inboxId,
    priority: 3,
    description: descVacaciones,
    labels: [labelPersonal],
  });
  await insertTask({
    bucket: "sin_fecha_inbox",
    title: "Actualizar el CV",
    project_id: inboxId,
    priority: 4,
    labels: [labelPersonal],
  });
  await insertTask({
    bucket: "sin_fecha_inbox",
    title: "Revisar los gastos de la tarjeta",
    project_id: inboxId,
    priority: 4,
    labels: [labelImportante],
  });
  await insertTask({
    bucket: "sin_fecha_inbox",
    title: "Renovar el pasaporte",
    project_id: inboxId,
    priority: 2,
    deadline: dateOnly(20),
  });

  // Completadas (para la vista "Completado")
  await insertTask({
    bucket: "completadas",
    title: "Pagar la tarjeta de crédito",
    project_id: finanzasId,
    priority: 4,
    due_date: dateOnly(-10),
    completed_at: timestampAt(-9, 12, 0),
  });
  await insertTask({
    bucket: "completadas",
    title: "Sacar turno para el dentista",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 4,
    due_date: dateOnly(-3),
    completed_at: timestampAt(-3, 18, 30),
  });
  await insertTask({
    bucket: "completadas",
    title: "Entregar el trabajo práctico de Estadística",
    project_id: estudioId,
    priority: 2,
    due_date: dateOnly(-12),
    completed_at: timestampAt(-11, 20, 0),
  });
  await insertTask({
    bucket: "completadas",
    title: "Actualizar el tablero de Jira",
    project_id: clienteAcmeId,
    priority: 4,
    completed_at: timestampAt(-2, 11, 0),
  });
  await insertTask({
    bucket: "completadas",
    title: "Comprar cajas y cinta para embalar",
    project_id: casaId,
    priority: 4,
    completed_at: timestampAt(-1, 9, 0),
    labels: [labelCompras],
  });

  // Tarea con subtareas anidadas de 3 niveles
  const mudanzaId = await insertTask({
    bucket: "subtareas",
    title: "Organizar la mudanza",
    project_id: casaId,
    section_id: seccionPendiente,
    priority: 3,
  });
  await insertTask({
    bucket: "subtareas",
    title: "Contratar el flete",
    project_id: casaId,
    parent_id: mudanzaId,
    priority: 4,
  });
  const embalarId = await insertTask({
    bucket: "subtareas",
    title: "Embalar la cocina",
    project_id: casaId,
    parent_id: mudanzaId,
    priority: 4,
  });
  await insertTask({
    bucket: "subtareas",
    title: "Comprar cajas y cinta",
    project_id: casaId,
    parent_id: embalarId,
    priority: 4,
    labels: [labelCompras],
  });
  await insertTask({
    bucket: "subtareas",
    title: "Envolver la vajilla",
    project_id: casaId,
    parent_id: embalarId,
    priority: 4,
  });

  // --- 7. Verificación ---

  console.log("\n--- Siembra completa ---");
  console.log(`Proyectos creados: ${insertedProjectIds.length}`);
  console.log(`Secciones creadas: ${insertedSectionIds.length}`);
  console.log(`Tareas creadas: ${insertedTaskIds.length}`);
  console.log("Tareas por categoría:", bucketCounts);
  console.log("Tareas por prioridad:", priorityCounts);
  console.log(`Tareas completadas: ${completedCount}`);

  const { count: taskLabelCount, error: taskLabelError } = await supabase
    .from("task_labels")
    .select("*", { count: "exact", head: true })
    .in("task_id", insertedTaskIds);
  if (taskLabelError) throw new Error(`count task_labels: ${taskLabelError.message}`);
  console.log(`Asignaciones de etiquetas (task_labels) sobre tareas sembradas: ${taskLabelCount}`);

  const testProject = must(
    await supabase.from("projects").select("id, name, is_archived").eq("user_id", userId).eq("name", "TEST"),
    "verify TEST project",
  );
  const testTask = must(
    await supabase.from("tasks").select("id, title, completed_at").eq("user_id", userId).eq("title", "Test"),
    "verify Test task",
  );
  const inboxCheck = must(
    await supabase.from("projects").select("id, name, is_inbox, is_archived").eq("id", inboxId).single(),
    "verify inbox",
  );

  console.log("\n--- Verificación de datos preexistentes ---");
  console.log(
    testProject.length === 1
      ? `OK: proyecto "TEST" sigue existiendo (id ${testProject[0].id}, archivado: ${testProject[0].is_archived}).`
      : `ATENCIÓN: se esperaba encontrar exactamente 1 proyecto "TEST" y se encontraron ${testProject.length}.`,
  );
  console.log(
    testTask.length === 1
      ? `OK: tarea "Test" sigue existiendo (id ${testTask[0].id}, completada: ${Boolean(testTask[0].completed_at)}).`
      : `ATENCIÓN: se esperaba encontrar exactamente 1 tarea "Test" y se encontraron ${testTask.length}.`,
  );
  console.log(
    inboxCheck.is_inbox && !inboxCheck.is_archived
      ? `OK: la Bandeja de entrada sigue intacta (is_inbox: true, is_archived: false).`
      : `ATENCIÓN: la Bandeja de entrada cambió de estado (is_inbox: ${inboxCheck.is_inbox}, is_archived: ${inboxCheck.is_archived}).`,
  );

  console.log("\nListo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
