> **El grupo 1 es el que puede arruinar todo lo demás.** Hoy las tareas no esperan a Google, y esa
> propiedad se rompe sin querer con un `Suspense` o un estado de carga compartido.
>
> **Hoy casi no tiene pruebas**: una sola, sobre centrado, con todo mockeado. Lo que se rompa acá no
> lo atrapa el gate.
>
> **Se juzga con una lista mezclada de verdad** —eventos con hora, uno de todo el día, uno que viene
> de ayer, tareas con y sin hora— no con dos filas de prueba.

## 1. El desacople, que ya existe y hay que conservar

- [x] 1.1 Las tareas se pintan **sin esperar a Google**. Nada de `Suspense`, `enabled` cruzado ni un `isLoading` compartido entre las dos consultas
- [x] 1.2 Los eventos se insertan cuando llegan. **Sin esqueleto de carga** (**D-E**): no se sabe cuántos van a ser, y uno del alto equivocado desplaza el contenido dos veces
- [x] 1.3 Sin Google conectado, Hoy se ve **exactamente como antes de este cambio**: sin huecos, sin avisos, sin lugar reservado
- [x] 1.4 Google caído: las tareas igual, más **un** aviso al pie. Nunca uno por fila
- [x] 1.5 Distinguir "no conectado" de "falló": hoy son dos estados distintos y solo el segundo avisa

## 2. El orden

- [x] 2.1 Tres tramos (**D-A**): todo el día y los que vienen de antes; después lo que tiene hora, mezclado; después las tareas sin hora
- [x] 2.2 **Comparar instantes absolutos, nunca textos de hora.** Los eventos traen zona horaria propia y las tareas usan la del usuario
- [x] 2.3 Empate a la misma hora: **primero el evento**. Con eso el orden es total y no depende de cuál consulta respondió antes
- [x] 2.4 Un evento que empezó ayer va al primer tramo. **Hoy muestra la hora de ayer**: ese es el defecto que esto arregla, verificalo explícitamente
- [x] 2.5 Las atrasadas siguen en su bloque propio, arriba. No se mezclan
- [x] 2.6 Ojo con el orden configurable: en Hoy el default es por fecha y **no hay arrastre montado**. Si el usuario elige otro criterio —nombre, prioridad—, decidí qué pasa con los eventos y **contame qué elegiste**

## 3. La fila de evento

- [x] 3.1 Una fila hermana (**D-C**), que reusa el esqueleto visual de la fila de tarea y la primitiva de menú. **No vuelvas polimórfica a `TaskRow`**: tiene cuatro mutaciones de tarea adentro, subtareas recursivas y veintisiete ítems de menú
- [x] 3.2 **Sin** casilla de completar, punto de prioridad, chevron, manija de arrastre ni casilla de selección
- [x] 3.3 Nivel uno: color del calendario, título, y el **nombre del calendario anclado a la derecha**, donde la tarea pone su proyecto
- [x] 3.4 Nivel dos: rango horario y ubicación si tiene
- [x] 3.5 **Trampa heredada**: hay una prueba que busca el punto de prioridad con un selector de CSS crudo, por ser redondo y estar oculto a los lectores. La marca de color no puede tener esas dos características
- [x] 3.6 **Segunda trampa**: la fila de tarea llama al gancho de arrastre incondicionalmente, aun sin contenedor alrededor. No copies eso
- [x] 3.7 Consultá `ui-ux-pro-max` antes de decidir el tratamiento visual. Es la cuarta ronda y el criterio ya está establecido

## 4. Editar el evento

- [x] 4.1 Doble clic abre el diálogo de edición que **ya existe**
- [x] 4.2 Por **D24**, también desde el menú contextual y el botón de acciones, **compartiendo una sola lista** como hace la fila de tarea
- [x] 4.3 El menú: editar, abrir en Google Calendar, eliminar. Nada de fecha, prioridad, subtareas ni duplicar
- [x] 4.4 **Calendario de solo lectura**: se abre igual, sin permitir editar, y dice por qué. El permiso vive en el calendario, no en el evento: hay que cruzar contra la lista de calendarios
- [x] 4.5 En teléfono, un toque abre. Igual que la fila de tarea, para que el gesto no dependa del tipo de fila

## 5. Los formatos en Hoy

- [x] 5.1 Hoy pasa a ofrecer lista, panel y calendario. Hoy monta la barra con la bandera de forma de ver apagada y su cuerpo no tiene el `if` de formato que sí tienen Próximos y Proyecto
- [x] 5.2 **El calendario, siempre en modo día** (**D-F**), forzado al dibujar y no leído de lo guardado. Ese valor ya existe en el esquema: **no hace falta migración**
- [x] 5.3 **Sin selector de formato de calendario en Hoy**, ni siquiera deshabilitado
- [x] 5.4 **Sin navegación entre días.** La vista de calendario siempre la dibuja: hay que poder montarla sin ella
- [x] 5.5 El panel muestra **solo tareas** (**D-B**), y avisa cuando hay eventos que no está mostrando. Omitir en silencio hace concluir que no hay compromisos

## 6. Verificación

- [x] 6.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 6.2 **Con Google desconectado**: Hoy idéntica a antes. Es la prueba de que no se rompió nada para quien no usa calendario
- [x] 6.3 **Con Google conectado y sin eventos hoy**: sin marcas ni huecos
- [x] 6.4 **Con Google fallando**: las tareas se ven, un solo aviso
- [x] 6.5 **Con Google lento**: mirar el salto al insertarse los eventos. Está asumido, pero puede molestar más de lo que suena por escrito
- [x] 6.6 Una lista mezclada de verdad: eventos con hora, uno de todo el día, **uno que viene de ayer**, tareas con y sin hora, y una atrasada
- [x] 6.7 Un evento de un calendario de **solo lectura**
- [x] 6.8 Los tres formatos, y que el calendario abra en día sin navegación ni selector de formato
- [x] 6.9 **Que una tarea siga comportándose igual**: completar, doble clic, clic derecho, selección múltiple, con eventos en la misma lista
- [x] 6.10 En escritorio y en 390px
- [x] 6.11 Usar el simulador de Google, **nunca la cuenta real del dueño**
- [x] 6.12 Sumar pruebas de Hoy. Hay **una sola** y es sobre centrado: el orden de los tres tramos y el desacople merecen quedar cubiertos

**Nota de esta tanda (verificación en navegador, Playwright + simulador de Google contra
Supabase local):** 6.2, 6.3, 6.4, 6.7, 6.8, 6.9, 6.10 y 6.11 verificados y en orden. 6.5
verificado con un juicio: el salto sí se nota (ver reporte de la tanda). **6.6 queda sin
marcar a propósito**: el orden de los tres tramos, el empate y el bloque de atrasadas
están bien, pero el evento arrastrado de ayer **sí muestra la hora de ayer** ("20:00 –
02:00", literal, sin ningún indicador de que empezó el día anterior) — el defecto que
D-A de `design.md` dice haber arreglado no está resuelto en la fila, solo en el orden.
Es una decisión de diseño (qué mostrar en su lugar), no un bug chico: se paró sin
arreglar. Ver el reporte de esta tanda para el detalle y la captura.

**Siguiente tanda — arreglo de `formatEventTimeLabel` (`event-row.tsx`):** el defecto
de 6.6 quedó resuelto. Un evento que empezó ayer ahora lee "Desde ayer · hasta las
HH:mm" (se muestra cuándo termina, no cuándo empezó); el caso simétrico, uno que
empieza hoy y sigue mañana, lee "HH:mm · hasta mañana". La comparación es por día
calendario en la zona horaria del usuario contra el día de hoy (recibido por props
como `now`, ya no leído del reloj del cliente), misma lógica para las dos direcciones.
Verificado en el navegador (Playwright, chromium, Docker local, simulador de Google
contra Supabase local, usuario e2e nuevo, nunca la cuenta real): una lista con los tres
casos a la vez — "Reunión de ayer" ("Desde ayer · hasta las 02:30"), "Reunión que
sigue" ("20:00 · hasta mañana") y "Reunión de hoy" ("10:00 – 11:00") — se distinguen
entre sí de un vistazo, en escritorio y en 390px, sin la hora cruda del otro día en
ningún nodo del documento. `hoy-view.test.tsx` tenía una prueba sobre este mismo
defecto que nunca podía fallar (comparaba texto exacto contra un nodo que ya traía más
texto, `queryByText("23:30")` contra `"23:30 – 09:00"`): se confirmó que fallaba contra
el código viejo antes de arreglarla, junto con `event-row.test.tsx`, que ahora también
cubre los tres casos a nivel de componente.

## 7. Lo escrito

- [x] 7.1 `docs/product-spec.md` describe Hoy con el bloque de eventos al final
- [x] 7.2 Una decisión numerada al final de `docs/decisions.md` (verificá el número, no lo asumas). Merecen quedar registradas dos: que el panel no muestra eventos, y que el orden de empate favorece al evento
