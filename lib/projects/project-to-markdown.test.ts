import { describe, expect, it } from "vitest";
import type { Json } from "@/lib/supabase/database.types";
import type { TaskRow } from "@/lib/tasks/task-columns";
import type { SectionRow } from "@/lib/sections/use-sections";
import { projectToMarkdown } from "./project-to-markdown";

function task(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    project_id: "p1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 0,
    labels: [],
    ...overrides,
  };
}

function section(overrides: Partial<SectionRow> & { id: string }): SectionRow {
  return {
    project_id: "p1",
    name: "Sección",
    description: null,
    position: 0,
    is_collapsed: false,
    ...overrides,
  };
}

/** doc de Tiptap con un único párrafo de texto plano. */
function paragraphDoc(text: string): Json {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] } as unknown as Json;
}

/** doc de Tiptap: "before" + una porción en negrita + "after", en un único párrafo. */
function boldParagraphDoc(before: string, bold: string, after: string): Json {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: before },
          { type: "text", text: bold, marks: [{ type: "bold" }] },
          { type: "text", text: after },
        ],
      },
    ],
  } as unknown as Json;
}

/** doc de Tiptap con una nota al pie: un párrafo que la referencia y la lista que la define. */
function footnoteDoc(number: number, noteText: string): Json {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Ver nota" }, { type: "footnoteReference", attrs: { id: `fn${number}`, number } }],
      },
      {
        type: "footnoteList",
        content: [
          {
            type: "footnoteItem",
            attrs: { id: `fn${number}` },
            content: [{ type: "paragraph", content: [{ type: "text", text: noteText }] }],
          },
        ],
      },
    ],
  } as unknown as Json;
}

describe("projectToMarkdown", () => {
  it("un proyecto vacío se copia igual, no es un error", () => {
    const md = projectToMarkdown({ project: { name: "Vacío", description: null }, sections: [], tasks: [], descriptions: {} });
    expect(md).toBe("# Vacío\n");
  });

  it("la descripción del proyecto sale como párrafo debajo del H1", () => {
    const md = projectToMarkdown({
      project: { name: "Mudanza", description: "Antes del 15 de septiembre." },
      sections: [],
      tasks: [],
      descriptions: {},
    });
    expect(md).toBe("# Mudanza\n\nAntes del 15 de septiembre.\n");
  });

  it("las tareas sin sección van antes del primer ##", () => {
    const t = task({ id: "u1", title: "Sin sección" });
    const s = section({ id: "s1", name: "Sección A" });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [s], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Sin sección\n\n## Sección A\n");
  });

  it("las secciones salen por position aunque el array llegue desordenado", () => {
    const s1 = section({ id: "s1", name: "Primera", position: 0 });
    const s2 = section({ id: "s2", name: "Segunda", position: 1 });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [s2, s1], tasks: [], descriptions: {} });
    expect(md).toBe("# P\n\n## Primera\n\n## Segunda\n");
  });

  it("las subtareas salen por position aunque el array llegue desordenado (inserción optimista)", () => {
    const parent = task({ id: "parent", title: "Padre", position: 0 });
    const childB = task({ id: "childB", parent_id: "parent", title: "B", position: 2 });
    const childA = task({ id: "childA", parent_id: "parent", title: "A", position: 1 });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [parent, childB, childA],
      descriptions: {},
    });
    expect(md).toBe("# P\n\n- [ ] Padre\n  - [ ] A\n  - [ ] B\n");
  });

  it("anida tres niveles con 2 espacios por nivel", () => {
    const top = task({ id: "top", title: "Nivel 1" });
    const mid = task({ id: "mid", parent_id: "top", title: "Nivel 2" });
    const leaf = task({ id: "leaf", parent_id: "mid", title: "Nivel 3" });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [top, mid, leaf],
      descriptions: {},
    });
    expect(md).toBe("# P\n\n- [ ] Nivel 1\n  - [ ] Nivel 2\n    - [ ] Nivel 3\n");
  });

  it("completed_at presente marca [x], nulo marca [ ]", () => {
    const done = task({ id: "done", title: "Hecha", completed_at: "2026-08-01T00:00:00+00:00" });
    const pending = task({ id: "pending", title: "Pendiente" });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [done, pending],
      descriptions: {},
    });
    expect(md).toBe("# P\n\n- [x] Hecha\n- [ ] Pendiente\n");
  });

  it("los cuatro metadatos juntos, en el orden fijo, separados por · ", () => {
    const t = task({
      id: "t1",
      title: "Tarea completa",
      due_date: "2026-08-20",
      priority: 2,
      duration_minutes: 90,
      labels: [
        { id: "l1", name: "plata", color: "azul" },
        { id: "l2", name: "llamados", color: "verde" },
      ],
    });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe(
      "# P\n\n- [ ] Tarea completa — vence: 20 de agosto de 2026 · prioridad: Alta · duración: 1h 30min · etiquetas: plata, llamados\n",
    );
  });

  it("solo fecha", () => {
    const t = task({ id: "t1", title: "Con fecha", due_date: "2026-08-20" });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Con fecha — vence: 20 de agosto de 2026\n");
  });

  it("prioridad 4 (default) no aparece", () => {
    const t = task({ id: "t1", title: "Prioridad default", priority: 4 });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Prioridad default\n");
  });

  it("prioridad 1 sale como prioridad: Urgente", () => {
    const t = task({ id: "t1", title: "Urgente", priority: 1 });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Urgente — prioridad: Urgente\n");
  });

  it("duración sola", () => {
    const t = task({ id: "t1", title: "Con duración", duration_minutes: 45 });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Con duración — duración: 45 min\n");
  });

  it("etiquetas solas", () => {
    const t = task({ id: "t1", title: "Con etiquetas", labels: [{ id: "l1", name: "casa", color: "rojo" }] });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Con etiquetas — etiquetas: casa\n");
  });

  it("sin metadatos no aparece el — ", () => {
    const t = task({ id: "t1", title: "Sin nada" });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Sin nada\n");
  });

  it("due_at sin due_date usa la fecha de due_at", () => {
    const t = task({ id: "t1", title: "Con due_at", due_at: "2026-08-20T14:00:00+00:00" });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] Con due_at — vence: 20 de agosto de 2026\n");
  });

  it("descripción presente sale como bloque indentado, con línea en blanco antes", () => {
    const t = task({ id: "t1", title: "Con descripción" });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [t],
      descriptions: { t1: paragraphDoc("El detalle.") },
    });
    expect(md).toBe("# P\n\n- [ ] Con descripción\n\n  El detalle.\n");
  });

  it("descripción null no emite bloque", () => {
    const t = task({ id: "t1", title: "Sin descripción" });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [t],
      descriptions: { t1: null },
    });
    expect(md).toBe("# P\n\n- [ ] Sin descripción\n");
  });

  it('descripción que serializa a "" no emite bloque (doc vacío)', () => {
    const t = task({ id: "t1", title: "Doc vacío" });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [t],
      descriptions: { t1: { type: "doc", content: [] } as unknown as Json },
    });
    expect(md).toBe("# P\n\n- [ ] Doc vacío\n");
  });

  it("línea en blanco antes del ítem siguiente cuando el anterior tuvo cuerpo (regla 3)", () => {
    const withBody = task({ id: "t1", title: "Con cuerpo" });
    const next = task({ id: "t2", title: "Sin cuerpo", position: 1 });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [withBody, next],
      descriptions: { t1: paragraphDoc("Detalle.") },
    });
    expect(md).toBe("# P\n\n- [ ] Con cuerpo\n\n  Detalle.\n\n- [ ] Sin cuerpo\n");
  });

  it("un ítem con subtareas pero sin descripción no lleva línea en blanco antes de su propio cuerpo, pero sí antes del hermano siguiente", () => {
    const parent = task({ id: "parent", title: "Con subtareas" });
    const child = task({ id: "child", parent_id: "parent", title: "Hija" });
    const sibling = task({ id: "sibling", title: "Hermana", position: 1 });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [parent, child, sibling],
      descriptions: {},
    });
    expect(md).toBe("# P\n\n- [ ] Con subtareas\n  - [ ] Hija\n\n- [ ] Hermana\n");
  });

  it("una sección vacía sale solo con el ##", () => {
    const s = section({ id: "s1", name: "Vacía" });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [s], tasks: [], descriptions: {} });
    expect(md).toBe("# P\n\n## Vacía\n");
  });

  it("un título con *, #, [ sale escapado", () => {
    const t = task({ id: "t1", title: "*urgente* #1 [link]" });
    const md = projectToMarkdown({ project: { name: "P", description: null }, sections: [], tasks: [t], descriptions: {} });
    expect(md).toBe("# P\n\n- [ ] \\*urgente\\* #1 \\[link\\]\n");
  });

  it("el nombre del proyecto y el de la sección salen escapados", () => {
    const s = section({ id: "s1", name: "*Sección* [rara]" });
    const md = projectToMarkdown({
      project: { name: "*Proyecto* [raro]", description: null },
      sections: [s],
      tasks: [],
      descriptions: {},
    });
    expect(md).toBe("# \\*Proyecto\\* \\[raro\\]\n\n## \\*Sección\\* \\[rara\\]\n");
  });

  it("notas al pie de dos tareas distintas llevan prefijos distintos, sin colisión de [^1]", () => {
    const t1 = task({ id: "t1", title: "Primera" });
    const t2 = task({ id: "t2", title: "Segunda", position: 1 });
    const md = projectToMarkdown({
      project: { name: "P", description: null },
      sections: [],
      tasks: [t1, t2],
      descriptions: { t1: footnoteDoc(1, "Nota de la primera."), t2: footnoteDoc(1, "Nota de la segunda.") },
    });
    expect(md).toContain("[^1-1]");
    expect(md).toContain("[^2-1]");
    expect(md).not.toMatch(/[^-]\[\^1\]/);
  });

  it("documento completo: estructura canónica, metadatos, anidamiento y descripciones legibles de punta a punta", () => {
    const project = { name: "Mudanza", description: "Todo lo que hay que resolver antes del 15 de septiembre." };

    const sections: SectionRow[] = [
      section({ id: "sec-antes", name: "Antes de mudarse", description: "Lo que se puede hacer con tiempo.", position: 1 }),
      section({ id: "sec-despues", name: "Después de mudarse", position: 2 }),
    ];

    const tasks: TaskRow[] = [
      task({
        id: "t1",
        title: "Pedir tres presupuestos de flete",
        due_date: "2026-08-20",
        priority: 2,
        labels: [
          { id: "l1", name: "plata", color: "azul" },
          { id: "l2", name: "llamados", color: "verde" },
        ],
        position: 1,
      }),
      task({ id: "t1a", parent_id: "t1", title: "Llamar a Fletes Rivas", position: 1 }),
      task({
        id: "t1b",
        parent_id: "t1",
        title: "Llamar a Mudanzas del Sur",
        due_date: "2026-08-12",
        completed_at: "2026-08-01T00:00:00+00:00",
        position: 2,
      }),
      task({
        id: "t2",
        title: "Avisar en la administración del edificio",
        completed_at: "2026-08-02T00:00:00+00:00",
        position: 2,
      }),
      task({
        id: "t3",
        section_id: "sec-antes",
        title: "Embalar la cocina",
        due_date: "2026-09-01",
        duration_minutes: 120,
        labels: [{ id: "l3", name: "casa", color: "amarillo" }],
        position: 1,
      }),
      task({ id: "t4", section_id: "sec-antes", parent_id: "t3", title: "Comprar cajas", priority: 1, position: 1 }),
      task({ id: "t5", section_id: "sec-antes", parent_id: "t4", title: "Ir a la ferretería de Rivadavia", position: 1 }),
      task({ id: "t6", section_id: "sec-antes", title: "Dar de baja el internet", position: 2 }),
    ];

    const descriptions: Record<string, Json> = {
      t1: paragraphDoc("Preguntar siempre por el seguro."),
      t3: boldParagraphDoc("Empezar por lo que ", "no se usa", ": la vajilla de las fiestas."),
    };

    const md = projectToMarkdown({ project, sections, tasks, descriptions });

    expect(md).toMatchInlineSnapshot(`
      "# Mudanza

      Todo lo que hay que resolver antes del 15 de septiembre.

      - [ ] Pedir tres presupuestos de flete — vence: 20 de agosto de 2026 · prioridad: Alta · etiquetas: plata, llamados

        Preguntar siempre por el seguro.

        - [ ] Llamar a Fletes Rivas
        - [x] Llamar a Mudanzas del Sur — vence: 12 de agosto de 2026

      - [x] Avisar en la administración del edificio

      ## Antes de mudarse

      Lo que se puede hacer con tiempo.

      - [ ] Embalar la cocina — vence: 1 de septiembre de 2026 · duración: 2h · etiquetas: casa

        Empezar por lo que **no se usa**: la vajilla de las fiestas.

        - [ ] Comprar cajas — prioridad: Urgente
          - [ ] Ir a la ferretería de Rivadavia

      - [ ] Dar de baja el internet

      ## Después de mudarse
      "
    `);
  });
});
