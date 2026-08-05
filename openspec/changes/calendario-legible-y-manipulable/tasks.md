> **El grupo 6 puede tocar la base.** Saltear un hábito no existe en toda la aplicación y hay que
> decidir qué le pasa a la racha. Si toca el esquema, **la migración va antes que el código**.
>
> **Casi nada de esto tiene red.** No hay pruebas de la línea de la hora, ni del arrastre completo,
> ni del redimensionado, ni del ancho. Y la suite de punta a punta del calendario **no corre en el
> gate**: estuvo rota por selectores viejos hasta hoy sin que nadie lo notara.
>
> **Se juzga mirando una semana real**, con bloques de quince minutos y de tres horas mezclados, no
> dos de prueba.

## 1. La línea de la hora actual

- [ ] 1.1 **Pasa a moverse.** Hoy se calcula una sola vez al montar y nunca más: la línea queda en la hora en que se cargó la página
- [ ] 1.2 El spec ya exigía esto. **No es una función nueva, es un requisito incumplido**
- [ ] 1.3 Pasa a ser **roja**, distinta de cualquier color que pueda tener un bloque
- [ ] 1.4 Sigue apareciendo **solo en el día de hoy**
- [ ] 1.5 Ojo con la hidratación: la hora viaja explícita desde el servidor a propósito, y hay un comentario que explica por qué. **Leelo antes de tocar**

## 2. Qué muestra cada bloque

- [ ] 2.1 Una **escalera por alto** (**D-A**): cada dato aparece solo si entra. Hoy el contenido es idéntico en un bloque de doce píxeles y en uno de mil
- [ ] 2.2 Evento: título, horario, nombre del calendario
- [ ] 2.3 Tarea y hábito: título, horario, proyecto, etiquetas
- [ ] 2.4 **El control de completar nunca se cae** por falta de espacio: es una acción, no información
- [ ] 2.5 El hábito lleva además una marca que lo identifica
- [ ] 2.6 **Un defecto que se arregla de paso**: en la grilla el ícono queda apilado **encima** del título, porque la clase de la variante pisa la de fila
- [ ] 2.7 El orden importa: primero lo que distingue bloques vecinos. Dos reuniones seguidas se diferencian por título y hora, no por calendario

## 3. Los colores

- [ ] 3.1 El evento lleva el color de su calendario. **Ya se trae y ya se resuelve**: verificá qué falta para que se use
- [ ] 3.2 **Un solo color de reemplazo.** Hoy hay dos distintos: uno en la grilla y otro en la fila de Hoy
- [ ] 3.3 El color de un evento **no se ajusta al tema oscuro**, a diferencia del de tareas y hábitos. Con los eventos coloreados se va a notar
- [ ] 3.4 **La distinción por forma no se toca** (**D-B**): hay una prueba que afirma que dos bloques del mismo color se distinguen igual, y **tiene que seguir pasando tal cual**. Si falla, el arreglo es la forma, no la prueba

## 4. Arrastrar

- [x] 4.1 **Capa superpuesta en un portal** (**D-C**), como ya hizo el tablero. El contenedor con desplazamiento recorta el nodo original
- [x] 4.2 **Se ve el horario de destino**, ajustado a la grilla de quince minutos — que es lo que se va a guardar. Mostrar la posición libre del puntero sería mentir
- [x] 4.3 **Queda la sombra en el origen** mientras dura el gesto
- [x] 4.4 El formato mes no tiene arrastre y queda afuera (sin tocar, ya era así)

## 5. Que todo sea instantáneo

- [x] 5.1 **Redimensionar ya lo es**: tiene vista previa en vivo con estado local. **Es el modelo, copialo**
- [x] 5.2 Mover tiene que igualarlo
- [x] 5.3 **Arrastrar una tarea en Próximos no es optimista**: su caché no se parchea ni se invalida, así que depende de que llegue el aviso en tiempo real. Es un agujero anterior a esto
- [x] 5.4 Al preguntar el alcance de una serie, **hoy el bloque salta de vuelta al origen** mientras pregunta. Tiene que quedarse, y volver solo si se cancela
- [ ] 5.5 **Redimensionar un hábito hoy no hace nada**: mover y redimensionar comparten manejador y la rama de hábito solo lee la hora de inicio — **bloqueado**: `habit_schedule_overrides` no tiene columna de duración, ampliarlo pide una migración fuera de alcance de esta tanda (ver reporte)
- [x] 5.6 Si el servidor rechaza, el bloque vuelve **y se avisa**. Los mensajes de error recién empezaron a llegar bien hoy: comprobalo

**Cabo suelto de otra tanda, resuelto acá**: la manija de redimensionar (`draggable-timed-block.tsx`) medía 6px y solo aparecía con `group-hover`, inalcanzable en táctil. Ahora tiene opacidad base no nula y una zona de toque de 18px, creciendo solo hacia abajo (nunca hacia el contenido del bloque, para no taparle el gesto de mover a los bloques cortos).

## 6. Saltear un hábito (puede tocar la base)

- [ ] 6.1 **No existe nada parecido** (**D-F**). Lo más cercano quita una reprogramación y devuelve el hábito a su hora habitual
- [ ] 6.2 Son **tres estados**: pendiente, cumplido y salteado. Confundirlos vuelve inútil el registro
- [ ] 6.3 **El bloque se queda en el calendario**, marcado como salteado. No desaparece: es una decisión a la vista, no una baja
- [ ] 6.4 **Es reversible**: se puede completar después, y ahí la racha se actualiza como cualquier otro día
- [ ] 6.5 **No toques el cálculo de rachas.** La racha cuenta cumplimientos; saltear no suma ni resta. Si te encontrás modificándolo, **pará y avisá**: algo entendiste distinto
- [ ] 6.6 Si hay migración: aplicada antes del código, con su política de acceso en el mismo archivo, y los tipos regenerados

## 7. Acciones y menú contextual

- [ ] 7.1 Clic derecho en todo bloque, con la primitiva compartida que ya existe
- [ ] 7.2 Evento: editar, abrir en Google Calendar, **eliminar**
- [ ] 7.3 **Eliminar también desde el diálogo de edición.** Hoy no está en ninguno de los dos lados, y el gancho existe con un solo consumidor en toda la aplicación
- [ ] 7.4 Tarea: abrir detalle, completar, eliminar
- [ ] 7.5 Hábito: editar, completar, saltear ese día
- [ ] 7.6 **Ojo con el patrón**: la lista de menú está escrita dos veces casi idéntica, en la fila de tarea y en la de evento. Este sería el tercer copiado — mirá si conviene extraerla
- [ ] 7.7 **Completar dentro de algo arrastrable**: hay que poder tildar sin que empiece a moverse, y arrastrar sin tildar sin querer

## 8. El ancho

- [ ] 8.1 El calendario deja de heredar el tope de la columna de contenido (**D-G**), misma excepción acotada a **D39** que el panel
- [ ] 8.2 Esa excepción está escrita **tres veces**, una por pantalla, con el mismo comentario. **Sumar la cuarta pide unificarla primero**
- [ ] 8.3 La grilla ya tiene piso y reparto por columna: no hace falta tocar la geometría
- [ ] 8.4 Lista no cambia

## 9. Verificación

- [ ] 9.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 9.2 Si tocaste el esquema: migración aplicada y tipos regenerados
- [ ] 9.3 **Una semana real**: bloques de quince minutos y de tres horas mezclados, eventos de dos calendarios, tareas con y sin etiquetas, hábitos cumplidos y pendientes
- [ ] 9.4 **La línea de la hora se mueve**: no alcanza con verla, hay que verla avanzar
- [ ] 9.5 Arrastrar de verdad: que no se recorte, que muestre la hora, que deje la sombra, que se quede al soltar
- [ ] 9.6 Arrastrar **en las tres pantallas**, y en Próximos especialmente, que es donde faltaba el optimismo
- [ ] 9.7 Arrastrar una ocurrencia de una serie: el bloque se queda mientras pregunta
- [ ] 9.8 Con el servidor rechazando: vuelve y avisa
- [ ] 9.9 Completar una tarea y un hábito desde su bloque, sin que se dispare el arrastre
- [ ] 9.10 Eliminar un evento desde el menú y desde el diálogo
- [ ] 9.11 Saltear un hábito: que **siga viéndose** marcado como salteado, que la racha **no cambie**, y que completarlo después la actualice
- [ ] 9.12 Tema claro y oscuro, con eventos coloreados
- [ ] 9.13 Escritorio ancho y 390px
- [ ] 9.14 Simulador de Google, **nunca la cuenta real del dueño**
- [ ] 9.15 Si escribís pruebas de punta a punta, **reusá el ayudante del calendario** — el que se arregló hoy. Escritas de memoria nacen rotas

## 10. Lo escrito

- [ ] 10.1 `docs/product-spec.md` describe la vista de calendario
- [ ] 10.2 Una decisión numerada al final de `docs/decisions.md` — **verificá el número, no lo asumas**. Merecen quedar: la escalera de contenido por alto, y qué le pasa a la racha al saltear
- [ ] 10.3 `docs/design-system.md` documenta el tope de ancho: la excepción del calendario va ahí, junto a la del panel
