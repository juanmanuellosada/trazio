## Why

Hoy **ya muestra los eventos del día**, pero en un bloque aparte al final de la pantalla, después
de las tareas y los hábitos. Eso rompe lo único que uno quiere de una vista de hoy: ver en qué
orden va a pasar el día. Con una reunión a las 8 y una tarea a las 6, hay que mirar dos listas y
reconstruir la secuencia de cabeza.

El dueño lo pidió así: *"en el modo lista los eventos salen mezclados con las tareas, o sea si
tengo un evento a las 8 y una tarea a las 6 sale primero la tarea y después el evento. Pero se
tiene que distinguir cuál es cuál. Así en una lista tenés todo."* Más: que Hoy ofrezca todos los
formatos —con el calendario en modo día— y que **doble clic sobre un evento lo abra para editar**.

Hoy es además la única vista de tareas sin selector de formato: el spec lo prohíbe explícitamente
porque no tenía modo panel. Esa razón deja de valer.

## What Changes

**Los eventos se intercalan en la lista**

```
       Todo el día
  ▍    Feriado                                    Personal

  ▍    Reunión con el equipo          8:00        Trabajo
  ○    Pagar el alquiler              6:00        Casa / Pendiente
  ○    Llamar al contador                         Trabajo
```

- Un orden por hora que cruza las dos fuentes.
- Los de **todo el día arriba**, porque enmarcan la jornada en vez de ocupar un momento.
- Las tareas **sin hora al final**, que es el orden que ya usa "ordenar por fecha".
- **Un evento se distingue de una tarea sin leer**: no lleva casilla de completar, ni punto de
  prioridad, ni chevron, ni manija de arrastre. Lleva el color de su calendario.

**Hoy ofrece los tres formatos**

- Lista, panel y calendario. En calendario, **solo el modo día**: el selector de formato no
  aparece, porque en una vista de un día los otros tres modos no significan nada.
- **El panel muestra solo tareas**, y lo dice. Sus columnas salen de un criterio de agrupación
  —prioridad, etiqueta, sección— en el que un evento no puede participar.

**Doble clic sobre un evento lo edita**

- El mismo gesto que abre el detalle de una tarea. Por **D24**, también desde el menú contextual y
  desde el botón de acciones.
- En un calendario de **solo lectura**, se abre igual pero sin permitir editar. Ofrecer un
  formulario que Google va a rechazar es peor que no ofrecerlo.

**Un defecto que esto arregla de paso**: un evento que empezó ayer y sigue hoy muestra **la hora de
ayer**, porque el bloque actual formatea el inicio crudo sin recortarlo al día.

**BREAKING** de contrato: el spec de opciones de vista dice hoy que en Hoy la barra **no debe**
mostrar el selector de forma de ver.

## Capabilities

### New Capabilities

- `hoy-con-eventos`: la vista Hoy combina tareas y eventos en una sola secuencia ordenada por
  hora, con un tratamiento propio para el evento y sus acciones.

### Modified Capabilities

- `opciones-de-vista`: Hoy pasa a ofrecer el selector de forma de ver, con el calendario fijo en
  modo día y sin selector de formato de calendario.
- `vistas-lista`: la lista de Hoy deja de contener solo tareas.

## Impact

**Los datos, y es el punto que más puede salir mal.** Las tareas salen de Supabase y los eventos de
Google, que es remoto, más lento y puede fallar o no estar conectado. Hoy **ya están
desacoplados** —dos consultas hermanas, sin `Suspense` ni `enabled` cruzado— y eso **no se puede
perder**: la lista de tareas nunca debe esperar a Google. La contrapartida de intercalar es que las
filas de evento aparecen después y **empujan a las tareas hacia abajo**; hay que decidir qué se
muestra en ese intervalo.

Sin Google conectado, Hoy tiene que verse **exactamente como hoy**, sin huecos ni avisos.

**Código.** `components/tasks/hoy-view.tsx` pasa a tener el `if` de formato que hoy solo tienen
Próximos y Proyecto. Nace una fila hermana de evento: `TaskRow` tiene cuatro mutaciones de tarea
adentro, lee campos de tarea sin abstracción y renderiza subtareas recursivas — volverla polimórfica
costaría mucho más que escribir una fila propia que reuse su esqueleto visual y el menú.

`ScreenCalendar` **siempre** dibuja su navegación entre días, y en una vista llamada Hoy navegar a
mañana es incoherente: necesita poder montarse sin ella.

**Lo que no cuesta.** `formato_calendario: "dia"` ya es un valor válido y ya se persiste por
pantalla, así que fijar Hoy en modo día entra en el esquema sin migración. `view_preferences` no
cambia.

**Saber si un evento se puede editar** exige cruzar su calendario contra la lista de calendarios:
el permiso vive en el calendario, no en el evento.

**Red de seguridad.** `hoy-view.test.tsx` tiene **una sola prueba**, sobre centrado, con todo
mockeado. La vista que más se va a tocar es la que menos cubierta está.

**Fuera de alcance.** El contador del panel lateral sigue contando tareas y hábitos, **no eventos**:
un evento no se completa, y un número que no baja en todo el día es ruido. Y no se toca el bloque de
hábitos, que ya tiene su lugar.
