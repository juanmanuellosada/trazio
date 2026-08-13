## 1. Módulo puro de apertura de enlaces

- [x] 1.1 Crear `components/tasks/description-editor/link-click.ts` con `openableHref` (lista blanca `http:`/`https:`, `new URL` sin base, `null` para vacío, relativo, protocolo-relativo y cualquier otro esquema) y `openLinkInNewTab` (`window.open(href, "_blank", "noopener,noreferrer")`), al estilo de `insert-actions.ts`: identificadores en inglés, comentario doc en español citando D3, D4 y D5 de `design.md`
- [x] 1.2 Agregar `modifierClickAnchor(root, event)`: `null` salvo clic izquierdo (`button === 0`) con `ctrlKey || metaKey` sobre un `<a>` que `root` contenga, resuelto con `closest("a")`; el href se lee con `getAttribute("href")`, nunca con `anchor.href`
- [x] 1.3 Agregar `handleLinkModifierClick(view, event, open?)`: `false` si `!view.editable`; `true` cuando el clic cayó con modificador sobre un `<a>` de `view.dom`, abriendo solo si `openableHref` devuelve algo; el parámetro `open` inyectable para los tests

## 2. Enganchar el handler en el editor

- [x] 2.1 En `components/tasks/description-editor/extensions.ts`, agregar la extensión inline `OpenLinkOnModifierClick` (junto a `TaskListWithMarkdown`) con un `Plugin` cuyo `props.handleClick` delegue en `handleLinkModifierClick`, y registrarla después de `Link.configure({ openOnClick: false })`
- [x] 2.2 Actualizar el comentario doc de `descriptionEditorExtensions()`: `openOnClick` sigue en `false` a propósito (clic simple = cursor), el modificador es lo que abre, la guarda `view.editable` es lo que deja intacta la vista pública, y un `handleClick` en `editorProps` le ganaría a este plugin porque `someProp` consulta primero los props del view

## 3. Pista visual y camino sin modificador

- [x] 3.1 En `components/tasks/task-description-editor.tsx`, un `useEffect` que escuche `keydown`/`keyup` y `blur` de `window` y haga `editor.view.dom.toggleAttribute("data-modifier-held", …)` de forma imperativa, sin `useState`, solo mientras el editor es editable, limpiando los listeners al desmontar
- [x] 3.2 Sumar `[&[data-modifier-held]_a]:cursor-pointer` a `EDITOR_CONTENT_CLASS` — nunca a `EDITOR_CONTENT_TYPOGRAPHY_CLASS`, que la comparte la vista pública
- [x] 3.3 En `components/tasks/description-editor/editor-context-menu.tsx`, sumar "Abrir enlace" como primera entrada con icono `ExternalLink`, visible solo cuando `editor.isActive("link")` y el href pasa `openableHref`, seguida de un separador

## 4. Tests

- [x] 4.1 Crear `components/tasks/description-editor/link-click.test.ts` cubriendo `openableHref` (http y https pasan; `javascript:`, `data:`, `mailto:`, sin esquema, `//evil.com`, vacío, espacios, `null`, `undefined` dan `null`)
- [x] 4.2 Cubrir `modifierClickAnchor`: Ctrl+clic y Cmd+clic sobre el `<a>` lo devuelven; clic sin modificador, `button: 1`, texto sin enlace y un `<a>` fuera de `root` dan `null`; un `target` anidado sube con `closest`
- [x] 4.3 Cubrir `handleLinkModifierClick` con un editor real (`descriptionEditorExtensions()`) y `open` inyectado: abre una sola vez con el href correcto; con la vista no editable devuelve `false` y no abre; sin modificador no abre; con una marca `href: "javascript:alert(1)"` insertada por el mismo camino que `handleLinkConfirm` devuelve `true` y no abre
- [x] 4.4 Cubrir `openLinkInNewTab` con `vi.spyOn(window, "open")`: se invoca con `(href, "_blank", "noopener,noreferrer")`
- [x] 4.5 Ampliar `components/tasks/task-description-editor.test.tsx`: con un enlace en la descripción el menú contextual ofrece "Abrir enlace" y al elegirlo llama `window.open`; sin enlace la opción no aparece

## 5. Cierre

- [x] 5.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [x] 5.2 Verificado en el navegador contra el dev server, con una tarea descartable ya borrada: el clic simple deja `TextSelection` con el cursor dentro del enlace y no abre nada; Ctrl+clic llama a `window.open(href, "_blank", "noopener,noreferrer")` una sola vez y la selección sigue siendo de texto (antes del cambio Ctrl+clic dejaba el párrafo seleccionado en bloque); con la vista no editable el handler no abre nada (la guarda de la vista pública); con Ctrl apretado el `<a>` computa `cursor: pointer` y al soltar vuelve a `text`; y el menú contextual ofrece "Abrir enlace" con el cursor dentro del enlace y la esconde al moverlo afuera. Ahí salió el bug del menú contextual obsoleto (`useEditorState`), que los tests no veían por usar un documento donde el enlace cubría todo el párrafo
- [ ] 5.3 Queda para una pasada a mano del dueño lo que la automatización no puede probar: que la pestaña se abra de verdad (Chrome exige un gesto genuino para `window.open`, los eventos sintéticos no cuentan como activación), el clic del medio, y la vista pública de solo lectura de un proyecto compartido. Nota para quien vuelva a automatizar esto: el clic con modificador de Chrome DevTools manda un `mousemove buttons=0` entre el `mousedown` y el `mouseup`, y ProseMirror lo interpreta como "se soltó el botón" y desarma su propio manejador, así que `handleClick` nunca corre; hay que despachar `mousedown`/`mouseup` a mano, sin ese `mousemove`
