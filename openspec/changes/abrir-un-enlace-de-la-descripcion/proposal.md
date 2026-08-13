## Why

En la descripción de una tarea se pueden poner enlaces —el editor los detecta al
escribir, al pegar y con el botón de la barra— pero no hay forma de abrirlos. El clic
simple coloca el cursor (correcto: es un editor), el navegador no sigue un `<a>` dentro
de un `contenteditable`, y Ctrl+clic, que es el gesto que todo el mundo prueba, hoy
hace algo peor que nada: selecciona el párrafo entero, porque ProseMirror usa ese
modificador para seleccionar el nodo. Un enlace guardado en una descripción es hoy
texto decorado que hay que copiar a mano.

## What Changes

- Ctrl+clic (Cmd+clic en Mac) sobre un enlace de la descripción lo abre en una pestaña
  nueva, sin mover el cursor y sin dejar el párrafo seleccionado.
- El clic sin modificador no cambia: sigue colocando el cursor.
- Mientras Ctrl o Cmd está apretado, el puntero pasa a mano sobre un enlace, como en un
  editor de código. Es la única pista de que el gesto existe.
- El menú contextual del editor suma "Abrir enlace" como primera opción cuando el cursor
  está dentro de un enlace. Es el camino sin Ctrl: en el celular no hay modificador, y
  `.claude/rules/frontend.md` prohíbe dejar una acción disponible solo por un gesto.
- Solo se abren los esquemas `http` y `https`. Un `javascript:`, un `data:` o un href
  relativo no se abren nunca, aunque estén guardados en la descripción.
- La vista pública de solo lectura (`enlace-de-lectura-de-un-proyecto`) queda
  exactamente como está: ahí el enlace ya lo abre el navegador de forma nativa, y el
  cambio se guarda de duplicar esa apertura.

Sin cambios de esquema, sin migración, sin dependencia nueva.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `editor-de-descripcion`: se agrega el requisito de poder abrir un enlace de la
  descripción —con modificador y por el menú contextual—, con la lista blanca de
  esquemas y la garantía de que el clic simple sigue colocando el cursor. Hoy el spec
  solo habla de insertar y editar enlaces sin diálogo nativo, no de abrirlos.

## Impact

- `components/tasks/description-editor/link-click.ts` (nuevo): módulo puro que decide si
  un clic abre, valida el esquema y abre la pestaña.
- `components/tasks/description-editor/extensions.ts`: extensión propia con un
  `handleClick` de ProseMirror. Es el archivo que comparten el editor y la vista
  pública, así que el handler lleva la guarda `view.editable`.
- `components/tasks/task-description-editor.tsx`: el cursor de mano mientras el
  modificador está apretado (atributo imperativo sobre el DOM del editor, sin estado de
  React) y la clase que lo aplica, solo en el lienzo editable.
- `components/tasks/description-editor/editor-context-menu.tsx`: la opción "Abrir
  enlace".
- Tests: `description-editor/link-click.test.ts` (nuevo) y dos casos más en
  `task-description-editor.test.tsx`.
- Sin cambios en la base de datos, en la API ni en el servidor MCP.
