## Why

La fase 1 dejó el producto funcionando: auth, esquema con RLS, tareas, proyectos, vistas, parser y Realtime. Lo que no dejó es un producto que **se sienta propio**. El dueño lo usó por primera vez y la lista de problemas no es de funcionalidad rota: es de interfaz que se lee como ensamblada en vez de fabricada.

El diagnóstico que ordena todo lo demás es suyo y es el correcto: **ningún elemento visual puede ser el que trae el navegador por defecto**. Hoy hay tres campos de fecha nativos en el detalle de una tarea y un cuadro de diálogo del navegador pidiendo la URL de un enlace. Cada uno de esos rompe la ilusión de estar en una aplicación y la reemplaza por la de estar en una página web.

El resto de los problemas son consecuencia del mismo origen: se construyó lo que hacía falta para que la funcionalidad existiera, sin construir el vocabulario visual que la sostiene. Agregar una tarea pregunta solo el título porque no hay un componente de alta; el detalle abre a un costado porque un panel es más barato que un modal; el modal de proyecto pide el emoji escribiéndolo porque no hay selector de emojis.

Y hay un error de arquitectura visual que es mío: recomendé un ancho máximo fijo de 768 píxeles para resolver que los datos de una tarea quedaban lejos de su título en pantallas anchas. Resolvió eso y creó lo contrario — en escritorio la app se ve con ancho de teléfono.

## What Changes

**El sistema de componentes**
- Regla nueva y transversal: **todo control interactivo es un componente propio**. Nada de campos de fecha, de hora, de color, ni de selección nativos. Nada de `confirm`, `alert` ni `prompt` del navegador.
- Auditoría y reemplazo de lo que hoy es nativo: tres campos de fecha en el detalle de tarea, y el cuadro de diálogo que pide la URL de un enlace en el editor.
- Diálogos de confirmación propios, incluido el de borrado de proyecto.

**El ancho**
- El ancho de contenido pasa de fijo a **adaptativo**: cómodo en teléfono, aprovechando el espacio en escritorio, sin volver al problema de la metadata a mil doscientos píxeles del título.

**El alta de tareas**
- Un **componente de alta rico y reutilizable**, con título, descripción y accesos a fecha, prioridad, etiquetas, fecha límite y proyecto destino. Reemplaza al alta de solo título en **todas** las superficies: vistas, secciones y subtareas.

**El detalle de tarea**
- Pasa de panel lateral a **modal centrado por encima de la pantalla**. **BREAKING** respecto de `docs/product-spec.md` §3, que especifica panel lateral redimensionable que recuerda el ancho.

**Los selectores de atributos**
- **Fecha**: campo de texto que entiende lenguaje natural, accesos rápidos con su día, calendario mensual, y hora con duración.
- **Fecha límite**: el mismo lenguaje, adaptado a que es una fecha tope y no una fecha de trabajo.
- **Prioridad**: selector con las cuatro prioridades, su color y su nombre, reutilizado en todo el sistema.

**El editor de descripción**
- Zona de edición delimitada visualmente.
- Barra de herramientas completa: títulos, negrita, cursiva, tachado, resaltado, código, listas, cita.
- **Autodetección de sintaxis de markdown** al escribir.
- **Menú contextual propio** con formato, párrafo e insertar, en lugar del menú del navegador.

**El modal de proyecto**
- Color por lista desplegable con nombre y muestra, más un **selector de color personalizado** al final.
- **Selector de emojis** con todos los emojis, categorizados y buscables, en lugar de escribirlo.
- Elegir **proyecto padre** al crear, con "sin padre" por defecto.
- Marcar **favorito** desde el alta.

**La configuración**
- Pasa de página a **modal con secciones** navegables. Solo las secciones que hoy tienen contenido real.
- Vincular y desvincular la cuenta de Google desde ahí.

**El panel lateral**
- Botón de **agregar tarea**.
- Botón de colapsar más claro y opciones de cuenta agrupadas en un menú.

**Fuera de este cambio, y no por omisión:**
- La barra de opciones de vista, la vista Próximos, la administración de etiquetas y los recordatorios son **fase 2**: están en el alcance de esa fase en `docs/roadmap.md`.
- **Adjuntar archivos** aparece en la referencia visual del alta de tareas, pero está fuera de alcance de forma permanente por `docs/product-spec.md` §13.
- **Zona horaria por tarea** aparece en la referencia del selector de fecha, pero no existe en el modelo de datos: la zona es una preferencia de la cuenta.

## Capabilities

### New Capabilities

- `sistema-de-componentes`: La regla de que todo control interactivo es propio de la aplicación, el inventario de lo que hoy es nativo y debe reemplazarse, y las primitivas compartidas —capas, diálogos, menús contextuales— sobre las que se construye el resto.
- `alta-de-tareas`: El componente de alta rico y reutilizable, con sus atributos y su comportamiento en cada superficie donde se crea una tarea, incluidas las subtareas.
- `selectores-de-atributos`: Los selectores de fecha, fecha límite y prioridad, con su comportamiento, su entrada por lenguaje natural y su reutilización en todo el sistema.
- `editor-de-descripcion`: La zona de edición, la barra de herramientas, la autodetección de markdown y el menú contextual propio.

### Modified Capabilities

- `tareas`: El detalle pasa de panel lateral a modal centrado, y el alta deja de pedir solo el título.
- `proyectos-secciones`: El modal de proyecto suma selector de color con opción personalizada, selector de emojis, proyecto padre y favorito.
- `configuracion`: Pasa de página a modal con secciones, y suma la vinculación de la cuenta de Google.
- `vistas-lista`: Ancho adaptativo, y el panel lateral suma el botón de agregar tarea y el menú de cuenta agrupado.

## Impact

**Código.** Es el cambio con más superficie de interfaz del proyecto hasta ahora. Toca `components/` casi entero, agrega un conjunto de primitivas propias, y reemplaza los tres campos de fecha nativos y el cuadro de diálogo de enlace que quedan en el código.

**Dependencias.** El editor necesita extensiones de Tiptap que hoy no están instaladas —hoy solo hay `starter-kit` y `link`—, y el selector de emojis necesita una fuente de datos de emojis categorizada. Ambas cosas caen fuera de la lista cerrada de `AGENTS.md` y se registran como decisiones antes de instalarse.

**Documentación.** `docs/product-spec.md` §3 cambia en la parte del detalle de tarea. `docs/design-system.md` suma el ancho adaptativo, las primitivas y la regla de componentes propios. `docs/decisions.md` registra el cambio de superficie del detalle, la excepción al color de paleta fija, y las dependencias nuevas.

**Riesgo principal.** El volumen. Es más trabajo de interfaz que el que hizo la fase 1 entera, y toca componentes que hoy funcionan. El orden de las tareas tiene que empezar por las primitivas, porque todo lo demás se construye encima: si se hacen los selectores antes que las capas y los diálogos, hay que rehacerlos.

**Dependencia de secuencia.** La fase 1 tiene tres tareas sin cerrar y su cambio de OpenSpec sigue activo, sin archivar. Este cambio toca capacidades definidas ahí. Hay que decidir si se archiva la fase 1 antes de aplicar este, o si conviven.
