## Context

La descripción de una tarea es un editor Tiptap y se guarda como jsonb en
`tasks.description`. El mismo array de extensiones
(`components/tasks/description-editor/extensions.ts`) alimenta dos renderizadores:

- `components/tasks/task-description-editor.tsx`, el lienzo editable del detalle de
  tarea (panel de escritorio, sheet a pantalla completa en móvil y la ruta
  `/tarea/<id>`, los tres a través de `task-detail-content.tsx`).
- `components/public/read-only-description.tsx`, la vista pública de solo lectura, con
  `editable: false`.

Estado actual y sus dos causas, verificadas en el código de las librerías:

1. `Link.configure({ openOnClick: false })` apaga el `clickHandler` de
   `@tiptap/extension-link`, y dentro de un `contenteditable` el navegador tampoco sigue
   un `<a>` por su cuenta. En la vista pública, en cambio, el contenedor no es editable y
   el `<a target="_blank" rel="noopener noreferrer nofollow">` que produce la extensión
   se abre nativamente: **ahí no hay nada que arreglar, y hay algo que romper**.
2. En `prosemirror-view`, `handlers.mousedown` guarda
   `this.selectNode = !!event[selectNodeModifier]` con
   `selectNodeModifier = mac ? "metaKey" : "ctrlKey"`. Si ningún `handleClick` devuelve
   `true`, `handleSingleClick` termina en `selectClickedNode`, que arma un `NodeSelection`
   del bloque. Eso es lo que hoy hace Ctrl+clic sobre un enlace: seleccionar el párrafo.

Restricciones del proyecto que acotan el diseño: `openspec/specs/editor-de-descripcion/spec.md`
prohíbe cualquier diálogo nativo del navegador; `.claude/rules/frontend.md` prohíbe dejar
una acción disponible solo por un gesto y exige camino por teclado; `.claude/rules/copy.md`
fija el vocabulario ("enlace", nunca "link") y sentence case.

## Goals / Non-Goals

**Goals:**

- Abrir un enlace de la descripción con Ctrl+clic (Cmd+clic en Mac), en una pestaña
  nueva, sin tocar el documento ni disparar autoguardado.
- Que el clic simple siga colocando el cursor, y que Ctrl+clic deje de seleccionar el
  párrafo.
- Un camino sin modificador, usable con pantalla táctil y con teclado.
- Una pista visual mínima de que el gesto existe.
- Dejar la vista pública de solo lectura bit a bit como está.

**Non-Goals:**

- Una burbuja flotante al pasar el mouse sobre el enlace (estilo Notion) con vista previa
  o acciones. Es otra pantalla y otro problema.
- Un atajo de teclado nuevo en el registro central (`lib/shortcuts/`): sus atajos no
  disparan con el foco en un campo de texto, que es exactamente donde está el foco acá.
- Abrir `mailto:` y `tel:`. Hoy no se abren, y `window.open` de un esquema con handler
  externo deja un `about:blank` colgado en varios navegadores. Sumarlos después es
  agregar una string a un `Set`.
- Cambiar cómo se guarda un enlace, ni sanear los que ya están guardados.

## Decisions

### D1: un `handleClick` de ProseMirror, no `handleDOMEvents.mousedown` ni `openOnClick`

`openOnClick: true` no sirve: abriría con el clic simple, que es el gesto de colocar el
cursor. `openOnClick: 'whenNotEditable'` tampoco: el problema es justamente el editable.
La extensión no tiene opción de modificador.

Entre los dos ganchos posibles:

- `handleClick(view, pos, event)` corre en el `mouseup`, y devolver `true` corta la cadena
  que produce `selectClickedNode` —o sea, arregla de una la selección del párrafo— y
  ProseMirror hace el `preventDefault` por nosotros.
- `handleDOMEvents.mousedown` devolviendo `true` cancelaría `handlers.mousedown` completo
  y con él el arrastre, el doble clic y el origen de la selección. Riesgo alto, beneficio
  nulo.

Se elige `handleClick`.

### D2: el plugin va en `extensions.ts`, con guarda `view.editable`, no en `editorProps` del componente

`extensions.ts` ya tiene el precedente de extensión inline (`TaskListWithMarkdown`), y un
plugin es alcanzable desde un test headless con `editor.view.someProp("handleClick")`, el
mismo recurso que ya usa `markdown-input-rules.test.ts` con `handleTextInput`; desde
`editorProps` de React no hay forma de llegar al `view` en un test.

El costo de esa elección es que `extensions.ts` lo comparte la vista pública, y los
`handleClick` de un plugin corren también con la vista no editable. Sin guarda, en la
vista pública se abrirían dos pestañas: la nativa del `<a>` y la nuestra. Por eso el
handler arranca con `if (!view.editable) return false`, la misma guarda que usa
`clickHandler` de `@tiptap/extension-link`. Queda anotado en el código que un
`handleClick` puesto en `editorProps` le ganaría a este plugin, porque `someProp` consulta
primero los props del view.

Se descarta `Link.extend`: su `clickHandler` con `openOnClick: false` ya devuelve `false`
y no molesta, y una extensión aparte no depende de `this.parent()` ni del orden interno de
sus plugins.

### D3: el href sale del DOM (`closest("a")`), no de las marcas de la posición

Tres razones: es el elemento que la persona efectivamente apuntó; en el borde de un
enlace la marca en `pos` y el `<a>` bajo el puntero no coinciden; y el `renderHTML` de la
extensión ya pasó el href por `isAllowedUri`, así que el DOM está saneado y las marcas
del documento no.

Detalle que no es cosmético: se lee `anchor.getAttribute("href")`, nunca `anchor.href`. La
propiedad IDL resuelve contra la URL base, así que un `href=""` —lo que produce Tiptap
cuando descarta un esquema— devolvería la URL de Trazio y abriríamos una copia de la app
en otra pestaña.

### D4: lista blanca `http`/`https`, validada con `new URL` sin base

No es paranoia de más. `normalizeUrl` (`link-dialog.tsx`) acepta cualquier
`^[a-z][a-z0-9+.-]*:`, y `handleLinkConfirm` (`task-description-editor.tsx`) inserta la
marca con `insertContent`, que saltea la validación `isAllowedUri` que sí hace el comando
`setLink`: un `javascript:` puede quedar guardado en el jsonb. Y la descripción también
puede llegar desde el servidor MCP o cualquier ruta de API con JSON arbitrario.

`new URL(raw)` **sin base** además descarta las direcciones relativas y las
protocolo-relativas (`//evil.com`), típicas de HTML pegado de otro sitio.

Si el clic tuvo modificador y cayó sobre un `<a>` con un href no abrible, el handler
igual devuelve `true`: no abre nada, pero tampoco deja la selección de nodo de
ProseMirror. Fallar en silencio es correcto acá: el aviso pertenece al momento de guardar
ese href, no al de intentar abrirlo.

### D5: sin detección de popup bloqueado

Con `noopener` en las features, `window.open` devuelve `null` **siempre**, por
especificación: chequear el valor de retorno daría un falso positivo permanente. Y la
llamada ocurre dentro de un gesto del usuario, que es contexto de activación válido, así
que los bloqueadores no aplican. No hay toast.

### D6: el camino sin modificador es el menú contextual, no un botón en la barra ni en el diálogo

El menú contextual propio del editor ya existe (`editor-context-menu.tsx` sobre
`AppContextMenu`), ya resuelve clic derecho, navegación con flechas, `Escape` y apertura
manteniendo presionado en táctil, y la tecla Menú / Shift+F10 lo alcanza por teclado. Se
le suma "Abrir enlace" como primera opción, visible solo cuando el cursor está en un
enlace con href abrible.

Se descarta un botón en la barra de herramientas (la barra es de formato, no de
navegación) y un botón "Abrir" en el diálogo del enlace (sería un tercer camino para la
misma acción; el diálogo es para editar la URL).

### D7: el cursor de mano se aplica de forma imperativa, y solo en el lienzo editable

No existe selector de CSS para "modificador apretado", así que hace falta escuchar
`keydown`/`keyup` en `window` (más `blur` de `window`, para no quedar con el cursor de
mano pegado si se cambia de ventana con la tecla apretada). El estado se escribe con
`toggleAttribute` sobre `editor.view.dom`, sin `useState`: un re-render del detalle de
tarea por cada pulsación de Ctrl sería absurdo.

La clase que lo aplica va en `EDITOR_CONTENT_CLASS`, no en
`EDITOR_CONTENT_TYPOGRAPHY_CLASS`, que es la constante que comparte la vista pública.

## Risks / Trade-offs

- **Doble apertura en la vista pública** si alguien saca la guarda `view.editable` →
  mitigado con un test que llama al handler con una vista no editable y verifica que
  devuelve `false` y no abre, más un paso de verificación manual en la vista pública.
- **Safari y el "editable link live when not focused"**: WebKit puede activar un `<a>`
  dentro de un `contenteditable` sin foco, lo que sumado a nuestro `window.open` daría dos
  pestañas → se verifica a mano en Safari si hay a mano; el patrón de la propia librería
  (`openOnClick: true` hace `window.open` sin `preventDefault` y nadie reporta duplicado)
  sugiere que no ocurre en Blink ni Gecko. Si aparece, la mitigación es un
  `handleDOMEvents.click` con la misma guarda que cancele la activación nativa.
- **Ctrl+clic pierde "seleccionar el nodo"** dentro de un enlace: es un gesto de
  ProseMirror que nadie usa a propósito en un campo de descripción, y sobre texto sin
  enlace sigue intacto. Trade-off aceptado.
- **La pista visual depende del `keydown`**: si el foco está en otra ventana cuando se
  aprieta Ctrl, el cursor no cambia hasta la primera pulsación con la ventana activa.
  Aceptado: el gesto funciona igual, solo la pista llega tarde.
- **`extensions.ts` es compartido**, así que todo lo que se agregue ahí hay que pensarlo
  dos veces, una por cada renderizador. Este cambio lo asume explícitamente en D2.
