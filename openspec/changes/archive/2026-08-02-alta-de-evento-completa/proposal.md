## Why

El dueño lo dijo así: *"El creador de eventos tiene muy poca personalización. Siempre que le
doy al agregar evento en la barra me sale la hora fija y solo me deja elegir título y
calendario."*

Es exacto. El diálogo de alta pide título y calendario, y muestra el horario **como texto de
solo lectura**. Desde la barra lateral ese horario es la próxima media hora con una hora de
duración, siempre. No hay forma de crear un evento a las tres de la tarde sin crearlo mal y
después editarlo.

Y hay dos cosas que lo vuelven más claro:

**El spec ya lo exige.** El escenario de crear un evento dice, literal, *"horario de 10:00 a
11:00 el 3 de agosto"*. El formulario de hoy no lo cumple.

**La capa de datos ya está lista.** El cliente de Google que escribimos ya soporta horario
de inicio y fin, recurrencia, descripción y ubicación. La recurrencia incluso ya se usa en
producción para partir series. **No falta backend: falta exponerlo.**

Además hay dos diálogos de evento, el de crear y el de editar, y el de editar es más
completo. Que crear ofrezca menos que editar no tiene defensa.

## What Changes

**El alta de evento deja de tener el horario fijo**

- Fecha, hora de inicio y hora de fin editables.
- La opción de todo el día.
- Cuando se abre desde el calendario arrastrando, el rango arrastrado sigue entrando como
  valor inicial — pero ahora se puede corregir.

**Se puede elegir la repetición al crear**

- Con las mismas opciones que el dueño mostró: no se repite, todos los días, cada semana,
  cada mes, cada año y días hábiles, **derivadas de la fecha elegida**.
- Y una personalizada, que comparte el diálogo con la de tareas.

**Descripción y ubicación**

- Ya están en el modelo, el cliente las soporta y el spec exige mostrarlas al ver un evento.
  Que no se puedan escribir al crear es un hueco.

**Un solo diálogo de evento**

- Crear y editar dejan de ser dos componentes con capacidades distintas.

**Lo que NO se copia de Google Calendar**

- **Invitados**: fuera del producto. Cuatro fuentes escritas dicen que es de una sola
  persona por cuenta, sin compartir ni invitar.
- **Adjuntos**: vetados en cinco fuentes.
- **Videollamada**: no existe en el modelo ni en el cliente, y nadie la pidió.
- Disponibilidad, visibilidad y color por evento: no se pidieron.

Sin cambios de datos: los eventos no se guardan en Postgres.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `eventos-de-calendario`: crear un evento pasa a permitir elegir horario, todo el día,
  repetición, descripción y ubicación, y deja de ofrecer menos que editar.

## Impact

**Código.** `components/calendar/create-event-dialog.tsx` y `edit-event-dialog.tsx` se
unifican. El segundo tiene además tres controles nativos del navegador, que se van por
`sin-controles-nativos` — **esa tanda va primero**.

**Backend.** Ninguno. El cliente ya acepta inicio, fin, recurrencia, descripción y ubicación.

**Recurrencia.** El diálogo de repetición personalizada se comparte con el de tareas, de
`repeticion-configurable`. **Esa tanda también va primero**, o hay que construirlo dos veces.

**Riesgo.** Editar un evento que es parte de una serie ya pregunta a qué alcance aplica el
cambio. Al sumar la edición de la propia repetición, ese cruce se complica: cambiar la regla
de repetición de una sola ocurrencia no significa nada.

**Fuera de alcance.** Invitados, adjuntos, videollamada, disponibilidad, visibilidad y color
por evento. Publicar tareas o hábitos de Trazio en Google, que el spec prohíbe.
