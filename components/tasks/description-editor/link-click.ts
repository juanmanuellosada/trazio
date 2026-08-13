import type { EditorView } from "@tiptap/pm/view";

const OPENABLE_SCHEMES = new Set(["http:", "https:"]);

/**
 * Lista blanca de esquemas para abrir un enlace de la descripción
 * (`abrir-un-enlace-de-la-descripcion`, D4 de `design.md`): solo `http` y
 * `https`. `new URL(raw)` **sin base** además descarta las direcciones
 * relativas y las protocolo-relativas (`//evil.com`, típico de HTML pegado
 * de otro sitio), porque ninguna resuelve a un esquema absoluto sin una URL
 * base que acá deliberadamente no se pasa. Nunca lanza: cualquier entrada
 * vacía, inválida o con un esquema fuera de la lista —incluidos
 * `javascript:` y `data:`— da `null`.
 */
export function openableHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return OPENABLE_SCHEMES.has(url.protocol) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Abre un href ya validado por `openableHref` en una pestaña nueva. Sin
 * chequear el valor de retorno de `window.open` (D5 de `design.md`): con
 * `noopener` entre las features, la especificación dice que siempre
 * devuelve `null`, así que comprobarlo daría un falso positivo permanente
 * de "bloqueado". No hay `Referrer-Policy` propia acá: ya la resuelve
 * `next.config.ts` a nivel de toda la ruta.
 */
export function openLinkInNewTab(href: string): void {
  window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * Resuelve el `<a>` de un clic con Ctrl (Cmd en Mac) dentro de `root`, o
 * `null` si el gesto no aplica: solo clic izquierdo, solo con el
 * modificador apretado, y el `<a>` se busca con `closest` desde
 * `event.target` para cubrir un target anidado (por ejemplo un `<strong>`
 * dentro del enlace) y quedar en `null` si el `<a>` encontrado no está
 * contenido en `root`.
 */
export function modifierClickAnchor(root: HTMLElement, event: MouseEvent): HTMLAnchorElement | null {
  if (event.button !== 0) return null;
  if (!event.ctrlKey && !event.metaKey) return null;
  if (!(event.target instanceof Element)) return null;
  const anchor = event.target.closest("a");
  if (!anchor || !root.contains(anchor)) return null;
  return anchor;
}

/**
 * `handleClick` de ProseMirror para abrir un enlace de la descripción con
 * modificador (D1, D2 y D3 de `design.md`): arranca con la guarda
 * `view.editable` para no correr en la vista pública de solo lectura, donde
 * el `<a>` ya se abre solo con un clic simple y este handler duplicaría la
 * pestaña. El href se lee con `anchor.getAttribute("href")`, nunca con
 * `anchor.href`: la propiedad IDL resuelve contra la URL base de la app, así
 * que un href vacío o descartado por Tiptap (`isAllowedUri`) abriría una
 * copia de Trazio en otra pestaña en vez de no abrir nada. Devuelve `true`
 * en cuanto el clic cayó con modificador sobre un enlace —abrible o no—
 * para cortar la cadena que produce `selectClickedNode` en ProseMirror; si
 * el href no pasa `openableHref`, simplemente no llama a `open`. El
 * parámetro `open` es inyectable para los tests.
 */
export function handleLinkModifierClick(
  view: EditorView,
  event: MouseEvent,
  open: (href: string) => void = openLinkInNewTab,
): boolean {
  if (!view.editable) return false;
  const anchor = modifierClickAnchor(view.dom, event);
  if (!anchor) return false;
  const href = openableHref(anchor.getAttribute("href"));
  if (href) open(href);
  return true;
}
