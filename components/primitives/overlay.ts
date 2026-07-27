/**
 * Contrato compartido de toda capa superpuesta de Trazio (bloque 2.2):
 * diálogo, confirmación, menú contextual y selector desplegable se montan
 * como capa **modal** de Base UI (`modal` en el `Root` de cada primitiva de
 * shadcn/ui). Es Base UI, no código propio, quien resuelve con eso el
 * montaje por encima del resto del contenido y el bloqueo del scroll de
 * fondo mientras la capa está abierta — reimplementarlo sería el error que
 * `design.md` sección A2 pide evitar.
 *
 * `Dialog`, `AlertDialog` y `Menu` (de donde salen `ContextMenu` y
 * `DropdownMenu`) ya tienen `modal: true` por defecto en shadcn/ui. La
 * excepción es `Popover`, que por defecto es `modal: false` — así es como
 * hoy `timezone-combobox.tsx` no bloquea el scroll de fondo al abrirse.
 * Todas las primitivas de este directorio importan esta constante en vez de
 * decidir cada una su propio valor, para que ese comportamiento sea
 * consistente y quede en un solo lugar si alguna vez cambia.
 */
export const OVERLAY_MODAL = true;
