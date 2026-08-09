import { describe, expect, it } from "vitest";
import { codeFence, escapeInline, escapeLineStart, escapeTableCell, indentLines, inlineCode } from "./text";

describe("escapeInline", () => {
  it("escapa cada carácter especial de la lista con una barra invertida", () => {
    expect(escapeInline(String.raw`a\b`)).toBe(String.raw`a\\b`);
    expect(escapeInline("a`b")).toBe("a\\`b");
    expect(escapeInline("a*b")).toBe(String.raw`a\*b`);
    expect(escapeInline("a[b")).toBe(String.raw`a\[b`);
    expect(escapeInline("a]b")).toBe(String.raw`a\]b`);
    expect(escapeInline("a<b")).toBe(String.raw`a\<b`);
    expect(escapeInline("a~b")).toBe(String.raw`a\~b`);
  });

  it("un texto sin caracteres especiales queda idéntico", () => {
    expect(escapeInline("texto normal sin nada raro")).toBe("texto normal sin nada raro");
  });

  it("escapa la barra invertida primero, para no escapar dos veces lo que agrega", () => {
    expect(escapeInline(String.raw`\*`)).toBe(String.raw`\\\*`);
  });

  it("escapa el guion bajo cuando puede abrir o cerrar énfasis", () => {
    expect(escapeInline("_texto_")).toBe(String.raw`\_texto\_`);
  });

  it("no escapa el guion bajo dentro de una palabra", () => {
    expect(escapeInline("snake_case")).toBe("snake_case");
    expect(escapeInline("foo_bar_baz")).toBe("foo_bar_baz");
  });
});

describe("escapeLineStart", () => {
  it("escapa # al inicio de línea", () => {
    expect(escapeLineStart("# título")).toBe(String.raw`\# título`);
  });

  it("escapa > al inicio de línea", () => {
    expect(escapeLineStart("> cita")).toBe(String.raw`\> cita`);
  });

  it("escapa - al inicio de línea", () => {
    expect(escapeLineStart("- item")).toBe(String.raw`\- item`);
  });

  it("escapa + al inicio de línea", () => {
    expect(escapeLineStart("+ item")).toBe(String.raw`\+ item`);
  });

  it("escapa un marcador de lista ordenada con punto", () => {
    expect(escapeLineStart("1. primero")).toBe(String.raw`1\. primero`);
  });

  it("escapa un marcador de lista ordenada con paréntesis, con cualquier dígito", () => {
    expect(escapeLineStart("1) primero")).toBe(String.raw`1\) primero`);
    expect(escapeLineStart("12. primero")).toBe(String.raw`12\. primero`);
  });

  it("escapa con espacios previos también", () => {
    expect(escapeLineStart("  # título")).toBe(String.raw`  \# título`);
    expect(escapeLineStart("  1. primero")).toBe(String.raw`  1\. primero`);
  });

  it("no toca el mismo carácter en el medio de la línea", () => {
    expect(escapeLineStart("texto - con guion")).toBe("texto - con guion");
    expect(escapeLineStart("texto # con numeral")).toBe("texto # con numeral");
  });
});

describe("escapeTableCell", () => {
  it("escapa | como delimitador de columna", () => {
    expect(escapeTableCell("a|b")).toBe(String.raw`a\|b`);
  });

  it("convierte saltos de línea en <br>", () => {
    expect(escapeTableCell("línea 1\nlínea 2")).toBe("línea 1<br>línea 2");
  });

  it("no aplica escapeInline: recibe markdown ya renderizado y lo deja intacto salvo | y saltos de línea", () => {
    expect(escapeTableCell("**negrita**")).toBe("**negrita**");
    expect(escapeTableCell("_texto_")).toBe("_texto_");
  });

  it("combina | y saltos de línea en el mismo texto", () => {
    expect(escapeTableCell("a|b\nc|d")).toBe(String.raw`a\|b<br>c\|d`);
  });
});

describe("indentLines", () => {
  it("prefija todas las líneas con el indent", () => {
    expect(indentLines("a\nb\nc", "  ")).toBe("  a\n  b\n  c");
  });

  it("una línea vacía en el medio queda vacía de verdad, sin el indent colgando", () => {
    expect(indentLines("a\n\nb", "  ")).toBe("  a\n\n  b");
  });
});

describe("codeFence", () => {
  it("contenido sin backticks devuelve el mínimo de 3", () => {
    expect(codeFence("const x = 1;")).toBe("`".repeat(3));
  });

  it("contenido con una corrida de 3 backticks adentro devuelve 4", () => {
    expect(codeFence("texto con ``` adentro")).toBe("`".repeat(4));
  });
});

describe("inlineCode", () => {
  it("contenido simple se envuelve en un backtick, sin padding", () => {
    expect(inlineCode("code")).toBe("`code`");
  });

  it("contenido con un backtick adentro (no en el borde) se envuelve en dos, sin padding", () => {
    expect(inlineCode("a`b")).toBe("``a`b``");
  });

  it("contenido que empieza con backtick lleva padding de espacio", () => {
    expect(inlineCode("`start")).toBe("`` `start ``");
  });
});
