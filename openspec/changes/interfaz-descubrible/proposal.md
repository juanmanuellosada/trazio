## Why

Trazio tiene un sistema completo de atajos de teclado desde la fase 2 — el acorde
`G`, los del detalle de tarea, los del menú contextual — y **la interfaz no anuncia
ni uno solo**. En la práctica no existen: solo los conoce quien leyó el spec.

Al mismo tiempo, la cabecera de cada pantalla acumuló ruido. La barra de opciones
es una tira plana de siete controles sueltos que en un teléfono ya se envuelve, y
el título repite el ícono que el panel lateral muestra a diez centímetros.

Esta es la tercera ronda de refinamiento, después de usar la aplicación con las
cuatro fases en producción. Las tres cosas apuntan a lo mismo: **menos ruido, más
descubrimiento.**

## What Changes

**La barra de opciones pasa a ser un panel agrupado**

- Un único disparador en la cabecera abre un panel con tres secciones: **Vista**
  (lista, panel, calendario, y el formato de calendario cuando corresponde),
  **Orden** (agrupar por, ordenar por) y **Filtro** (fecha límite, prioridad,
  etiqueta).
- Adentro también el interruptor de completadas, el de hábitos, y restablecer.
- **Todo va adentro**, incluido el selector de forma de ver. La cabecera queda con
  el título y nada más.
- Nada cambia en qué hacen las opciones ni en cómo se guardan: `view_preferences`
  y su esquema quedan igual.

**Indicadores de atajo en toda la aplicación**

- Donde hay un atajo, se ve: el panel lateral, los menús contextuales, y los
  botones que tengan uno.
- Un componente compartido para el indicador, no la marca repetida en cada lugar.
- **No se muestran en ancho de teléfono**, donde no hay teclado que los use.

**Los atajos de navegación se localizan**

- `G T` (Today) pasa a **`G H`** de Hoy.
- `G U` (Upcoming) pasa a **`G P`** de Próximos.
- `G I`, `G C` y `G A` se mantienen: ya eran mnemónicos en español.

Mientras los atajos estaban invisibles, que fueran mnemónicos en inglés no molestaba
a nadie. En el momento en que la pantalla los muestra, `T` junto a "Hoy" es una
letra que no se corresponde con nada. Es coherente con **D4**, que fija que el
producto es solo en español, y con lo que hace el propio Todoist en su versión en
español.

**El título de cada sección pierde su ícono**

- El encabezado muestra un ícono que el panel lateral ya muestra al lado. Se saca,
  en todas las secciones.

Ninguno de estos cambios es **BREAKING** en datos. El único cambio de comportamiento
observable es que dos atajos de navegación cambian de tecla.

## Capabilities

### New Capabilities

- `indicadores-de-atajo`: dónde se muestran, cómo se ven, y la regla de que un
  indicador nunca puede anunciar un atajo que no funciona.

### Modified Capabilities

- `opciones-de-vista`: la barra plana pasa a ser un panel agrupado con un único
  disparador; el selector de forma de ver deja de estar suelto en la cabecera.
- `atajos-de-teclado`: `G T` pasa a `G H` y `G U` pasa a `G P`.

El ícono del encabezado **no genera delta de spec**: ninguna capacidad lo fija. Se
revisó `vistas-lista` completo y sus menciones al título son sobre el título de una
tarea en la fila, no sobre el encabezado de la vista. Es un detalle de presentación
que el spec nunca definió, así que se cambia sin requisito que actualizar.

## Impact

**Código.** `components/view-options/view-options-bar.tsx` se reorganiza por
completo. Componente nuevo para el indicador de atajo, usado desde
`components/layout/sidebar-content.tsx`, `components/tasks/task-row.tsx` y los
menús. `lib/shortcuts/chord.ts` cambia dos letras, con sus tests y los de
`components/shortcuts/shortcut-provider.tsx`. Los encabezados en
`components/tasks/proximos-view.tsx`, `completed-view.tsx`,
`components/projects/sectioned-tasks.tsx` y `project-header.tsx`.

**Documentación.** La sección 10 de `docs/product-spec.md` fija hoy `G T` y `G U`:
hay que corregirla junto con el spec.

**Dependencias.** Ninguna nueva.

**Fuera de alcance.** No se agregan atajos nuevos ni se cambia ninguno más allá de
las dos letras. No se toca qué opciones existen ni cómo se persisten. No se
construye una pantalla de ayuda con la lista completa de atajos — puede tener
sentido más adelante, pero no es lo que resuelve el problema de hoy.
