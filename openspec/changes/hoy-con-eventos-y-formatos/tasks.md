> **El grupo 1 es el que puede arruinar todo lo demás.** Hoy las tareas no esperan a Google, y esa
> propiedad se rompe sin querer con un `Suspense` o un estado de carga compartido.
>
> **Hoy casi no tiene pruebas**: una sola, sobre centrado, con todo mockeado. Lo que se rompa acá no
> lo atrapa el gate.
>
> **Se juzga con una lista mezclada de verdad** —eventos con hora, uno de todo el día, uno que viene
> de ayer, tareas con y sin hora— no con dos filas de prueba.

## 1. El desacople, que ya existe y hay que conservar

- [ ] 1.1 Las tareas se pintan **sin esperar a Google**. Nada de `Suspense`, `enabled` cruzado ni un `isLoading` compartido entre las dos consultas
- [ ] 1.2 Los eventos se insertan cuando llegan. **Sin esqueleto de carga** (**D-E**): no se sabe cuántos van a ser, y uno del alto equivocado desplaza el contenido dos veces
- [ ] 1.3 Sin Google conectado, Hoy se ve **exactamente como antes de este cambio**: sin huecos, sin avisos, sin lugar reservado
- [ ] 1.4 Google caído: las tareas igual, más **un** aviso al pie. Nunca uno por fila
- [ ] 1.5 Distinguir "no conectado" de "falló": hoy son dos estados distintos y solo el segundo avisa

## 2. El orden

- [ ] 2.1 Tres tramos (**D-A**): todo el día y los que vienen de antes; después lo que tiene hora, mezclado; después las tareas sin hora
- [ ] 2.2 **Comparar instantes absolutos, nunca textos de hora.** Los eventos traen zona horaria propia y las tareas usan la del usuario
- [ ] 2.3 Empate a la misma hora: **primero el evento**. Con eso el orden es total y no depende de cuál consulta respondió antes
- [ ] 2.4 Un evento que empezó ayer va al primer tramo. **Hoy muestra la hora de ayer**: ese es el defecto que esto arregla, verificalo explícitamente
- [ ] 2.5 Las atrasadas siguen en su bloque propio, arriba. No se mezclan
- [ ] 2.6 Ojo con el orden configurable: en Hoy el default es por fecha y **no hay arrastre montado**. Si el usuario elige otro criterio —nombre, prioridad—, decidí qué pasa con los eventos y **contame qué elegiste**

## 3. La fila de evento

- [ ] 3.1 Una fila hermana (**D-C**), que reusa el esqueleto visual de la fila de tarea y la primitiva de menú. **No vuelvas polimórfica a `TaskRow`**: tiene cuatro mutaciones de tarea adentro, subtareas recursivas y veintisiete ítems de menú
- [ ] 3.2 **Sin** casilla de completar, punto de prioridad, chevron, manija de arrastre ni casilla de selección
- [ ] 3.3 Nivel uno: color del calendario, título, y el **nombre del calendario anclado a la derecha**, donde la tarea pone su proyecto
- [ ] 3.4 Nivel dos: rango horario y ubicación si tiene
- [ ] 3.5 **Trampa heredada**: hay una prueba que busca el punto de prioridad con un selector de CSS crudo, por ser redondo y estar oculto a los lectores. La marca de color no puede tener esas dos características
- [ ] 3.6 **Segunda trampa**: la fila de tarea llama al gancho de arrastre incondicionalmente, aun sin contenedor alrededor. No copies eso
- [ ] 3.7 Consultá `ui-ux-pro-max` antes de decidir el tratamiento visual. Es la cuarta ronda y el criterio ya está establecido

## 4. Editar el evento

- [ ] 4.1 Doble clic abre el diálogo de edición que **ya existe**
- [ ] 4.2 Por **D24**, también desde el menú contextual y el botón de acciones, **compartiendo una sola lista** como hace la fila de tarea
- [ ] 4.3 El menú: editar, abrir en Google Calendar, eliminar. Nada de fecha, prioridad, subtareas ni duplicar
- [ ] 4.4 **Calendario de solo lectura**: se abre igual, sin permitir editar, y dice por qué. El permiso vive en el calendario, no en el evento: hay que cruzar contra la lista de calendarios
- [ ] 4.5 En teléfono, un toque abre. Igual que la fila de tarea, para que el gesto no dependa del tipo de fila

## 5. Los formatos en Hoy

- [ ] 5.1 Hoy pasa a ofrecer lista, panel y calendario. Hoy monta la barra con la bandera de forma de ver apagada y su cuerpo no tiene el `if` de formato que sí tienen Próximos y Proyecto
- [ ] 5.2 **El calendario, siempre en modo día** (**D-F**), forzado al dibujar y no leído de lo guardado. Ese valor ya existe en el esquema: **no hace falta migración**
- [ ] 5.3 **Sin selector de formato de calendario en Hoy**, ni siquiera deshabilitado
- [ ] 5.4 **Sin navegación entre días.** La vista de calendario siempre la dibuja: hay que poder montarla sin ella
- [ ] 5.5 El panel muestra **solo tareas** (**D-B**), y avisa cuando hay eventos que no está mostrando. Omitir en silencio hace concluir que no hay compromisos

## 6. Verificación

- [ ] 6.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 6.2 **Con Google desconectado**: Hoy idéntica a antes. Es la prueba de que no se rompió nada para quien no usa calendario
- [ ] 6.3 **Con Google conectado y sin eventos hoy**: sin marcas ni huecos
- [ ] 6.4 **Con Google fallando**: las tareas se ven, un solo aviso
- [ ] 6.5 **Con Google lento**: mirar el salto al insertarse los eventos. Está asumido, pero puede molestar más de lo que suena por escrito
- [ ] 6.6 Una lista mezclada de verdad: eventos con hora, uno de todo el día, **uno que viene de ayer**, tareas con y sin hora, y una atrasada
- [ ] 6.7 Un evento de un calendario de **solo lectura**
- [ ] 6.8 Los tres formatos, y que el calendario abra en día sin navegación ni selector de formato
- [ ] 6.9 **Que una tarea siga comportándose igual**: completar, doble clic, clic derecho, selección múltiple, con eventos en la misma lista
- [ ] 6.10 En escritorio y en 390px
- [ ] 6.11 Usar el simulador de Google, **nunca la cuenta real del dueño**
- [ ] 6.12 Sumar pruebas de Hoy. Hay **una sola** y es sobre centrado: el orden de los tres tramos y el desacople merecen quedar cubiertos

## 7. Lo escrito

- [ ] 7.1 `docs/product-spec.md` describe Hoy con el bloque de eventos al final
- [ ] 7.2 Una decisión numerada al final de `docs/decisions.md` (verificá el número, no lo asumas). Merecen quedar registradas dos: que el panel no muestra eventos, y que el orden de empate favorece al evento
