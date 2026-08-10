/**
 * Tests de la Ola 2 de `servidor-mcp` (D-F de design.md): `position` se
 * vuelve opcional al insertar en `tasks`, `projects` y `sections`. Cuando
 * no se manda, un trigger `BEFORE INSERT` la completa con
 * `último hermano + 1000`, agrupando por el mismo criterio que usa el
 * cliente (`lib/tasks/tree.ts`, `lib/projects/tree.ts`). Cuando sí se
 * manda, se respeta tal cual — es la garantía de que el camino optimista
 * del navegador no se rompió.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLocalSupabaseEnv } from "./env";
import { unwrap } from "./helpers";

const env = getLocalSupabaseEnv();

const admin = createClient(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestUser {
  id: string;
  client: SupabaseClient;
}

async function createTestUser(label: string): Promise<TestUser> {
  const email = `position-default-${label}-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba "${label}": ${error?.message}`);
  }

  const client = createClient(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`No se pudo iniciar sesión con "${label}": ${signInError.message}`);
  }

  return { id: data.user.id, client };
}

async function createProject(user: TestUser, name: string, position: number | null = null) {
  return user.client
    .from("projects")
    .insert({ user_id: user.id, name, color: "celeste", position })
    .select("id, position")
    .single();
}

async function createSection(user: TestUser, projectId: string, name: string, position: number | null = null) {
  return user.client
    .from("sections")
    .insert({ user_id: user.id, project_id: projectId, name, position })
    .select("id, position")
    .single();
}

async function createTask(
  user: TestUser,
  fields: {
    projectId: string;
    sectionId?: string | null;
    parentId?: string | null;
    title: string;
    position?: number | null;
  },
) {
  return user.client
    .from("tasks")
    .insert({
      user_id: user.id,
      project_id: fields.projectId,
      section_id: fields.sectionId ?? null,
      parent_id: fields.parentId ?? null,
      title: fields.title,
      position: fields.position ?? null,
    })
    .select("id, position")
    .single();
}

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("a");
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("position por defecto: projects", () => {
  it("sin hermanos, la primera fila cae en 1000", async () => {
    const { data, error } = await createProject(user, "Proyecto raíz sin position");
    expect(error).toBeNull();
    expect(data?.position).toBe(1000);
  });

  it("con un hermano ya creado, la siguiente cae 1000 después", async () => {
    const { data: parentData, error: parentError } = await createProject(user, "Padre para hermanos");
    const parent = unwrap(parentData, parentError, "Padre para hermanos");

    const { data: child1, error: e1 } = await user.client
      .from("projects")
      .insert({ user_id: user.id, name: "Hijo 1", color: "celeste", parent_id: parent.id, position: null })
      .select("id, position")
      .single();
    expect(e1).toBeNull();
    expect(child1?.position).toBe(1000);

    const { data: child2, error: e2 } = await user.client
      .from("projects")
      .insert({ user_id: user.id, name: "Hijo 2", color: "celeste", parent_id: parent.id, position: null })
      .select("id, position")
      .single();
    expect(e2).toBeNull();
    expect(child2?.position).toBe(2000);
  });

  it("un insert que manda position la respeta tal cual", async () => {
    const { data, error } = await createProject(user, "Proyecto con position explícita", 555.5);
    expect(error).toBeNull();
    expect(data?.position).toBe(555.5);
  });
});

describe("position por defecto: sections", () => {
  it("sin hermanas, la primera cae en 1000; la segunda, 1000 después", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para secciones");
    const project = unwrap(projectData, projectError, "Proyecto para secciones");

    const { data: s1, error: e1 } = await createSection(user, project.id, "Sección 1");
    expect(e1).toBeNull();
    expect(s1?.position).toBe(1000);

    const { data: s2, error: e2 } = await createSection(user, project.id, "Sección 2");
    expect(e2).toBeNull();
    expect(s2?.position).toBe(2000);
  });

  it("dos proyectos distintos no se pisan: cada uno arranca en 1000", async () => {
    const { data: projectAData, error: projectAError } = await createProject(user, "Proyecto A para secciones");
    const projectA = unwrap(projectAData, projectAError, "Proyecto A");
    const { data: projectBData, error: projectBError } = await createProject(user, "Proyecto B para secciones");
    const projectB = unwrap(projectBData, projectBError, "Proyecto B");

    const { data: sa } = await createSection(user, projectA.id, "Sección de A");
    const { data: sb } = await createSection(user, projectB.id, "Sección de B");

    expect(sa?.position).toBe(1000);
    expect(sb?.position).toBe(1000);
  });

  it("un insert que manda position la respeta tal cual", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para sección explícita");
    const project = unwrap(projectData, projectError, "Proyecto");

    const { data, error } = await createSection(user, project.id, "Sección con position explícita", 42);
    expect(error).toBeNull();
    expect(data?.position).toBe(42);
  });
});

describe("position por defecto: tasks", () => {
  it("primer nivel: sin hermanas cae en 1000, la siguiente en 2000", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para tareas");
    const project = unwrap(projectData, projectError, "Proyecto");
    const { data: sectionData, error: sectionError } = await createSection(user, project.id, "Sección para tareas");
    const section = unwrap(sectionData, sectionError, "Sección");

    const { data: t1, error: e1 } = await createTask(user, { projectId: project.id, sectionId: section.id, title: "T1" });
    expect(e1).toBeNull();
    expect(t1?.position).toBe(1000);

    const { data: t2, error: e2 } = await createTask(user, { projectId: project.id, sectionId: section.id, title: "T2" });
    expect(e2).toBeNull();
    expect(t2?.position).toBe(2000);
  });

  it("dos secciones del mismo proyecto no se pisan", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto con dos secciones");
    const project = unwrap(projectData, projectError, "Proyecto");
    const { data: sectionAData, error: sectionAError } = await createSection(user, project.id, "Sección A");
    const sectionA = unwrap(sectionAData, sectionAError, "Sección A");
    const { data: sectionBData, error: sectionBError } = await createSection(user, project.id, "Sección B");
    const sectionB = unwrap(sectionBData, sectionBError, "Sección B");

    const { data: ta } = await createTask(user, { projectId: project.id, sectionId: sectionA.id, title: "Tarea en A" });
    const { data: tb } = await createTask(user, { projectId: project.id, sectionId: sectionB.id, title: "Tarea en B" });

    expect(ta?.position).toBe(1000);
    expect(tb?.position).toBe(1000);
  });

  it("subtarea anidada usa el contexto de parent_id, no el de la sección de origen", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para anidado");
    const project = unwrap(projectData, projectError, "Proyecto");
    const { data: sectionData, error: sectionError } = await createSection(user, project.id, "Sección de origen");
    const section = unwrap(sectionData, sectionError, "Sección");
    const { data: parentData, error: parentError } = await createTask(user, {
      projectId: project.id,
      sectionId: section.id,
      title: "Tarea padre",
    });
    const parent = unwrap(parentData, parentError, "Tarea padre");

    // Ya hay una tarea de primer nivel en (project, section) con position
    // 1000 (la propia `parent`). Una subtarea de `parent` es un contexto
    // distinto (mismo parent_id, no mismo section_id) y debe arrancar en
    // 1000 también, no en 2000.
    const { data: sub1, error: e1 } = await createTask(user, { projectId: project.id, parentId: parent.id, title: "Subtarea 1" });
    expect(e1).toBeNull();
    expect(sub1?.position).toBe(1000);

    const { data: sub2, error: e2 } = await createTask(user, { projectId: project.id, parentId: parent.id, title: "Subtarea 2" });
    expect(e2).toBeNull();
    expect(sub2?.position).toBe(2000);

    // Una segunda tarea de primer nivel en la misma sección sigue el
    // contexto de sección, ajeno al de las subtareas de `parent`.
    const { data: topLevel2, error: e3 } = await createTask(user, {
      projectId: project.id,
      sectionId: section.id,
      title: "Segunda tarea de primer nivel",
    });
    expect(e3).toBeNull();
    expect(topLevel2?.position).toBe(2000);
  });

  it("un insert que manda position la respeta tal cual", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para tarea explícita");
    const project = unwrap(projectData, projectError, "Proyecto");

    const { data, error } = await createTask(user, {
      projectId: project.id,
      title: "Tarea con position explícita",
      position: 777,
    });
    expect(error).toBeNull();
    expect(data?.position).toBe(777);
  });
});
