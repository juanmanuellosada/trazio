import type { Json } from "@/lib/supabase/database.types";
import { codeFence, escapeInline, escapeLineStart, escapeTableCell, indentLines, inlineCode } from "./text";

/**
 * Serializa el jsonb de Tiptap de la descripción de una tarea a markdown
 * (feature "copiar un proyecto como markdown", `openspec/changes/
 * copiar-un-proyecto-como-markdown/design.md`). No existe otro conversor de
 * este documento en el repo — ni a markdown ni a texto plano — así que las
 * reglas de cada nodo están decididas acá, con `lib/markdown/text.ts` como
 * única dependencia para el escapado de texto plano.
 *
 * Principio general: **nunca lanza**. Un documento inválido, `null`, o un
 * nodo de una extensión que Tiptap todavía no soporta acá (`renderUnknownNode`)
 * degradan a texto plano o a `""`, nunca rompen la conversión completa — eso
 * es lo que permite agregar una extensión de editor mañana sin que "copiar
 * como markdown" deje de funcionar para el resto del documento.
 *
 * Limitación conocida (D-F del design): las definiciones de nota al pie
 * quedan indentadas dentro del ítem de la tarea en vez de a nivel de
 * documento, así que GitHub las muestra como texto literal en vez de
 * resolverlas (Obsidian sí las resuelve). El prefijo de `footnotePrefix`
 * existe para que izarlas al final del documento, el día que se haga, no
 * obligue a renumerar nada.
 */

export type TiptapMarkdownOptions = {
  /**
   * Desplaza los títulos del documento. La descripción se emite dentro de un
   * ítem de lista, debajo del H1 del proyecto y del H2 de la sección: con `2`,
   * un H1 de la descripción sale como `###` y no compite con la jerarquía del
   * documento. Satura en 6.
   */
  headingOffset?: number;
  /**
   * Prefijo de las etiquetas de notas al pie (`[^3-1]`). Sin él, dos tareas con
   * una nota cada una producirían dos `[^1]` en el mismo documento.
   */
  footnotePrefix?: string;
};

/** Un valor de `Json` que es un objeto (no array, no primitivo, no `null`). */
type JsonObject = { [key: string]: Json | undefined };

/** Nodo de Tiptap con al menos un `type` string. Es la única forma que este módulo exige — el resto de los campos (`content`, `attrs`, `text`, `marks`) se leen con los helpers de abajo, que toleran cualquier forma (o ausencia) sin lanzar. */
type TiptapNode = JsonObject & { type: string };

function isObject(value: Json | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNode(value: Json | undefined): value is TiptapNode {
  return isObject(value) && typeof value.type === "string";
}

function nodeChildren(node: JsonObject): TiptapNode[] {
  const content = node.content;
  return Array.isArray(content) ? content.filter(isNode) : [];
}

function nodeMarks(node: JsonObject): TiptapNode[] {
  const marks = node.marks;
  return Array.isArray(marks) ? marks.filter(isNode) : [];
}

function nodeAttrs(node: JsonObject): JsonObject {
  return isObject(node.attrs) ? node.attrs : {};
}

function attrString(attrs: JsonObject, key: string): string | undefined {
  const value = attrs[key];
  return typeof value === "string" ? value : undefined;
}

function attrNumber(attrs: JsonObject, key: string): number | undefined {
  const value = attrs[key];
  return typeof value === "number" ? value : undefined;
}

function attrBoolean(attrs: JsonObject, key: string): boolean | undefined {
  const value = attrs[key];
  return typeof value === "boolean" ? value : undefined;
}

type Context = {
  headingOffset: number;
  footnotePrefix: string | undefined;
  /** `footnoteItem.attrs.id` → número. Se arma una sola vez por documento (`buildFootnoteItemNumbers`): el número de cada referencia vive en la propia referencia, pero el ítem solo tiene `id`, así que hace falta esta tabla para aparearlos. */
  footnoteItemNumbers: Map<string, number>;
}

function footnoteLabel(prefix: string | undefined, number: number | undefined): string {
  return prefix !== undefined ? `${prefix}-${number}` : `${number}`;
}

function collectFootnoteReferenceNumbers(node: TiptapNode, into: Map<string, number>): void {
  if (node.type === "footnoteReference") {
    const attrs = nodeAttrs(node);
    const id = attrString(attrs, "id");
    const number = attrNumber(attrs, "number");
    if (id !== undefined && number !== undefined) into.set(id, number);
  }
  for (const child of nodeChildren(node)) collectFootnoteReferenceNumbers(child, into);
}

function findFootnoteList(node: TiptapNode): TiptapNode | null {
  if (node.type === "footnoteList") return node;
  for (const child of nodeChildren(node)) {
    const found = findFootnoteList(child);
    if (found) return found;
  }
  return null;
}

/**
 * Arma `id → número` para todos los `footnoteItem` del documento: los que
 * tienen una referencia que los apunta heredan su número, y una nota
 * huérfana (un ítem sin referencia, caso raro pero posible si se borró la
 * referencia sin borrar el ítem) se numera al final, por orden de aparición
 * en la lista.
 */
function buildFootnoteItemNumbers(doc: TiptapNode): Map<string, number> {
  const numbers = new Map<string, number>();
  collectFootnoteReferenceNumbers(doc, numbers);

  let maxNumber = 0;
  for (const number of numbers.values()) maxNumber = Math.max(maxNumber, number);

  const list = findFootnoteList(doc);
  if (list) {
    for (const item of nodeChildren(list)) {
      const id = attrString(nodeAttrs(item), "id");
      if (id !== undefined && !numbers.has(id)) {
        maxNumber += 1;
        numbers.set(id, maxNumber);
      }
    }
  }
  return numbers;
}

/** `[^id]` no admite espacios ni paréntesis sin codificar dentro del destino de un link. */
function encodeHref(href: string): string {
  return href.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

/**
 * Firma estable de un conjunto de marcas, para detectar si dos nodos de
 * texto adyacentes comparten exactamente las mismas (mismo tipo y mismos
 * atributos). Ordena por tipo antes de serializar porque Tiptap no garantiza
 * el mismo orden interno en dos nodos que llevan las mismas marcas.
 */
function markSignature(marks: TiptapNode[]): string {
  return [...marks]
    .sort((a, b) => a.type.localeCompare(b.type))
    .map((m) => `${m.type}:${JSON.stringify(nodeAttrs(m))}`)
    .join("|");
}

/**
 * Fusiona nodos `text` adyacentes que tengan el mismo conjunto de marcas.
 * Tiptap parte el texto en varios nodos por razones internas (por ejemplo al
 * guardar cada tecleo); sin fusionar, `**a**` + `**b**` sale `**a****b**`,
 * que ningún renderer interpreta como negrita continua.
 */
function mergeAdjacentText(nodes: TiptapNode[]): TiptapNode[] {
  const merged: TiptapNode[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (node.type === "text" && last?.type === "text" && markSignature(nodeMarks(node)) === markSignature(nodeMarks(last))) {
      const lastText = typeof last.text === "string" ? last.text : "";
      const nodeText = typeof node.text === "string" ? node.text : "";
      merged[merged.length - 1] = { ...last, text: lastText + nodeText };
    } else {
      merged.push(node);
    }
  }
  return merged;
}

/**
 * Orden fijo de aplicación de marcas, de adentro hacia afuera: `code` es la
 * más interna y `link` la más externa. Con este orden, `bold+italic+link`
 * siempre produce `[***texto***](url)`, sin importar en qué orden Tiptap
 * haya guardado el array de marcas del nodo.
 */
const MARK_APPLY_ORDER = ["code", "highlight", "strike", "italic", "bold", "link"] as const;

/**
 * `atLineStart` escapa además los caracteres que solo son activos al
 * principio de línea (`escapeLineStart`) — pero sobre el texto crudo, antes
 * de envolverlo con las marcas. Hacerlo sobre el string ya ensamblado (con
 * `==`, `**`, etc. ya puestos) tiene dos problemas: un párrafo que arranca
 * con `highlight` produce `==t==`, que `escapeLineStart` confunde con un
 * subrayado de heading setext y escapa el `=` que nosotros mismos pusimos;
 * y a la inversa, un párrafo en negrita que arranca con texto peligroso
 * (`**- ojo**`) queda con el `*` de afuera, que no dispara la regex y deja
 * el `-` sin escapar. Escapando el texto crudo primero, la marca que se
 * envuelve alrededor después no interfiere en ningún sentido.
 */
function renderTextNode(node: TiptapNode, atLineStart: boolean): string {
  const marksByType = new Map<string, JsonObject>();
  for (const mark of nodeMarks(node)) marksByType.set(mark.type, nodeAttrs(mark));

  const rawText = typeof node.text === "string" ? node.text : "";
  const isCode = marksByType.has("code");
  // El contenido de `code` no se escapa: adentro de código en línea el
  // markdown no interpreta nada, así que escaparlo produciría backslashes
  // literales que el usuario nunca tecleó.
  let content = isCode ? rawText : escapeInline(rawText);
  if (atLineStart && !isCode) content = escapeLineStart(content);

  for (const type of MARK_APPLY_ORDER) {
    const attrs = marksByType.get(type);
    if (attrs === undefined) continue;
    switch (type) {
      case "code":
        content = inlineCode(content);
        break;
      case "highlight":
        content = `==${content}==`;
        break;
      case "strike":
        content = `~~${content}~~`;
        break;
      case "italic":
        content = `*${content}*`;
        break;
      case "bold":
        content = `**${content}**`;
        break;
      case "link": {
        const href = attrString(attrs, "href");
        if (!href) break; // sin href: el texto queda tal cual, sin envolver
        const title = attrString(attrs, "title");
        const encodedHref = encodeHref(href);
        content = title ? `[${content}](${encodedHref} "${title}")` : `[${content}](${encodedHref})`;
        break;
      }
    }
  }
  return content;
}

function renderInlineNode(node: TiptapNode, ctx: Context, atLineStart: boolean): string {
  switch (node.type) {
    case "text":
      return renderTextNode(node, atLineStart);
    case "hardBreak":
      // Backslash + salto real, no dos espacios: los editores de texto (y
      // muchos formularios web) los recortan al guardar.
      return "\\\n";
    case "footnoteReference": {
      const number = attrNumber(nodeAttrs(node), "number");
      return `[^${footnoteLabel(ctx.footnotePrefix, number)}]`;
    }
    default:
      return renderUnknownNode(node, ctx);
  }
}

/** `escapeFirstLine` solo tiene efecto sobre el primer nodo (si es `text`): es lo que arma "la primera línea pasada por `escapeLineStart`" del párrafo, ver `renderTextNode`. */
function renderInlineNodes(nodes: TiptapNode[], ctx: Context, escapeFirstLine = false): string {
  return mergeAdjacentText(nodes)
    .map((node, index) => renderInlineNode(node, ctx, escapeFirstLine && index === 0))
    .join("");
}

function renderBlockChildren(nodes: TiptapNode[], ctx: Context): string {
  return nodes
    .map((node) => renderBlockNode(node, ctx))
    .filter((s) => s !== "")
    .join("\n\n");
}

function blockquoteLines(content: string): string {
  return content
    .split("\n")
    .map((line) => (line === "" ? ">" : `> ${line}`))
    .join("\n");
}

/** Marcador + primer bloque en la misma línea; los bloques siguientes indentados a la columna de contenido del marcador y separados por línea en blanco. Sirve tanto para ítems de lista (`- `, `1. `, `- [x] `) como para la definición de una nota al pie (`[^id]: `). */
function renderMarkerBlock(children: TiptapNode[], ctx: Context, marker: string): string {
  const rendered = children.map((b) => renderBlockNode(b, ctx)).filter((s) => s !== "");
  if (rendered.length === 0) return marker.trimEnd();
  const [first, ...rest] = rendered as [string, ...string[]];
  const indent = " ".repeat(marker.length);
  return [marker + first, ...rest.map((block) => indentLines(block, indent))].join("\n\n");
}

function renderListItems(items: TiptapNode[], ctx: Context, markerFor: (item: TiptapNode, index: number) => string): string {
  return items.map((item, index) => renderMarkerBlock(nodeChildren(item), ctx, markerFor(item, index))).join("\n");
}

const HEADER_CELL_TYPE = "tableHeader";
const CELL_TYPES = new Set(["tableHeader", "tableCell"]);

function cellText(cell: TiptapNode, ctx: Context): string {
  // Los bloques de la celda pasan por el mismo `renderBlockNode` que el
  // resto del documento — para un `paragraph`, eso es el pipeline en línea
  // normal: `escapeInline` sobre el texto crudo y las marcas ya aplicadas
  // encima (`**negrita**` sigue siendo negrita). `escapeTableCell` ya NO
  // vuelve a escapar ese markdown; solo resuelve lo específico de una celda
  // (`|` y los saltos de línea, que es lo que "aplana" varios bloques en
  // una sola celda con `<br>`).
  const blocks = nodeChildren(cell)
    .map((b) => renderBlockNode(b, ctx))
    .filter((s) => s !== "");
  return escapeTableCell(blocks.join("\n"));
}

/**
 * Tabla de tuberías GFM. `colspan`/`rowspan` se ignoran (D-G del design):
 * markdown no tiene celdas combinadas, y ProseMirror no emite nodos
 * "fantasma" para las columnas que una celda combinada ocupa de más — cada
 * fila puede tener menos nodos de celda que el ancho real de la grilla. No
 * se intenta reconstruir esa grilla: cada fila se serializa con las celdas
 * que tiene y se rellena a la derecha hasta el ancho máximo entre filas.
 */
function renderTable(node: TiptapNode, ctx: Context): string {
  const rows = nodeChildren(node).filter((r) => r.type === "tableRow");
  if (rows.length === 0) return "";

  const rowCells = rows.map((row) => nodeChildren(row).filter((c) => CELL_TYPES.has(c.type)));
  const width = rowCells.reduce((max, cells) => Math.max(max, cells.length), 0);

  // GFM no admite una tabla sin encabezado: si la primera fila no trae
  // ninguna celda `tableHeader`, se sintetiza una fila de encabezado vacía
  // en vez de tratar esa primera fila como si lo fuera.
  const hasHeaderRow = rowCells[0]?.some((c) => c.type === HEADER_CELL_TYPE) ?? false;
  const headerCells = hasHeaderRow ? rowCells[0]! : [];
  const bodyRowCells = hasHeaderRow ? rowCells.slice(1) : rowCells;

  const toLine = (cells: TiptapNode[]): string => {
    const texts = cells.map((c) => cellText(c, ctx));
    while (texts.length < width) texts.push("");
    return `| ${texts.join(" | ")} |`;
  };

  const headerLine = toLine(headerCells);
  const separatorLine = `| ${Array(width).fill("---").join(" | ")} |`;
  return [headerLine, separatorLine, ...bodyRowCells.map(toLine)].join("\n");
}

/**
 * Nodo de un tipo que este módulo no reconoce (por ejemplo, una extensión
 * de Tiptap agregada después de escribir este archivo). Nunca rompe la
 * conversión: si tiene `content`, se recursa y se emite lo que salga; si no,
 * pero tiene `text`, se emite ese texto escapado; si no tiene ninguno,
 * `""`. La peor consecuencia posible es perder el formato de ese nodo
 * puntual, nunca el documento entero.
 */
function renderUnknownNode(node: TiptapNode, ctx: Context): string {
  const children = nodeChildren(node);
  if (children.length > 0) return renderBlockChildren(children, ctx);
  return typeof node.text === "string" ? escapeInline(node.text) : "";
}

function renderBlockNode(node: TiptapNode, ctx: Context): string {
  const attrs = nodeAttrs(node);
  const children = nodeChildren(node);

  switch (node.type) {
    case "paragraph":
      return renderInlineNodes(children, ctx, true);
    case "heading": {
      const level = attrNumber(attrs, "level") ?? 1;
      const hashes = "#".repeat(Math.max(1, Math.min(6, level + ctx.headingOffset)));
      return `${hashes} ${renderInlineNodes(children, ctx)}`;
    }
    case "bulletList":
      return renderListItems(children, ctx, () => "- ");
    case "orderedList": {
      const start = attrNumber(attrs, "start") ?? 1;
      return renderListItems(children, ctx, (_item, index) => `${start + index}. `);
    }
    case "taskList":
      return renderListItems(children, ctx, (item) =>
        attrBoolean(nodeAttrs(item), "checked") === true ? "- [x] " : "- [ ] ",
      );
    case "blockquote":
      return blockquoteLines(renderBlockChildren(children, ctx));
    case "codeBlock": {
      const raw = children.map((c) => (typeof c.text === "string" ? c.text : "")).join("");
      const language = attrString(attrs, "language") ?? "";
      const fence = codeFence(raw);
      return `${fence}${language}\n${raw}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    case "callout":
      // El nodo no tiene atributo de variante (`callout.ts`: "sin variantes
      // de color") — siempre sale como `[!NOTE]`, la única sintaxis de
      // alerta que GitHub y Obsidian comparten.
      return `> [!NOTE]\n${blockquoteLines(renderBlockChildren(children, ctx))}`;
    case "footnoteList":
      return renderBlockChildren(children, ctx);
    case "footnoteItem": {
      const id = attrString(attrs, "id");
      const number = id !== undefined ? ctx.footnoteItemNumbers.get(id) : undefined;
      return renderMarkerBlock(children, ctx, `[^${footnoteLabel(ctx.footnotePrefix, number)}]: `);
    }
    case "table":
      return renderTable(node, ctx);
    default:
      return renderUnknownNode(node, ctx);
  }
}

/**
 * Convierte el jsonb de descripción de una tarea a markdown. Devuelve `""`
 * para `null`, para un documento vacío y para cualquier valor que no sea un
 * nodo `doc` — el llamador omite el bloque de descripción entero cuando
 * recibe `""`. Nunca lanza: el `try/catch` es la última red de seguridad
 * sobre las que ya ponen los helpers de arriba (`isNode`, los `attr*`).
 */
export function tiptapDocToMarkdown(doc: Json | null, options: TiptapMarkdownOptions = {}): string {
  try {
    if (!isNode(doc) || doc.type !== "doc") return "";
    const children = nodeChildren(doc);
    if (children.length === 0) return "";

    const ctx: Context = {
      headingOffset: options.headingOffset ?? 0,
      footnotePrefix: options.footnotePrefix,
      footnoteItemNumbers: buildFootnoteItemNumbers(doc),
    };
    return renderBlockChildren(children, ctx);
  } catch {
    return "";
  }
}
