## Context

Hoy la vista arma su rango con `visibleDaysForFormat(formato, fechaAncla, inicioDeSemana)` (`lib/calendar/layout.ts:196`): el formato define cuántos días y **dónde empiezan**, anclando la semana al día de inicio configurado. `calendar-nav.tsx` mueve la fecha ancla de a un bloque entero, y `screen-calendar.tsx` pide los datos de ese rango con cuatro hooks (`useCalendarRangeEvents`, `useHabitScheduleOverridesForRange`, `useHabitSkipsForRange`, `useHabitCompletionsForRange`). La grilla se dibuja con CSS Grid, `dayColumnsTemplate(dayCount)` reparte el ancho disponible entre las columnas visibles (`grid-metrics.ts`), y cada columna es un droppable de dnd-kit (`time-grid.tsx:78`).

O sea: **el rango visible, el rango consultado y el conjunto de droppables son el mismo conjunto**, y todos derivan de la fecha ancla. Ese acoplamiento es lo que hay que romper.

Restricciones que ya están decididas y no se tocan acá: la grilla mide 96px por hora y 2304px de alto (`grid-metrics.ts`), un bloque se arrastra con dnd-kit y se redimensiona con handlers de pointer propios, y el fondo vacío tiene selección de rango a mano que en táctil exige doble toque.

## Goals / Non-Goals

**Goals:**
- Desplazamiento horizontal continuo día por día en los formatos de 1, 4 y 7 días.
- Poder arrastrar un bloque a un día que no estaba visible al empezar el gesto.
- Que los días ya vistos y los inmediatamente siguientes estén cargados antes de que aparezcan.
- Que la cantidad de columnas montadas no crezca con lo que se recorrió.

**Non-Goals:**
- El formato mes. Sigue con navegación por páginas y su grilla de semanas, sin cambios.
- Desplazamiento vertical infinito (el día sigue siendo de 24 horas).
- Cambiar el layout de bloques dentro de un día (`layoutTimedBlocksForDay` no se toca).
- Persistir dónde quedó el desplazamiento entre sesiones.

## Decisions

### 1. Un solo contenedor con desplazamiento y pegado en dos ejes

El encabezado de días, la fila de todo el día y la grilla horaria van dentro del **mismo** contenedor con desplazamiento horizontal. La columna de horas queda `position: sticky; left: 0` y el encabezado `position: sticky; top: 0`.

*Por qué*: la alternativa —dos o tres contenedores sincronizando su `scrollLeft` por evento— es la fuente clásica de temblor y desfase de un píxel, y hoy `all-day-row.tsx` y `time-grid.tsx` ya tienen que coincidir columna a columna (por eso existe `grid-metrics.ts`). Con un solo contenedor la coincidencia es estructural y no hay nada que sincronizar.

*Riesgo conocido*: `position: sticky` y los contenedores con `transform` no se llevan bien, y dnd-kit aplica `transform` al overlay. El overlay se renderiza fuera del contenedor con desplazamiento, así que no debería tocarlo; hay que verificarlo temprano.

### 2. El ancho de columna se mide, no se reparte

Deja de servir `minmax(112px, 1fr)`: con desplazamiento, `1fr` se reparte sobre el **contenido**, no sobre lo que se ve. Se mide el ancho del contenedor con un `ResizeObserver` y se publica una variable CSS con el ancho de columna: `(anchoVisible - GUTTER_WIDTH_PX) / cantidadDeDias`.

*Alternativa descartada*: dejar columnas de ancho fijo y que entren las que entren. Rompe la promesa de "ver exactamente 7 días" y contradice el requisito vigente de que las columnas repartan el ancho en pantallas anchas.

### 3. Ventana acotada y grande, no infinito de verdad

Se montan columnas dentro de una ventana de **±1 año alrededor de hoy** (unas 730 columnas), virtualizando: solo se montan las visibles más un margen a cada lado.

*Por qué*: el infinito real exige reposicionar `scrollLeft` al acercarse a los extremos, lo que pelea con el desplazamiento por inercia en táctil, rompe la barra de desplazamiento como referencia y complica el arrastre. Un año para cada lado es más de lo que cualquiera recorre con el dedo, y deja la barra con un significado honesto.

*Consecuencia aceptada*: no es literalmente infinito. Para ir más lejos hay que saltar con el selector de fecha, que es lo razonable a esa distancia.

### 4. Los datos se piden por semana ISO fija, no por rango visible

Cada hook de rango pasa a consultar **por trozos de semana ISO**, con la clave de caché puesta en el trozo. La vista pide los trozos que cubren lo visible más un margen de dos semanas a cada lado.

*Por qué*: si la clave fuera el rango visible, cada día que se corre genera una clave nueva y vuelve a consultar todo. Con trozos fijos, correrse un día reutiliza los siete trozos que ya estaban y a lo sumo pide uno nuevo.

*Alternativa descartada*: una sola consulta enorme al abrir. No escala y desperdicia en el caso común, que es mirar la semana de hoy.

### 5. "Hoy" y los botones cambian de significado, no desaparecen

- **Hoy**: lleva el desplazamiento hasta dejar hoy como primera columna.
- **Anterior / siguiente**: corren la vista **la cantidad de días visibles**, con desplazamiento suave.

*Por qué esa cantidad y no un día*: correr de a uno con un botón obliga a siete clicks para avanzar una semana, y para eso ya está el gesto de desplazar. Que el botón mueva "una pantalla" conserva la utilidad que tenía la paginación.

### 6. El arrastre contra el borde desplaza la vista

Se usa el autodesplazamiento de dnd-kit sobre el contenedor, con `measuring` configurado para volver a medir los droppables mientras cambia el desplazamiento; si no alcanza, se implementa a mano sobre `onDragMove`, que ya existe en `calendar-view.tsx:172`.

*Punto fino*: un día solo es droppable si su columna está montada. La virtualización tiene que mantener el margen montado **también durante el arrastre**, y la sombra de destino (`dragDestination`) tiene que seguir apuntando al día correcto después de que la vista se corrió.

### 7. El formato sigue guardándose igual; su significado cambia

`view_preferences` guarda el mismo valor de formato. `CalendarFormat` conserva sus cuatro valores, pero `dia`, `cuatro-dias` y `semana` pasan a resolverse a una cantidad de columnas (1, 4, 7) en vez de a un rango anclado. `mes` sigue siendo un caso aparte con su propia navegación.

*Por qué no migrar a un número libre*: nadie pidió "9 días", el selector actual funciona, y guardar un entero libre obligaría a validar y a migrar lo guardado sin ganar nada.

### 8. La vista siempre abre en hoy

No se persiste la posición del desplazamiento. Al entrar, hoy queda como primera columna.

*Por qué*: volver a una pantalla y encontrarla en una semana de hace un mes es desconcertante, y el caso frecuente es mirar lo que viene.

## Risks / Trade-offs

- **dnd-kit mide mal los droppables mientras la vista se desplaza** → configurar `measuring` con estrategia `Always` para los droppables durante el arrastre y verificar con un arrastre largo que cruce varias columnas; si el costo de medir es alto, acotar la medición a las columnas montadas.
- **El pegado en dos ejes se rompe en algún navegador** → probar temprano el esqueleto (encabezado pegado arriba, columna de horas pegada a la izquierda) antes de mover nada de la lógica; es el supuesto que sostiene la decisión 1.
- **En táctil, el desplazamiento horizontal compite con el vertical y con crear por arrastre** → el gesto de crear ya exige doble toque, así que un dedo suelto queda libre para desplazar; hay que confirmar que el desplazamiento diagonal no se traba.
- **Rendimiento con columnas altas** → cada columna mide 2304px de alto; virtualizar solo en horizontal y medir con las columnas llenas de bloques, no vacías.
- **La semana deja de estar alineada y se pierde la referencia de dónde empieza** → el encabezado de cada columna ya muestra el día de la semana; si en el uso resulta confuso, la mitigación barata es marcar el inicio de semana con una separación visible, sin volver al imantado.
- **Dos modelos de navegación conviviendo** (continuo para días, páginas para mes) → la barra de navegación tiene que dejar claro qué hace cada botón en cada formato; el riesgo es de interfaz, no técnico.

## Migration Plan

No hay migración de datos: nada cambia en la base ni en lo guardado. El despliegue es el habitual, y volver atrás es revertir el commit.

Orden sugerido para que cada paso sea verificable solo: esqueleto con pegado en dos ejes → ancho medido → virtualización → datos por trozos → navegación → autodesplazamiento en el arrastre.

## Open Questions

- ¿La barra de desplazamiento horizontal se muestra o se oculta? Mostrarla da referencia de dónde estás dentro del año; ocultarla es más limpio y deja el gesto como único medio.
- Con el teclado, ¿qué corre la vista? Hoy no hay atajos de navegación en el calendario; puede quedar fuera de alcance o resolverse con las flechas cuando el foco está en la grilla.
- ¿Cuánto margen virtualizado alcanza? Se propone una pantalla a cada lado; hay que medirlo con datos reales antes de fijarlo.
