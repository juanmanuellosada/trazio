/**
 * Combina lo que llega al destino de compartir (`app/compartir/route.ts`,
 * D-B del design de `accesos-directos-y-compartir`) en el texto que se
 * precarga en el alta rápida. Cada aplicación reparte `title`, `text` y
 * `url` de forma distinta —algunas mandan el título en `title`, otras todo
 * en `text`— así que ninguno de los tres se asume presente ni con un rol
 * fijo (D-B: "no asumas cuál viene").
 *
 * Regla: el título, si vino, es el texto de la tarea; si no vino, el texto
 * lo es; si tampoco vino texto, el enlace suelto hace de texto. Lo que sobra
 * —el enlace y, si estaba junto al título, el texto— va a la descripción
 * (escenario "Compartir un enlace con título" del spec delta).
 *
 * D-A: esto nunca crea la tarea, solo arma el texto — la creación siempre
 * pasa por la confirmación manual del alta rápida.
 */
export type SharedFields = {
  title: string | null;
  text: string | null;
  url: string | null;
};

export type CombinedShare = {
  /** Texto que se precarga en el título del alta rápida. */
  text: string;
  /** Texto plano que se precarga en la descripción, o `null` si no sobró nada. */
  description: string | null;
};

// Mismo límite que `taskTitleSchema` en `lib/validation/tasks.ts`: un texto
// compartido que lo supere (tarea 3.1, un artículo entero pegado) se corta
// ahí, y lo que sobra pasa a la descripción en vez de perderse o de bloquear
// la confirmación con un error de validación que la persona no pidió.
const TITLE_MAX_LENGTH = 500;

function splitAtTitleLimit(text: string): { title: string; overflow: string | null } {
  if (text.length <= TITLE_MAX_LENGTH) return { title: text, overflow: null };
  return { title: text.slice(0, TITLE_MAX_LENGTH), overflow: text.slice(TITLE_MAX_LENGTH).trim() || null };
}

export function combineSharedContent(fields: SharedFields): CombinedShare {
  const title = fields.title?.trim() ?? "";
  const text = fields.text?.trim() ?? "";
  const url = fields.url?.trim() ?? "";

  let primary = "";
  let extras: string[] = [];

  if (title) {
    primary = title;
    extras = [text, url].filter((part) => part && part !== title);
  } else if (text) {
    primary = text;
    extras = [url].filter((part) => part && part !== text);
  } else if (url) {
    primary = url;
  }

  const { title: truncated, overflow } = splitAtTitleLimit(primary);
  if (overflow) extras.unshift(overflow);

  return { text: truncated, description: extras.length ? extras.join("\n\n") : null };
}
