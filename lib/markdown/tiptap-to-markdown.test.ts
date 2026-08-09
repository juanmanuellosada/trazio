import { describe, expect, it } from "vitest";
import type { Json } from "@/lib/supabase/database.types";
import { tiptapDocToMarkdown } from "./tiptap-to-markdown";

function doc(...content: unknown[]): Json {
  return { type: "doc", content } as Json;
}

function text(value: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): Json {
  return (marks ? { type: "text", text: value, marks } : { type: "text", text: value }) as Json;
}

function paragraph(...content: unknown[]): Json {
  return { type: "paragraph", content } as Json;
}

function hardBreak(): Json {
  return { type: "hardBreak" } as Json;
}

function footnoteRef(id: string, number: number): Json {
  return { type: "footnoteReference", attrs: { id, number } } as Json;
}

function footnoteItem(id: string, ...content: unknown[]): Json {
  return { type: "footnoteItem", attrs: { id }, content } as Json;
}

function footnoteList(...items: unknown[]): Json {
  return { type: "footnoteList", content: items } as Json;
}

function tableHeader(...content: unknown[]): Json {
  return { type: "tableHeader", content } as Json;
}

function tableCell(...content: unknown[]): Json {
  return { type: "tableCell", content } as Json;
}

function tableRow(...cells: unknown[]): Json {
  return { type: "tableRow", content: cells } as Json;
}

function table(...rows: unknown[]): Json {
  return { type: "table", content: rows } as Json;
}

describe("tiptapDocToMarkdown — entradas inválidas", () => {
  it.each([
    ["null", null],
    ["objeto vacío", {}],
    ["un string", "texto"],
    ["doc sin content", { type: "doc" }],
    ["doc con content vacío", doc()],
  ])("%s produce string vacío", (_label, value) => {
    expect(tiptapDocToMarkdown(value as Json)).toBe("");
  });

  it("nunca lanza, ni con basura arbitraria", () => {
    const garbage: unknown[] = [
      42,
      true,
      [1, 2, 3],
      { type: "doc", content: "no es un array" },
      { type: "doc", content: [null, 1, "x", { type: 123 }, { content: [] }] },
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text" }] }] },
      { type: "doc", content: [{ type: "heading", attrs: { level: "no-es-numero" } }] },
    ];
    for (const value of garbage) {
      expect(() => tiptapDocToMarkdown(value as Json)).not.toThrow();
    }
  });
});

describe("tiptapDocToMarkdown — nodos de bloque", () => {
  it("paragraph: texto plano", () => {
    expect(tiptapDocToMarkdown(doc(paragraph(text("Hola mundo"))))).toBe("Hola mundo");
  });

  it("paragraph vacío se omite, sin dejar saltos de línea colgando", () => {
    const d = doc(paragraph(text("antes")), { type: "paragraph", content: [] }, paragraph(text("después")));
    expect(tiptapDocToMarkdown(d)).toBe("antes\n\ndespués");
  });

  it("heading respeta headingOffset y satura en 6", () => {
    const d = doc({ type: "heading", attrs: { level: 2 }, content: [text("Título")] });
    expect(tiptapDocToMarkdown(d, { headingOffset: 2 })).toBe("#### Título");
    expect(tiptapDocToMarkdown(d, { headingOffset: 10 })).toBe("###### Título");
  });

  it("bulletList: marcador -", () => {
    const d = doc({
      type: "bulletList",
      content: [
        { type: "listItem", content: [paragraph(text("uno"))] },
        { type: "listItem", content: [paragraph(text("dos"))] },
      ],
    });
    expect(tiptapDocToMarkdown(d)).toBe("- uno\n- dos");
  });

  it("orderedList numera incrementalmente desde attrs.start", () => {
    const d = doc({
      type: "orderedList",
      attrs: { start: 3 },
      content: [
        { type: "listItem", content: [paragraph(text("a"))] },
        { type: "listItem", content: [paragraph(text("b"))] },
      ],
    });
    expect(tiptapDocToMarkdown(d)).toBe("3. a\n4. b");
  });

  it("taskList: casillero marcado y sin marcar", () => {
    const d = doc({
      type: "taskList",
      content: [
        { type: "taskItem", attrs: { checked: true }, content: [paragraph(text("hecha"))] },
        { type: "taskItem", attrs: { checked: false }, content: [paragraph(text("pendiente"))] },
      ],
    });
    expect(tiptapDocToMarkdown(d)).toBe("- [x] hecha\n- [ ] pendiente");
  });

  it("blockquote prefija cada línea con >, sin espacio colgando en las vacías", () => {
    const d = doc({ type: "blockquote", content: [paragraph(text("uno")), paragraph(text("dos"))] });
    expect(tiptapDocToMarkdown(d)).toBe("> uno\n>\n> dos");
  });

  it("codeBlock con language", () => {
    const d = doc({ type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const x = 1;" }] });
    expect(tiptapDocToMarkdown(d)).toBe("```ts\nconst x = 1;\n```");
  });

  it("codeBlock sin language", () => {
    const d = doc({ type: "codeBlock", content: [{ type: "text", text: "plain" }] });
    expect(tiptapDocToMarkdown(d)).toBe("```\nplain\n```");
  });

  it("horizontalRule", () => {
    expect(tiptapDocToMarkdown(doc({ type: "horizontalRule" }))).toBe("---");
  });

  it("hardBreak: backslash seguido de salto real, no dos espacios", () => {
    const d = doc(paragraph(text("línea uno"), hardBreak(), text("línea dos")));
    expect(tiptapDocToMarkdown(d)).toBe("línea uno\\\nlínea dos");
  });
});

describe("tiptapDocToMarkdown — marcas", () => {
  it("bold", () => {
    expect(tiptapDocToMarkdown(doc(paragraph(text("t", [{ type: "bold" }]))))).toBe("**t**");
  });

  it("italic", () => {
    expect(tiptapDocToMarkdown(doc(paragraph(text("t", [{ type: "italic" }]))))).toBe("*t*");
  });

  it("strike", () => {
    expect(tiptapDocToMarkdown(doc(paragraph(text("t", [{ type: "strike" }]))))).toBe("~~t~~");
  });

  it("highlight", () => {
    expect(tiptapDocToMarkdown(doc(paragraph(text("t", [{ type: "highlight" }]))))).toBe("==t==");
  });

  it("un párrafo que empieza con ==resaltado== no escapa el = inicial (regresión: escapeLineStart corre sobre el texto crudo, antes de envolver con las marcas)", () => {
    const d = doc(paragraph(text("resaltado", [{ type: "highlight" }]), text(" resto del párrafo")));
    expect(tiptapDocToMarkdown(d)).toBe("==resaltado== resto del párrafo");
  });

  it("code no escapa su contenido", () => {
    expect(tiptapDocToMarkdown(doc(paragraph(text("a*b*c", [{ type: "code" }]))))).toBe("`a*b*c`");
  });

  it("link", () => {
    const d = doc(paragraph(text("t", [{ type: "link", attrs: { href: "https://x.com" } }])));
    expect(tiptapDocToMarkdown(d)).toBe("[t](https://x.com)");
  });

  it("link sin href: solo el texto", () => {
    const d = doc(paragraph(text("t", [{ type: "link", attrs: { href: "" } }])));
    expect(tiptapDocToMarkdown(d)).toBe("t");
  });

  it("bold+italic+link produce [***t***](url), en ese orden fijo", () => {
    const d = doc(
      paragraph(text("t", [{ type: "bold" }, { type: "italic" }, { type: "link", attrs: { href: "https://x.com" } }])),
    );
    expect(tiptapDocToMarkdown(d)).toBe("[***t***](https://x.com)");
  });
});

describe("tiptapDocToMarkdown — fusión de nodos de texto adyacentes", () => {
  it("dos nodos de texto adyacentes con la misma marca se fusionan antes de aplicarla (**ab**, no **a****b**)", () => {
    const d = doc(paragraph(text("a", [{ type: "bold" }]), text("b", [{ type: "bold" }])));
    expect(tiptapDocToMarkdown(d)).toBe("**ab**");
  });

  it("nodos de texto adyacentes con marcas distintas no se fusionan", () => {
    const d = doc(paragraph(text("a", [{ type: "bold" }]), text("b", [{ type: "italic" }])));
    expect(tiptapDocToMarkdown(d)).toBe("**a***b*");
  });
});

describe("tiptapDocToMarkdown — listas anidadas", () => {
  it("tres niveles de anidamiento, indentados a la columna de contenido del marcador padre", () => {
    const d = doc({
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            paragraph(text("nivel 1")),
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    paragraph(text("nivel 2")),
                    { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("nivel 3"))] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(tiptapDocToMarkdown(d)).toBe("- nivel 1\n\n  - nivel 2\n\n    - nivel 3");
  });
});

describe("tiptapDocToMarkdown — callout", () => {
  it("siempre [!NOTE], con dos párrafos", () => {
    const d = doc({
      type: "callout",
      content: [paragraph(text("Primer párrafo del destacado.")), paragraph(text("Segundo párrafo."))],
    });
    expect(tiptapDocToMarkdown(d)).toBe("> [!NOTE]\n> Primer párrafo del destacado.\n>\n> Segundo párrafo.");
  });
});

describe("tiptapDocToMarkdown — notas al pie", () => {
  it("footnotePrefix antepone el prefijo al número de la referencia y de la definición", () => {
    const d = doc(
      paragraph(text("texto"), footnoteRef("fn-1", 1)),
      footnoteList(footnoteItem("fn-1", paragraph(text("la nota")))),
    );
    const md = tiptapDocToMarkdown(d, { footnotePrefix: "p" });
    expect(md).toBe("texto[^p-1]\n\n[^p-1]: la nota");
  });

  it("sin footnotePrefix la etiqueta es solo el número", () => {
    const d = doc(
      paragraph(text("texto"), footnoteRef("fn-1", 1)),
      footnoteList(footnoteItem("fn-1", paragraph(text("la nota")))),
    );
    expect(tiptapDocToMarkdown(d)).toBe("texto[^1]\n\n[^1]: la nota");
  });

  it("una nota huérfana (ítem sin referencia) se numera igual y no rompe", () => {
    const d = doc(footnoteList(footnoteItem("huerfana", paragraph(text("nadie me referencia")))));
    expect(tiptapDocToMarkdown(d)).toBe("[^1]: nadie me referencia");
  });
});

describe("tiptapDocToMarkdown — tabla", () => {
  it("con encabezado", () => {
    const d = doc(
      table(
        tableRow(tableHeader(paragraph(text("Nombre"))), tableHeader(paragraph(text("Edad")))),
        tableRow(tableCell(paragraph(text("Ana"))), tableCell(paragraph(text("30")))),
      ),
    );
    expect(tiptapDocToMarkdown(d)).toBe("| Nombre | Edad |\n| --- | --- |\n| Ana | 30 |");
  });

  it("sin encabezado sintetiza una fila de encabezado vacía", () => {
    const d = doc(table(tableRow(tableCell(paragraph(text("a"))), tableCell(paragraph(text("b"))))));
    const md = tiptapDocToMarkdown(d);
    const lines = md.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("| --- | --- |");
    expect(lines[2]).toBe("| a | b |");
    // la fila sintetizada tiene el mismo ancho, sin texto en ninguna celda
    expect(lines[0]?.split("|").map((s) => s.trim())).toEqual(["", "", "", ""]);
  });

  it("filas de distinto largo se rellenan con celdas vacías", () => {
    const d = doc(
      table(
        tableRow(tableHeader(paragraph(text("A"))), tableHeader(paragraph(text("B"))), tableHeader(paragraph(text("C")))),
        tableRow(tableCell(paragraph(text("1")))),
      ),
    );
    expect(tiptapDocToMarkdown(d)).toBe("| A | B | C |\n| --- | --- | --- |\n| 1 |  |  |");
  });

  it("una tubería dentro de una celda se escapa", () => {
    const d = doc(table(tableRow(tableCell(paragraph(text("a | b"))))));
    expect(tiptapDocToMarkdown(d)).toContain("a \\| b");
  });

  it("una negrita dentro de una celda sigue siendo negrita, no se escapa como texto literal", () => {
    const d = doc(
      table(
        tableRow(tableHeader(paragraph(text("Nombre"))), tableHeader(paragraph(text("Nota")))),
        tableRow(tableCell(paragraph(text("Ana", [{ type: "bold" }]))), tableCell(paragraph(text("a | b")))),
      ),
    );
    expect(tiptapDocToMarkdown(d)).toBe("| Nombre | Nota |\n| --- | --- |\n| **Ana** | a \\| b |");
  });

  it("dos párrafos en una celda se aplanan con <br>", () => {
    const d = doc(table(tableRow(tableCell(paragraph(text("uno")), paragraph(text("dos"))))));
    expect(tiptapDocToMarkdown(d)).toContain("uno<br>dos");
  });

  it("tabla sin filas produce string vacío", () => {
    expect(tiptapDocToMarkdown(doc(table()))).toBe("");
  });
});

describe("tiptapDocToMarkdown — nodo desconocido", () => {
  it("con content: emite el texto de adentro, sin romper el resto del documento", () => {
    const d = doc({ type: "misteryBlock", content: [paragraph(text("adentro"))] });
    expect(tiptapDocToMarkdown(d)).toBe("adentro");
  });

  it("atómico, sin content ni text: string vacío", () => {
    const d = doc({ type: "misteryAtom", attrs: { foo: "bar" } });
    expect(tiptapDocToMarkdown(d)).toBe("");
  });

  it("con text: el texto escapado", () => {
    const d = doc({ type: "misteryInline", text: "*raro*" });
    expect(tiptapDocToMarkdown(d)).toBe("\\*raro\\*");
  });
});
