// Siembra una cuenta de prueba con datos realistas en el Supabase LOCAL,
// para sacar capturas de pantalla de la landing. Re-ejecutable: si la
// cuenta ya existe, la borra (auth.users en cascada se lleva el resto) y
// la vuelve a crear desde cero.
//
// Uso:
//   SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/seed-landing-demo.mjs
//
// Guarda de seguridad: se niega a correr contra cualquier URL que no sea
// localhost/127.0.0.1, para no pisar nunca el Supabase de producción.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(SUPABASE_URL)) {
  console.error(
    `SUPABASE_URL no parece local (${SUPABASE_URL}). Este script solo corre contra localhost/127.0.0.1.`,
  );
  process.exit(1);
}

const DEMO_EMAIL = "sofia.bianchi@example.com";
const DEMO_PASSWORD = "TrazioDemo2026!";

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

// Ancla en UTC de medianoche del día actual en Buenos Aires. Sirve para
// sumar/restar días con aritmética simple sin líos de zona horaria.
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

async function main() {
  console.log(`Sembrando contra ${SUPABASE_URL}...`);

  // --- 1. Cuenta de prueba (re-ejecutable) ---

  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingUsers?.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    console.log(`Usuario ${DEMO_EMAIL} ya existe (${existing.id}), lo borro para re-sembrar.`);
    must(await supabase.auth.admin.deleteUser(existing.id), "auth.admin.deleteUser");
  }

  const created = must(
    await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Sofía Bianchi" },
    }),
    "auth.admin.createUser",
  );
  const userId = created.user.id;
  console.log(`Usuario creado: ${DEMO_EMAIL} (${userId})`);

  // El trigger on_auth_user_created ya creó profile, user_preferences y la
  // Bandeja de entrada. La recuperamos.
  const inbox = must(
    await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .eq("is_inbox", true)
      .single(),
    "select inbox",
  );
  const inboxId = inbox.id;

  // --- 2. Proyectos ---

  let projectPosition = 1000;
  async function insertProject({ name, color, icon, parent_id = null }) {
    const row = must(
      await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name,
          color,
          icon,
          parent_id,
          position: (projectPosition += 1000),
        })
        .select("id")
        .single(),
      `insert project ${name}`,
    );
    return row.id;
  }

  const casaId = await insertProject({ name: "Casa", color: "turquesa", icon: "🏠" });
  const trabajoId = await insertProject({ name: "Trabajo", color: "indigo", icon: "💼" });
  const clienteAcmeId = await insertProject({
    name: "Cliente Acme",
    color: "celeste",
    icon: "🧩",
    parent_id: trabajoId,
  });
  const estudioId = await insertProject({ name: "Estudio", color: "violeta", icon: "📚" });
  const finanzasId = await insertProject({ name: "Finanzas", color: "verde", icon: "💰" });

  // --- 3. Secciones (dentro de Casa) ---

  let sectionPosition = 1000;
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

  // --- 4. Etiquetas ---

  async function insertLabel(name, color) {
    const row = must(
      await supabase.from("labels").insert({ user_id: userId, name, color }).select("id").single(),
      `insert label ${name}`,
    );
    return row.id;
  }

  const labelImportante = await insertLabel("Importante", "magenta");
  const labelCompras = await insertLabel("Compras", "amarillo");

  // --- 5. Tareas ---

  const positionByProject = new Map();
  function nextPosition(project_id) {
    const next = (positionByProject.get(project_id) ?? 0) + 1000;
    positionByProject.set(project_id, next);
    return next;
  }

  async function insertTask({
    title,
    project_id,
    section_id = null,
    parent_id = null,
    priority = 4,
    due_date = null,
    due_at = null,
    duration_minutes = null,
    completed_at = null,
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
          priority,
          due_date,
          due_at,
          duration_minutes,
          completed_at,
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
    return row.id;
  }

  // Atrasadas
  await insertTask({
    title: "Pagar el alquiler",
    project_id: finanzasId,
    priority: 1,
    due_date: dateOnly(-3),
    duration_minutes: 15,
    labels: [labelImportante],
  });
  await insertTask({
    title: "Renovar la VTV",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 2,
    due_date: dateOnly(-1),
  });
  await insertTask({
    title: "Renovar el seguro del auto",
    project_id: finanzasId,
    priority: 2,
    due_date: dateOnly(-2),
  });
  await insertTask({
    title: "Devolver los libros a la biblioteca",
    project_id: estudioId,
    priority: 3,
    due_date: dateOnly(-2),
  });
  await insertTask({
    title: "Mandar el presupuesto a un cliente nuevo",
    project_id: clienteAcmeId,
    priority: 2,
    due_date: dateOnly(-4),
  });

  // Hoy, con hora
  await insertTask({
    title: "Turno con el dentista",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 2,
    due_at: timestampAt(0, 10, 30),
    duration_minutes: 60,
    labels: [labelImportante],
  });
  await insertTask({
    title: "Reunión de standup",
    project_id: clienteAcmeId,
    priority: 3,
    due_at: timestampAt(0, 9, 0),
    duration_minutes: 30,
  });
  await insertTask({
    title: "Revisar el PR de Fede",
    project_id: trabajoId,
    section_id: seccionSprintActual,
    priority: 2,
    due_at: timestampAt(0, 15, 0),
    duration_minutes: 30,
  });

  // Hoy, todo el día
  await insertTask({
    title: "Llamar al contador por el monotributo",
    project_id: finanzasId,
    priority: 1,
    due_date: dateOnly(0),
  });
  await insertTask({
    title: "Entregar la reseña del libro",
    project_id: estudioId,
    priority: 3,
    due_date: dateOnly(0),
  });
  await insertTask({
    title: "Pasar la aspiradora",
    project_id: casaId,
    priority: 4,
    due_date: dateOnly(0),
  });
  await insertTask({
    title: "Comprar regalo para el cumple de Ana",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 3,
    due_date: dateOnly(0),
    labels: [labelCompras],
  });

  // Semana que viene
  await insertTask({
    title: "Entregar informe de gastos",
    project_id: trabajoId,
    priority: 2,
    due_date: dateOnly(6),
    duration_minutes: 45,
  });
  await insertTask({
    title: "Rendir el parcial de Estadística",
    project_id: estudioId,
    priority: 1,
    due_date: dateOnly(7),
    duration_minutes: 120,
  });
  await insertTask({
    title: "Revisión técnica del auto",
    project_id: casaId,
    section_id: seccionEsteMes,
    priority: 1,
    due_date: dateOnly(5),
  });
  await insertTask({
    title: "Preparar la presentación para el viernes",
    project_id: trabajoId,
    section_id: seccionSprintActual,
    priority: 2,
    due_date: dateOnly(3),
  });
  await insertTask({
    title: "Mandar el reporte semanal a Acme",
    project_id: clienteAcmeId,
    priority: 3,
    due_date: dateOnly(2),
  });

  // Sin fecha
  await insertTask({ title: "Leer el libro que me recomendó Pedro", project_id: inboxId });
  await insertTask({ title: "Buscar curso de inglés online", project_id: inboxId });
  await insertTask({
    title: "Averiguar precio de pasajes para las vacaciones",
    project_id: inboxId,
  });
  await insertTask({
    title: "Actualizar el CV",
    project_id: trabajoId,
    section_id: seccionSprintActual,
    priority: 4,
  });
  await insertTask({
    title: "Subir la propuesta a Notion",
    project_id: trabajoId,
    section_id: seccionSprintActual,
    priority: 3,
  });
  await insertTask({
    title: "Actualizar el tablero de Jira",
    project_id: clienteAcmeId,
    priority: 4,
  });
  await insertTask({
    title: "Anotarme al curso de Excel avanzado",
    project_id: estudioId,
    priority: 4,
  });
  await insertTask({
    title: "Revisar los gastos de la tarjeta",
    project_id: finanzasId,
    priority: 4,
  });

  // Completadas
  await insertTask({
    title: "Pagar la tarjeta de crédito",
    project_id: finanzasId,
    due_date: dateOnly(-5),
    completed_at: timestampAt(-4, 12, 0),
  });
  await insertTask({
    title: "Sacar turno para el dentista",
    project_id: casaId,
    section_id: seccionEsteMes,
    due_date: dateOnly(-1),
    completed_at: timestampAt(-1, 18, 30),
  });
  await insertTask({
    title: "Entregar el trabajo práctico de Estadística",
    project_id: estudioId,
    due_date: dateOnly(-6),
    completed_at: timestampAt(-5, 20, 0),
  });

  // Tarea con subtareas anidadas en 3 niveles. "Contratar el flete" va
  // *antes* que "Embalar la cocina" a propósito (script de capturas,
  // subtasksClip): así el afiche "Agregar subtarea" que sigue a los hijos
  // de "Embalar la cocina" queda al final del árbol, después del último
  // hermano visible, no en el medio.
  const mudanzaId = await insertTask({
    title: "Organizar la mudanza",
    project_id: casaId,
    section_id: seccionPendiente,
    priority: 3,
  });
  await insertTask({
    title: "Contratar el flete",
    project_id: casaId,
    parent_id: mudanzaId,
  });
  const embalarId = await insertTask({
    title: "Embalar la cocina",
    project_id: casaId,
    parent_id: mudanzaId,
  });
  await insertTask({
    title: "Comprar cajas y cinta",
    project_id: casaId,
    parent_id: embalarId,
    labels: [labelCompras],
  });
  await insertTask({
    title: "Envolver la vajilla",
    project_id: casaId,
    parent_id: embalarId,
  });

  console.log("Listo.");
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
