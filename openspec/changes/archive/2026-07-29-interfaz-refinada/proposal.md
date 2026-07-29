## Why

El cambio anterior reemplazó todo lo que era del navegador por componentes propios. El dueño lo probó y su devolución fue que está muchísimo mejor — y trajo una lista de ajustes que ya no son sobre qué falta, sino sobre **cómo se siente usarlo**.

Esa distinción importa. Los problemas de la ronda anterior eran estructurales: campos nativos, un alta que pedía solo el título, una configuración que era una página. Los de esta ronda son de fricción: un selector de hora que no deja escribir, cuatro botones que no llenan su fila, un símbolo que abre lo que no esperabas. Ninguno rompe nada, y todos aparecen a los cinco minutos de uso real.

Hay además tres cosas que cambian decisiones tomadas, y las tres se resolvieron explícitamente antes de escribir esto.

## What Changes

**El parser gana menús y cambia sus símbolos**
- **BREAKING**: `#` pasa a elegir **proyecto y sección**, y `@` pasa a elegir **etiqueta**. Hoy es al revés, y está fijado en los casos 40 a 43 y 53 del contrato. Se adopta la convención de Todoist, que es de donde viene el público del producto.
- Al escribir un símbolo se abre un **menú para elegir**, en vez de resolver recién al confirmar. Con `#` el menú muestra los proyectos con sus secciones anidadas; con `@`, las etiquetas existentes.
- Se conserva lo que ya funciona: desactivar un reconocimiento con doble clic para que la palabra quede como texto.

**Las etiquetas dejan de ser a medias**
- Pantalla propia para **crear, renombrar, recolorear y eliminar** etiquetas, con el mismo selector de color que los proyectos.
- En cada tarea, un **selector con búsqueda y selección múltiple** sobre las etiquetas que existen.
- Se adelanta desde la fase 2, donde el roadmap la ubica. La página por etiqueta y las favoritas siguen ahí.

**Los selectores de la tarea**
- **Hora**: se puede escribir además de elegir.
- **Duración**: opciones, escritura libre, y **elegir la unidad** en vez de asumir minutos siempre.
- **Accesos rápidos de fecha**: dos filas de dos, cada una ocupando todo el ancho. Hoy la primera queda corta.
- **Prioridad**: se muestra como **P1 a P4 con su nombre al lado**, y la prioridad 3 pasa a un azul más visible.
- **Proyecto**: selector en el detalle, precargado con el proyecto donde se creó la tarea y editable, que despliega proyectos con sus secciones anidadas.

**El editor**
- **Autodetección de formato en línea** mientras se escribe: negrita, cursiva y el resto, no solo títulos y listas.

**Las superficies de alta**
- El acceso del panel lateral abre **el mismo modal que el detalle**, vacío.
- El alta dentro de una lista o una sección abre un **modal incrustado y compacto**, con menos campos y aprovechando el ancho.

**El ancho**
- El contenido se **centra** cuando hay lugar para que los márgenes se lean como aire, y queda a la izquierda por debajo de ese umbral.

**Fuera de este cambio:** la página por etiqueta y las etiquetas favoritas siguen siendo fase 2.

## Capabilities

### New Capabilities

- `menus-del-parser`: Los menús que se abren al escribir un símbolo en el título, con proyectos y sus secciones para `#` y etiquetas para `@`, y su relación con el reconocimiento que ya existe.
- `administracion-de-etiquetas`: Crear, renombrar, recolorear y eliminar etiquetas desde una pantalla propia, y el selector con búsqueda y selección múltiple en cada tarea.

### Modified Capabilities

- `parser-lenguaje-natural`: `#` pasa a proyecto y sección, `@` a etiqueta. Cambian los casos 40 a 43 y 53 del contrato.
- `selectores-de-atributos`: Hora y duración admiten escritura, la duración suma unidades, los accesos rápidos de fecha se reacomodan, y la prioridad cambia de nombres y de color.
- `tareas`: El detalle suma selector de proyecto con secciones anidadas.
- `alta-de-tareas`: Dos superficies con tratamiento distinto — modal completo desde el panel lateral, modal incrustado y compacto dentro de las listas.
- `editor-de-descripcion`: Autodetección de formato en línea.
- `vistas-lista`: El contenido se centra por encima de un umbral de ancho.
- `etiquetas`: Deja de tener alcance mínimo.

## Impact

**Código.** Toca el reconocedor de símbolos del parser, los selectores del bloque anterior, el editor, las superficies de alta y el layout de las vistas. Suma una pantalla nueva para etiquetas.

**El contrato del parser.** Cinco casos cambian de significado y hay que reescribirlos en `docs/parser-test-cases.md`, que es la fuente de verdad. El test que compara el contrato contra el código va a marcar la diferencia, que es exactamente para lo que existe.

**La demo de la landing.** El caso 53 aparece en la demo del parser con `#trabajo @Proyectos`. Al invertirse los símbolos, ese ejemplo pasa a significar otra cosa y hay que actualizarlo.

**Documentación.** `docs/product-spec.md` §6 fija hoy que `#` es etiqueta y `@` proyecto. `docs/design-system.md` fija los nombres y colores de prioridad. `docs/decisions.md` registra la inversión de símbolos, el cambio de nombres de prioridad, el adelanto de las etiquetas y el criterio de centrado.

**Riesgo principal.** La inversión de símbolos es un cambio de contrato, no de interfaz. Si queda a medias —el reconocedor invertido y la documentación no, o la demo de la landing mostrando lo viejo— el producto se contradice a sí mismo en la pantalla que usa para convencer.
