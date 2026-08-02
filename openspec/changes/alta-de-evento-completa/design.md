## Context

Hay dos diálogos de evento. El de **crear** recibe un rango ya elegido y lo muestra como
texto: solo pide título y calendario. Su propio comentario justifica el recorte diciendo que
descripción y ubicación se agregan después. El de **editar** sí permite cambiar horarios y
todo el día, y pregunta el alcance cuando el evento es parte de una serie.

Cuando el alta se abre desde la barra lateral, no hay ningún rango elegido: se inventa uno
—la próxima media hora, una hora de duración— y queda fijo.

El cliente de Google que escribimos acepta inicio, fin, recurrencia, descripción y
ubicación. La recurrencia ya se usa para partir series.

Restricciones que condicionan: una sola persona por cuenta, sin compartir ni invitar; el
veto a adjuntos; y que los eventos **no se guardan en Postgres**, así que no hay migración
posible ni necesaria.

## Goals / Non-Goals

**Goals:**

- Poder crear un evento a la hora que uno quiere, de una.
- Que crear no ofrezca menos que editar.
- Cumplir el escenario del spec que ya exige elegir el horario al crear.

**Non-Goals:**

- Invitados, adjuntos, videollamada, disponibilidad, visibilidad, color por evento.
- Publicar tareas ni hábitos de Trazio en Google.
- Cambiar cómo se leen o se cachean los eventos.

## Decisions

### D-A. Un solo diálogo para crear y editar

Hoy son dos, con la excusa de que el de crear recibe un rango de solo lectura. Esa excusa
desaparece en cuanto el rango deja de ser de solo lectura.

Mantenerlos separados significa dos lugares donde agregar cada campo nuevo, y ya se ve el
resultado: crear quedó atrás.

**Lo que sí cambia según el modo** es el alcance: al editar un evento de una serie hay que
preguntar si el cambio es para esa ocurrencia, para esta y las siguientes, o para todas. Al
crear no hay nada que preguntar.

### D-B. El horario se propone, no se impone

Desde la barra lateral se sigue proponiendo la próxima media hora con una hora de duración.
Desde el calendario, el rango arrastrado. **La diferencia es que ahora se puede corregir sin
salir.**

Todo el día es un interruptor: al activarlo desaparecen las horas y queda la fecha.

### D-C. La repetición se elige al crear, con opciones derivadas de la fecha

Las opciones rápidas —cada día, cada semana, cada mes, cada año, días hábiles— **se derivan
de la fecha elegida**, como pidió el dueño: si el evento es un martes, "cada semana" dice
cada martes.

Y "personalizada" **comparte el diálogo con el de tareas**, de `repeticion-configurable`. Son
la misma pregunta —cada cuánto, qué días, hasta cuándo— y construirlo dos veces es garantía
de que se separen.

**Consecuencia de orden**: esta tanda va **después** de `repeticion-configurable`. Si va
antes, hay que escribir el diálogo dos veces.

*Ojo con una diferencia real:* las tareas recurrentes de Trazio generan la siguiente
ocurrencia al completarse, y los eventos de Google son series de verdad. La pregunta "¿desde
lo programado o desde lo completado?" que tiene sentido en una tarea **no tiene ninguno en un
evento**. El diálogo compartido tiene que poder ocultar esa parte.

### D-D. Descripción y ubicación entran porque ya están en todos lados menos en el formulario

Están en el modelo, en el cliente, y el spec exige mostrarlas al ver un evento. Que no se
puedan escribir es un hueco, no una decisión.

**Ubicación es texto libre**, no geolocalización — es lo que soporta el cliente y lo que
Trazio muestra hoy.

### D-E. Qué no se copia, y por qué no es negociable

| No entra | Por qué |
| --- | --- |
| Invitados | Cuatro fuentes: una persona por cuenta, sin compartir ni invitar |
| Adjuntos | Cinco fuentes, veto permanente |
| Videollamada | No existe en el modelo ni en el cliente; nadie la pidió |
| Disponibilidad, visibilidad, color | No se pidieron |

Los dos primeros no son cuestión de alcance de esta tanda: están decididos.

## Risks / Trade-offs

**Editar la repetición de una ocurrencia suelta no significa nada** → Es el cruce más
delicado. Hoy editar un evento de una serie pregunta el alcance; al sumar la edición de la
propia regla, "esta ocurrencia" y "cambiar la repetición" son incompatibles. Hay que
resolver ese caso explícitamente, no dejarlo pasar.

**Unificar dos diálogos puede romper el de editar, que funciona** → El de editar es el que
más se usa y ya maneja el alcance de series. Unificar mal deja el camino bueno peor que
antes.

**Un formulario mucho más largo** → Pasa de dos campos a siete u ocho. En 390px eso es un
diálogo que se desplaza, y hay que mirarlo ahí.

**Depende de dos tandas previas** → `sin-controles-nativos` le saca los controles nativos y
`repeticion-configurable` le da el diálogo compartido. Ir antes que cualquiera de las dos
significa hacer trabajo que después se tira.
