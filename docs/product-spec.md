# Trazio — Especificación funcional

Fuente de verdad del producto. Describe **qué hace** la aplicación, no cómo está
construida. Si el código y este documento no coinciden, gana este documento — o se
actualiza acá de forma explícita y con una nota en `docs/decisions.md`.

---

## Índice

1. [Qué es](#1-qué-es)
2. [Entidades](#2-entidades)
3. [Vistas](#3-vistas)
4. [Navegación](#4-navegación)
5. [Flujos](#5-flujos)
6. [Alta rápida en lenguaje natural](#6-alta-rápida-en-lenguaje-natural)
7. [Lenguaje de filtros](#7-lenguaje-de-filtros)
8. [Recurrencia](#8-recurrencia)
9. [Recordatorios](#9-recordatorios)
10. [Atajos de teclado](#10-atajos-de-teclado)
11. [Configuración](#11-configuración)
12. [Identidad visual](#12-identidad-visual)
13. [Fuera de alcance](#13-fuera-de-alcance)

---

## 1. Qué es

Un gestor de tareas personal. Una sola persona por cuenta: no hay equipos, no se
comparte nada, no hay puntajes ni logros. Cada cuenta ve únicamente lo suyo.

**La promesa:** tu día completo en una sola pantalla — lo que tenés que hacer, lo
que querés sostener y lo que ya está agendado.

Principios:

- **Rápida.** Completar, editar o mover algo se ve al instante. La confirmación del
  servidor llega después; la interfaz no espera.
- **Online.** Requiere internet. Sin conexión la app lo dice claramente y no
  permite escribir. No hay modo offline ni sincronización diferida.
- **Igual en todos lados.** Navegador de escritorio y teléfono comparten pantallas
  y funciones, con la interfaz adaptada al tamaño.
- **En español.** Escrita en español rioplatense, para Argentina. No hay otros idiomas.

Instalación: la app es instalable desde el navegador (PWA) y en el teléfono se agrega
a la pantalla de inicio. No hay aplicación en tiendas.

---

## 2. Entidades

### Proyecto

Agrupa tareas. Tiene nombre, color, ícono (emoji), descripción y vista preferida
(lista o panel).

- Se puede marcar como **favorito** (aparece destacado en el panel lateral).
- Se puede **archivar**: deja de verse en el día a día sin perder nada.
- Se puede **eliminar**: borra también sus secciones y todas sus tareas. Requiere
  confirmación explícita mostrando cuántas tareas se pierden.
- Se anidan hasta **tres niveles** de profundidad.
- Se reordenan arrastrando y soltando, o desde el menú contextual.

**Bandeja de entrada:** proyecto especial que toda cuenta tiene desde el registro.
No se puede borrar ni archivar. Ahí caen las tareas que no se asignaron a ningún
otro proyecto.

### Sección

Agrupación con nombre dentro de un proyecto ("Por hacer", "En curso", "Hecho"), con
una descripción opcional que se muestra debajo del nombre. Se puede colapsar,
editar (nombre y descripción), reordenar y eliminar. Al eliminar una sección, sus
tareas **no** desaparecen: quedan sin sección dentro del mismo proyecto.

El alta pide los dos campos y exige confirmación explícita: perder el foco de un
campo no guarda la sección, porque pasar del nombre a la descripción es
justamente perder el foco. En vista tablero, la columna de una sección solo
muestra su nombre.

### Tarea

El elemento central. Campos:

| Campo | Detalle |
| --- | --- |
| Título | **Texto plano.** Sin markdown, sin links, sin formato. |
| Descripción | Texto enriquecido: negrita, itálica, listas, links, código, citas. |
| Prioridad | Urgente, Alta, Media, Baja. |
| Fecha de vencimiento | Con hora opcional. |
| Duración estimada | En minutos. Define el alto del bloque en la vista de calendario. |
| Fecha límite | Fecha tope, distinta de la fecha en que se planea trabajarla. |
| Etiquetas | Varias por tarea. |
| Subtareas | Anidadas, sin límite de niveles. |
| Comentarios | Hilo propio, texto plano. |
| Recordatorios | Uno o varios. |
| Recurrencia | Regla RRULE. |
| Ubicación | Un proyecto y, opcionalmente, una sección dentro de ese proyecto. |

Acciones: crear, editar, completar, descompletar, duplicar, mover de proyecto o
sección, reordenar, eliminar, copiar enlace directo, abrir en ventana aparte.

Colores de prioridad:

| Prioridad | Color | Token |
| --- | --- | --- |
| Urgente | Rojo | `#EC1E2A` |
| Alta | Naranja | `#F58220` |
| Media | Azul | `#283B56` |
| Baja | Gris | `#8A94A0` |

### Etiqueta

Transversal: no pertenece a un proyecto, se aplica a cualquier tarea. Tiene nombre
y color, se puede marcar como favorita, y tiene su propia página con todas las
tareas que la usan. Al editar las etiquetas de una tarea se reemplaza el conjunto
completo. Al eliminar una etiqueta se quita de todas las tareas que la tenían.

### Comentario

Cada tarea tiene su hilo. Texto plano. Se crean, editan (quedan marcados como
"editado") y eliminan.

### Recordatorio

Independiente de la fecha de vencimiento. Una tarea puede tener varios, cada uno
para un momento concreto. Llegan como **notificación push en el dispositivo**.
No existen recordatorios por email.

### Filtro

Búsqueda guardada, escrita en el lenguaje de consulta de la sección 7. Tiene
nombre, color, ícono y se puede marcar como favorito.

### Hábito

Distinto de una tarea: no pertenece a un proyecto, no tiene sección, etiquetas,
subtareas, prioridad, comentarios ni recordatorios, y no se "termina" — solo se
archiva cuando se deja de hacer.

Campos: nombre, ícono (emoji), color, duración estimada, hora programada opcional
(sin hora se considera "todo el día"), y forma de repetirse:

- **Todos los días.**
- **Cierta cantidad de veces por semana** (la semana se cuenta de lunes a domingo).
- **Días específicos de la semana**, elegidos de antemano.

Cada hábito lleva su **racha actual** y su **mejor racha histórica**. Reglas:

- *Todos los días:* se corta apenas se salta un día.
- *Días específicos:* solo cuentan los días marcados. El día en curso tiene margen
  de gracia hasta que termina antes de darlo por perdido.
- *Veces por semana:* se cuentan semanas consecutivas en las que se llegó a la meta.

Un hábito solo aparece a partir del día en que se creó, nunca antes. Se puede
reprogramar su horario para un día puntual sin cambiar el horario habitual.

Se puede **saltear un día puntual**: queda constancia de que ese día se decidió no
hacerlo, sin contarlo como cumplido ni tocar la racha (no suma ni resta, solo deja
de estar pendiente). El hábito se sigue viendo ese día, marcado como salteado —no
desaparece— y saltear es reversible: completarlo después actualiza la racha como
cualquier otro día. No se ofrece saltear un día que ya se cumplió.

### Evento de calendario

No se crea ni se guarda en Trazio: son los eventos del Google Calendar conectado,
mostrados junto con tareas y hábitos. Se muestran título, horario, si es de todo el
día, ubicación, descripción, calendario de origen (con su color) y si se repite.
Se pueden editar desde las vistas donde aparecen.

**La conexión es de un solo sentido para las tareas:** Trazio lee y edita eventos
que ya existen en Google, pero las tareas y hábitos de Trazio no se publican ahí.

---

## 3. Vistas

| Vista | Qué muestra |
| --- | --- |
| Bandeja de entrada | Tareas sin proyecto asignado. |
| Hoy | Tareas que vencen hoy, atrasadas, hábitos del día y eventos de hoy. |
| Próximos | Ventana de varios días hacia adelante con tareas, hábitos y eventos. |
| Proyecto | Tareas de un proyecto, organizadas por sección. |
| Completado | Todas las tareas completadas. |
| Buscador | Resultados de búsqueda de texto. |
| Etiquetas | Administración de etiquetas. |
| Filtros | Administración de filtros guardados. |
| Hábitos | Todos los hábitos, con estadísticas. |
| Configuración | Preferencias de la cuenta. |

### Bandeja de entrada

Vista como lista, **panel** o calendario. Vacía muestra: "Tu bandeja de entrada
está vacía."

### Hoy

Bloques en este orden: atrasadas (destacadas en rojo, la más vencida primero),
**una sola secuencia con las tareas de hoy y los eventos de hoy intercalados**,
hábitos del día (con contador de cuántos se hicieron — cuenta todos, incluidos
los que el control de completadas oculta), y — si se activa la opción — las
completadas. El botón de agregar precarga la fecha de hoy.

Con el control de completadas apagado, un hábito ya marcado ese día también
deja de listarse ahí, igual que una tarea hecha; uno salteado no es lo mismo
que uno hecho, así que sigue viéndose.

La secuencia de tareas y eventos ordena en tres tramos: primero los eventos de
todo el día y los que vienen de un día anterior, después todo lo que tiene hora
—tareas y eventos juntos, por hora, y a igual hora el evento va primero—, y por
último las tareas sin hora. Un evento nunca lleva casillero de completar, punto
de prioridad ni manija de arrastre: se distingue de una tarea por su forma, con
el color de su calendario y el nombre del calendario anclado a la derecha.
Doble clic sobre un evento lo abre para editar (o para verlo sin editar, si el
calendario es de solo lectura); el mismo camino está en su menú contextual y en
su botón de acciones.

Tres formas de verlo, igual que Próximos y Proyecto: **lista** (la secuencia de
arriba), **panel** (columnas por "agrupar por"; solo tareas — un evento no
tiene sección, fecha ni prioridad con la que armar una columna, y si hay
eventos ese día el panel avisa que no los muestra) y **calendario**, siempre en
modo día y sin navegación entre días: Hoy es un solo día por definición, así
que no ofrece el selector de formato de calendario ni un control para ir a
otro día.

En el panel de Hoy, el agrupador por defecto es "Prioridad" y muestra las
cuatro columnas de prioridad, no una sola: Hoy cruza proyectos (no tiene
secciones propias) y es un solo día (no hay días con los que armar columnas),
así que prioridad es el único campo que le queda con el que agrupar
signifique algo. El panel no ofrece "nada" (a diferencia de la lista, donde
sigue significando "no agrupar"): cada pantalla ofrece en su lugar el valor
por defecto que le corresponde.

### Próximos

Ventana configurable de una semana a tres meses. Deja afuera las tareas sin fecha.
Tres formas de verlo:

- **Lista:** agrupada por día, con "Hoy" y "Mañana" resaltados, contador por día y
  botón para agregar una tarea en ese día.
- **Panel:** columnas por "agrupar por", con "Fecha" como valor por defecto: sin
  tocar el agrupador, una columna por día de la ventana más "Sin fecha" (las
  atrasadas se suman a la de "Hoy"); eligiéndolo a mano, en cambio, una columna
  por cada día que ya tenga tareas, sin el resto de la ventana. Agrupando por
  prioridad, las cuatro columnas fijas en su lugar. No ofrece agrupar por
  sección (Próximos cruza proyectos, y una sección solo tiene sentido dentro de
  uno). Arrastrar una tarea a otra columna le escribe el campo que las define.
- **Calendario:** semana, cuatro días o mes en escritorio; día o mes en teléfono.

### Proyecto

Agrupada por sección —su valor por defecto, como Bandeja de entrada—: primero las
tareas sin sección, después cada sección colapsable con su propio botón de agregar.
Tareas y secciones se reordenan arrastrando (solo con orden manual y sin agrupación
activa). Desde el menú del proyecto: editar, favorito, agregar sección, archivar,
eliminar.

Agrupada por cualquier otro valor —incluido "nada"— se ve sin los bloques de
sección: "nada" es una sola lista corrida, y el resto arma bloques por fecha,
prioridad o etiqueta. Ahí, colapsar una sección se pierde (es una comodidad de
lectura), pero crear, renombrar y eliminar una sección siguen alcanzables:
agregar una tarea en una sección puntual, desde el selector de destino del alta
rápida o escribiendo `#Proyecto/Sección`; renombrar y eliminar, volviendo a
agrupar por sección.

También ofrece panel, igual que Bandeja de entrada: columnas por "agrupar por",
con "Sección" como valor por defecto — con alta al pie de cada columna y, cuando
las columnas son secciones, la opción de crear una sección directamente ahí.

### Completado

Lista simple con contador. Desde ahí se pueden volver a marcar como pendientes.
Orden por fecha de completado, la más reciente primero (D25), no manual.

### Buscador

Busca en título y descripción. Mínimo dos caracteres, hasta 50 resultados,
mostrando primero las pendientes y después por fecha. La búsqueda es literal: no
corrige errores de tipeo.

### Hábitos

Arriba, tres números: hábitos activos, mejor racha alcanzada, y cuántos de hoy se
hicieron. Los hábitos se agrupan por forma de repetirse. Cada uno muestra nombre,
ícono, casillero para marcar (si toca hoy), frecuencia con horario y duración,
mini-mapa de los últimos 14 días, racha actual o progreso semanal, y mejor marca.
Sección desplegable con los archivados.

### Detalle de tarea

Modal centrado por encima de la pantalla, o pantalla completa en teléfono.
Título y descripción se guardan solos. Desde ahí: ir a la tarea padre,
cambiar fecha/hora/duración/recurrencia, fecha límite, prioridad, recordatorios,
proyecto y etiquetas, agregar subtareas, y leer o escribir comentarios.

### Vista de calendario

Disponible en Bandeja, Hoy, Próximos y Proyecto. Muestra las 24 horas del día, con
fila aparte arriba para eventos de todo el día y una línea roja marcando la hora
actual, que avanza sola mientras la pantalla está abierta. En la forma de ver
"calendario" el contenido ocupa el ancho disponible en vez de detenerse en el tope
de la columna de contenido — la misma excepción acotada a D39 que ya rige para la
forma de ver "panel".

**Qué muestra cada bloque**, en este orden y hasta donde entre según su alto —nunca
el mismo contenido en un bloque de quince minutos que en uno de varias horas—:

- Evento: título, horario y el nombre de su calendario. Con el color de ese
  calendario, y una forma propia (barra lateral) para distinguirse de una tarea o
  un hábito aunque compartan color.
- Tarea: título, horario, proyecto y etiquetas, más un control para completarla que
  nunca se cae por falta de espacio.
- Hábito: lo mismo que una tarea, más una marca que lo identifica como hábito. Un
  hábito salteado ese día se ve marcado, sin desaparecer del calendario. Uno ya
  marcado ese día responde al control de completadas de la barra de opciones,
  igual que una tarea completada: con el control apagado, deja de dibujarse.

**Arrastrar y redimensionar**, en las tres pantallas y para los tres tipos de
bloque:

- Arrastrar una tarea, evento o hábito lo mueve de horario; estirar el borde cambia
  la duración. En un hábito, mover escribe una reprogramación de ESE día (su
  horario habitual no cambia), pero redimensionar cambia
  `habits.duration_minutes`: afecta a **todas** las ocurrencias del hábito, no
  solo a la de ese día, y un aviso lo deja explícito al soltar.
- Mientras se arrastra, se ve a qué hora quedaría —ajustada a la grilla de 15
  minutos— y el lugar de origen queda marcado. El bloque nunca se recorta al salir
  del área visible de la grilla.
- Al soltar, el bloque queda en su nueva posición al instante, sin esperar al
  servidor; si el servidor lo rechaza, vuelve y avisa. Si es una ocurrencia de una
  serie, se pregunta el alcance sin que el bloque salte de vuelta mientras pregunta.
- Arrastrar sobre espacio vacío pregunta si se quiere crear un evento o una tarea.
- Los hábitos sin horario fijo aparecen como chips sueltos que se programan
  arrastrándolos a una hora.

**Acciones sobre un bloque**, con clic derecho:

- Evento: editar, abrir en Google Calendar y eliminar (con confirmación, también
  disponible desde su diálogo de edición).
- Tarea: abrir su detalle, completarla y eliminarla.
- Hábito: editarlo, completarlo y saltearlo ese día. No se ofrece saltear un día ya
  cumplido.

- Opción para mostrar las repeticiones futuras de una tarea recurrente como bloques
  de vista previa.
- En Hoy, siempre en modo día, forzado y sin navegación entre días ni selector de
  formato de calendario: las demás pantallas eligen entre día, cuatro días, semana
  y mes, y navegan libremente.

**Navegación**, distinta según el formato:

- Día, cuatro días y semana se desplazan horizontalmente en forma continua, de a un
  día por vez, arrastrando o deslizando con el dedo: el formato solo dice cuántos
  días se ven a la vez (uno, cuatro o siete), no dónde empieza el tramo — la semana
  no se realinea sola a un día fijo de inicio, se puede quedar mirando de miércoles
  a martes. Anterior y siguiente corren la vista esa misma cantidad de días, con
  desplazamiento suave, sin cambiar cuántos se ven. "Hoy" lleva el desplazamiento
  hasta dejar hoy como primera columna. El desplazamiento alcanza un año hacia atrás
  y uno hacia adelante desde hoy; más allá de eso no hay, por ahora, otra forma de
  llegar. Al entrar a la pantalla, siempre arranca con hoy como primera columna: la
  posición nunca se recuerda de una visita a la siguiente.
- Mes es la excepción: sigue con su grilla de semanas y navegación de mes en mes,
  sin desplazamiento continuo.
- Arrastrar un bloque hasta el borde lateral de la vista desplaza el calendario en
  esa dirección mientras dura el gesto, para poder soltarlo en un día que no estaba
  visible al empezar a arrastrar.

### Barra de opciones de vista

Presente en Bandeja, Hoy, Próximos y Proyecto. **Cada pantalla recuerda las suyas
por separado.**

- Forma de ver: lista, panel o calendario.
- Formato del calendario: semana, mes, cuatro días o día.
- Mostrar u ocultar: completadas, hábitos, repeticiones futuras. "Completadas"
  cubre tanto las tareas hechas como los hábitos ya marcados ese día —el criterio
  es el estado, no el tipo—; un hábito salteado no es un hábito hecho, así que
  sigue viéndose con el control apagado.
- Cuántos días adelante mostrar.
- Orden: manual, por nombre, por fecha o por prioridad.
- Agrupar por: nada, sección, fecha, prioridad o etiqueta en la lista. "Nada"
  siempre es una sola lista corrida, sin bloques ni encabezados, en cualquier
  pantalla — nunca la agrupación natural de la pantalla. Bandeja de entrada y
  Proyecto arrancan agrupadas por "Sección" (su valor por defecto, para verse
  igual que siempre); "sección" nunca se ofrece donde la vista cruza
  proyectos (Hoy, Próximos, una etiqueta, un filtro), y "fecha" nunca se
  ofrece en Hoy, que es un solo día. **La lista de Hoy no ofrece el control**:
  su lista es una secuencia con eventos intercalados, y agrupar la rompe. En
  el panel, el agrupador define las columnas y no ofrece "nada" ni etiqueta
  (una tarea puede tener varias, y aparecería repetida en varias columnas):
  cada pantalla muestra en su lugar un valor por defecto propio — Sección en
  Bandeja y Proyecto, Fecha en Próximos, Prioridad en Hoy. En el panel de Hoy
  y de Próximos tampoco ofrece sección: las dos cruzan proyectos, y una
  sección solo tiene sentido dentro de uno. El panel de Hoy sí sigue
  ofreciendo el agrupador: ahí no hay eventos ni secuencia que romper.
- Filtrar por fecha límite, por prioridad y por etiqueta.
- Botón para restablecer todas las opciones.

---

## 4. Navegación

### Panel lateral (escritorio)

Colapsable a una versión angosta de solo íconos. De arriba abajo:

1. Nombre y correo de la cuenta.
2. Accesos rápidos: agregar tarea, agregar evento (si hay calendario conectado),
   abrir buscador.
3. Accesos principales: Bandeja de entrada, Hoy (con contador de pendientes que
   suma tareas y hábitos), Próximos, Etiquetas (administración), Hábitos, Completado.
4. Favoritos: proyectos, etiquetas y filtros marcados como tales.
5. Árbol de proyectos, con cantidad de tareas por proyecto, ramas colapsables,
   botón para crear subproyecto, y arrastrar para reordenar entre hermanos.
   Anidar un proyecto o cambiarlo de padre se hace desde el menú contextual o
   el diálogo "Mover a…".
6. Lista colapsable de filtros.
7. Al pie: cambiar tema, Configuración, cerrar sesión.

### Barra inferior (teléfono)

Cuatro accesos: Bandeja de entrada, Hoy, Próximos, Agregar. El resto se llega desde
el panel lateral deslizable.

---

## 5. Flujos

### Registro e inicio de sesión

Registro con nombre, correo y contraseña de al menos 8 caracteres, o con cuenta de
Google. Después del registro se envía un correo de confirmación vía Resend.

**Recuperación de contraseña:** el correo de reset lleva a una página funcional
donde se define la nueva contraseña. (Este flujo es obligatorio en la fase 1.)

Al iniciar sesión por primera vez, la cuenta ya tiene su Bandeja de entrada creada.
Cerrar sesión limpia todo lo guardado localmente.

### Selección múltiple

Disponible en Bandeja, Hoy, Próximos, Proyecto, Etiqueta y Filtro. Aparece una barra
con acciones: seleccionar todas, mover a proyecto o sección, cambiar prioridad,
cambiar fecha (con atajos Hoy / Mañana / Sin fecha) y eliminar.

### Deshacer

`Ctrl/Cmd+Z` funciona en cualquier momento, incluso escribiendo en otro campo.
Revierte la última acción sobre una tarea: restaurar una eliminada con todo su
contenido, volver a marcarla pendiente, o deshacer la última edición.

Además, **toda acción destructiva muestra un toast con opción de deshacer**. El
borrado de proyecto, que no es reversible, exige confirmación explícita con conteo
de tareas afectadas.

### Sincronización

Con conexión, los cambios en tareas, proyectos, secciones, etiquetas, comentarios,
recordatorios, filtros y hábitos se reflejan casi al instante en cualquier otra
pestaña o dispositivo con la misma cuenta.

---

## 6. Alta rápida en lenguaje natural

Al escribir el título de una tarea, ciertas palabras se reconocen y se convierten
en atributos. Lo reconocido queda **resaltado en el texto**, se puede desactivar con
doble clic si no era la intención, y al confirmar se quita del título.

El contrato canónico del parser vive en `docs/parser-test-cases.md`: todos los
casos con su salida exacta y las reglas de desambiguación. Si el parser no pasa
un caso de esa tabla, el error está en el parser, no en el caso. Acá se
describen las categorías que reconoce; ahí están los ejemplos concretos.

**Fechas relativas:** hoy, mañana, pasado mañana, ayer, este fin de semana, próxima
semana, próximo lunes, en 3 días / semanas / meses / años.

**Fechas puntuales:** 15 de marzo, 15 de mar, 15 de marzo de 2026, 15/03,
15/03/2026, 15-03-26.

**Día de la semana suelto:** "reunión lunes" — como último recurso, si no se
encontró nada más específico.

**Horas:** 14:30, a las 14:30, 3pm, 9am, a las 9.

**Duraciones:** 1h30m, por 45min, 2 horas.

**Repetición:** cada día, cada semana, cada mes, cada año, cada 2 semanas, cada
3 días, cada 2 meses, cada 2 años, cada lunes, cada día laborable.

**Símbolos:** `p1` a `p4` asignan prioridad; `#` elige proyecto o sección; `@`
elige o crea una etiqueta.

> **Regla crítica:** "la mañana", "a la mañana" y "de la mañana" son un momento
> del día y no producen ningún atributo — quedan como texto del título. "Esta
> mañana" sí produce fecha: `due_date = hoy`, sin hora. Y "de mañana", sin
> artículo, es el día siguiente. El par mínimo es "de la mañana" contra "de
> mañana": la única diferencia léxica es el artículo, y cambia todo el resultado.
> Es el error clásico de los parsers en español y va cubierto con tests desde el
> primer día.

---

## 7. Lenguaje de filtros

| Campo | Valores |
| --- | --- |
| `priority` | `1` a `4`, combinables con comas |
| `due` | `today`, `tomorrow`, `overdue`, `nodate`, `next7days`, `next30days`, fecha exacta `YYYY-MM-DD`, `due:before:FECHA`, `due:after:FECHA` |
| `label` | nombre de una o varias etiquetas |
| `project` | nombre de uno o varios proyectos |
| `completed` | `true` / `false` |
| `search` | texto a buscar en título o descripción |
| `recurring` | `true` / `false` |
| `subtask` | `true` / `false` |
| `created` | fecha exacta, `created:before:`, `created:after:` |
| `no_project` | tareas de la Bandeja de entrada |

Se combinan con `&` (y), `|` (o) y `!` (no), y se agrupan con paréntesis. Varios
valores separados por coma dentro de un campo equivalen a un "o" entre ellos.

Si la consulta no dice nada sobre `completed`, las completadas quedan afuera por
defecto.

Ejemplo: `(priority:1,2 & due:next7days) & !label:espera`

Los errores de sintaxis se muestran **en español** mientras se escribe, indicando la
posición del problema. Al crear o editar un filtro se muestra en vivo cuántas tareas
coinciden.

---

## 8. Recurrencia

Las reglas de repetición se guardan en formato **RRULE (RFC 5545)**, el mismo
estándar que usa Google Calendar. Esto evita una migración cuando se conecte el
calendario en la fase 4.

Al completar una tarea recurrente se crea automáticamente la siguiente, heredando
proyecto, sección, título, descripción, prioridad, duración, fecha límite y
etiquetas. La próxima fecha se calcula a partir de la fecha de vencimiento original
o de la fecha de completado, según cómo esté configurada la repetición.

Si la repetición llegó a su fin (por fecha tope o cantidad de veces), no se crea
nada más.

---

## 9. Recordatorios

Se activan desde Configuración. El navegador pide permiso, y se puede activar en
varios dispositivos a la vez.

Al agregar un recordatorio se elige:

- Un **momento puntual** (fecha y hora concretas), o
- Un **momento relativo a la tarea**: a la hora de la tarea, 10/30/45 minutos antes,
  1/2/3 horas antes, 1/2/3 días antes, una semana antes.

Las opciones relativas ofrecidas dependen de lo que la tarea tenga: con fecha y
hora, todas, incluida "a la hora de la tarea"; con solo fecha, los desfases,
calculados desde la **hora de referencia** configurable en Configuración (a qué
hora se considera que vence una tarea sin hora) — pero nunca "a la hora de la
tarea", porque afirmaría una hora que la tarea no tiene; sin ninguna fecha, ningún
relativo, solo puntual.

Cuando llega el momento se envía una notificación push con el título de la tarea.
Al tocarla se abre esa tarea.

**Cada recordatorio se entrega como máximo una vez.** Si no llegó a tiempo, no se
reintenta.

El ícono de la aplicación muestra un número con la cantidad de pendientes de hoy
(tareas más hábitos).

---

## 10. Atajos de teclado

**Generales:** `Ctrl/Cmd+Z` deshacer; `G` seguido de `I` (Bandeja), `H` (Hoy),
`P` (Próximos), `E` (Etiquetas), `C` (Completado), `A` (Hábitos); `S` buscador;
`Q` nueva tarea; `E` nuevo evento de calendario.

**Detalle de tarea:** `Ctrl+S` guardar, `D` fecha, `L` fecha límite, `F` prioridad,
`R` recordatorios, `O` proyecto, `E` etiquetas, `N` nueva subtarea.

**Según pantalla:** `S` en Bandeja abre el editor de secciones; `⇧S` en un proyecto
agrega una sección; `Escape` cierra menús y ventanas emergentes.

**Menú contextual de tarea:** `T` fecha, `Y` prioridad, `V` mover a, `⇧Ctrl+C`
copiar enlace, `Ctrl⇧N` abrir en ventana nueva, `⇧Supr` eliminar.

Un atajo con modificador `Ctrl`/`Cmd` (por ejemplo `Ctrl+S`, `⇧Ctrl+C`,
`Ctrl⇧N` o `Ctrl/Cmd+Z`) se dispara aunque el foco esté en un campo de texto.
Un atajo de tecla suelta, sin `Ctrl` ni `Cmd` —incluida una combinación con
`Shift` sola, como `⇧Supr`— no se dispara en esa misma situación.

---

## 11. Configuración

- **Perfil** — cambiar nombre, ver correo (no editable), cambiar contraseña.
- **Tema** — claro, oscuro o según el sistema.
- **Instalación** — instalar como app, instrucciones para iPhone.
- **General** — zona horaria (lista IANA completa), formato de fecha, formato de
  hora (12 o 24), día en que empieza la semana (lunes, domingo o sábado), pantalla
  por defecto al entrar, proyecto por defecto para el alta rápida.
- **Notificaciones y recordatorios** — activar o desactivar push, y la hora de
  referencia para los recordatorios relativos sobre tareas sin hora.
- **Calendarios** — conexión con Google Calendar y qué calendarios se muestran.

No hay selector de idioma: la app es solo en español.

---

## 12. Identidad visual

**Marca:** Trazio.

**Ícono:** recuadro redondeado azul sólido con borde blanco, y dos checks apilados
verticalmente en el centro — el de arriba blanco, el de abajo rojo.

**Paleta:**

| Rol | Hex |
| --- | --- |
| Azul de marca | `#283B56` |
| Rojo de marca / Urgente | `#EC1E2A` |
| Naranja / Alta | `#F58220` |
| Gris / Baja | `#8A94A0` |

El rojo cumple doble función: color de marca y prioridad Urgente. Es una decisión
tomada (ver `docs/decisions.md`). Consecuencia práctica: **no usar rojo para
errores de formulario ni para estados destructivos genéricos** — ahí conviene un
tono distinto para no diluir su significado.

Estilo, tipografía y espaciado se definen consultando la skill `ui-ux-pro-max`
antes de construir pantallas.

---

## 13. Fuera de alcance

Decisiones tomadas. No son omisiones ni cosas pendientes:

1. **Sin modo offline.** La app requiere internet.
2. **Sin exportar ni importar datos.** En ninguna versión.
3. **Sin idiomas además del español.**
4. **Sin markdown en el título** de las tareas.
5. **Sin recordatorios por email.** Solo push.
6. **Sin equipos, compartir, invitar ni asignar** tareas a otra persona.
7. **Sin adjuntar archivos** a tareas ni comentarios.
8. **Sin aplicación en tiendas.** Solo web instalable.
9. **Sin proveedores de calendario además de Google.**
10. **Sin versión de escritorio empaquetada.**
