/**
 * Helpers puros de manipulación de texto markdown, sin dependencias: el
 * serializador de Tiptap (`lib/markdown/tiptap-to-markdown.ts`) y el del
 * documento de proyecto (`lib/projects/project-to-markdown.ts`) los
 * reutilizan para no repetir estas reglas de escapado en cada lugar que
 * arma texto markdown.
 *
 * `escapeInline` existe por una decisión de producto (`docs/product-spec.md`
 * §13.4, "sin markdown en el título"): el título de una tarea es texto
 * plano, así que un título que dice `*urgente*` tiene que copiarse como
 * `*urgente*` literal, no en cursiva. Se aplica también a nombres de
 * proyecto, sección y etiqueta, por el mismo motivo: son texto plano en la
 * base, no markdown.
 *
 * Las reglas de escapado siguen CommonMark: qué caracteres son activos en
 * línea (`escapeInline`), cuáles solo lo son al principio de línea
 * (`escapeLineStart`, para que un título que empieza con "# " o "1. " no se
 * lea como heading o lista), y cuántos backticks hacen falta para delimitar
 * código en línea o un bloque sin que el propio contenido corte la valla
 * (`inlineCode`, `codeFence`).
 */

const INLINE_SPECIAL_CHARS = new Set(["`", "*", "[", "]", "<", "~"]);

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /\w/.test(char);
}

/**
 * Escapa texto plano para que se pegue literal dentro de markdown. El
 * backslash se escapa primero: si se escapara después de los demás
 * caracteres, terminaría escapando también los backslashes que esta misma
 * función acaba de agregar.
 *
 * `_` es un caso aparte: solo abre o cierra énfasis cuando no está entre
 * dos caracteres de palabra (regla de "intraword emphasis" de CommonMark),
 * así que `snake_case` sale intacto y `_texto_` sale escapado.
 */
export function escapeInline(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\\") {
      result += "\\\\";
    } else if (char === "_") {
      result += isWordChar(text[i - 1]) && isWordChar(text[i + 1]) ? "_" : "\\_";
    } else if (INLINE_SPECIAL_CHARS.has(char)) {
      result += "\\" + char;
    } else {
      result += char;
    }
  }
  return result;
}

const LINE_START_RE = /^([ \t]*)(?:(\d+)([.)])|([#>=+-]))/;

/**
 * Escapa, además de lo que ya cubrió `escapeInline`, los caracteres que
 * solo son activos al principio de línea: heading (`#`), blockquote (`>`),
 * lista con viñeta (`-`, `+`), subrayado de heading setext (`=`) y
 * marcador de lista ordenada (`1.`, `1)`). Se usa en la primera línea de
 * cada párrafo del cuerpo de una descripción, donde ese texto podría
 * arrancar con cualquiera de estos caracteres sin que el usuario haya
 * pedido una lista o un heading.
 */
export function escapeLineStart(line: string): string {
  const match = line.match(LINE_START_RE);
  if (!match) return line;
  const [full, leading, digits, orderedPunct, singleMarker] = match;
  const rest = line.slice(full.length);
  if (digits !== undefined) {
    return `${leading}${digits}\\${orderedPunct}${rest}`;
  }
  return `${leading}\\${singleMarker}${rest}`;
}

/**
 * Prepara markdown ya renderizado (no texto crudo) para entrar en una celda
 * de tabla GFM: escapa `|` (delimitador de columna, el único carácter que
 * una celda no puede llevar literal) y convierte los saltos de línea reales
 * en `<br>` (una celda no puede tener un salto real). A propósito NO aplica
 * `escapeInline`: quien arma el contenido de la celda (por ejemplo el
 * pipeline en línea normal de `tiptap-to-markdown.ts`, que ya escapó el
 * texto crudo con `escapeInline` antes de envolverlo en marcas) es
 * responsable de eso. Pasarle a esta función un string que todavía no pasó
 * por ningún escapado propio dejaría `|` y saltos de línea sin resolver.
 */
export function escapeTableCell(markdown: string): string {
  return markdown.replace(/\|/g, "\\|").replace(/\r\n|\n|\r/g, "<br>");
}

/**
 * Prefija cada línea de `block` con `indent`. Las líneas vacías quedan
 * vacías de verdad, sin el indent colgando: un espacio en blanco al final
 * de línea es lo que marca el linter de markdown, y en algunos parsers
 * rompe la continuación del bloque.
 */
export function indentLines(block: string, indent: string): string {
  return block
    .split("\n")
    .map((line) => (line === "" ? "" : indent + line))
    .join("\n");
}

function longestBacktickRun(content: string): number {
  const runs = content.match(/`+/g) ?? [];
  return runs.reduce((max, run) => Math.max(max, run.length), 0);
}

/**
 * Valla de backticks para envolver `content` como bloque de código: mínimo
 * 3, y siempre uno más que la corrida de backticks más larga que haya
 * adentro, para que ninguna corrida interna se confunda con el cierre.
 * Devuelve solo la valla; quien la usa la pone arriba y abajo del bloque.
 */
export function codeFence(content: string): string {
  return "`".repeat(Math.max(3, longestBacktickRun(content) + 1));
}

/**
 * Envuelve `content` en código en línea, con la cantidad de backticks que
 * exige CommonMark (uno más que la corrida más larga adentro) y con
 * padding de un espacio a cada lado cuando hace falta para que la valla no
 * se confunda con el contenido: cuando `content` empieza o termina con
 * backtick, o cuando es todo espacios. El contenido no se escapa: adentro
 * de código en línea el markdown no interpreta nada.
 */
export function inlineCode(content: string): string {
  const fence = "`".repeat(longestBacktickRun(content) + 1);
  const needsPadding = content.startsWith("`") || content.endsWith("`") || /^ +$/.test(content);
  const padded = needsPadding ? ` ${content} ` : content;
  return `${fence}${padded}${fence}`;
}
