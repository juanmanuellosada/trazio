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

Agrupación con nombre dentro de un proyecto ("Por hacer", "En curso", "Hecho").
Se puede colapsar, renombrar, reordenar y eliminar. Al eliminar una sección, sus
tareas **no** desaparecen: quedan sin sección dentro del mismo proyecto.

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
| Comentarios | Hilo propio, texto enriquecido. |
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

Cada tarea tiene su hilo. Texto enriquecido. Se crean, editan (quedan marcados como
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

Vista como lista, panel agrupado por sección, o calendario. Vacía muestra:
"Tu bandeja de entrada está vacía."

### Hoy

Bloques en este orden: atrasadas (destacadas en rojo), tareas de hoy, hábitos del
día (con contador de cuántos se hicieron), eventos de hoy, y — si se activa la
opción — las completadas. El botón de agregar precarga la fecha de hoy. Dentro de
cada bloque, orden por hora y no manual (D25): primero las tareas con hora en
orden cronológico, después las de todo el día; en atrasadas, la más vencida
primero.

### Próximos

Ventana configurable de una semana a tres meses. Deja afuera las tareas sin fecha.
Tres formas de verlo:

- **Lista:** agrupada por día, con "Hoy" y "Mañana" resaltados, contador por día y
  botón para agregar una tarea en ese día.
- **Panel:** una columna por día más una columna "Sin fecha". Arrastrar una tarea a
  otra columna le cambia la fecha.
- **Calendario:** semana, cuatro días o mes en escritorio; día o mes en teléfono.

### Proyecto

Primero las tareas sin sección, después cada sección colapsable con su propio botón
de agregar. Tareas y secciones se reordenan arrastrando (solo con orden manual y sin
agrupación activa). Desde el menú del proyecto: editar, favorito, agregar sección,
archivar, eliminar.

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
fila aparte arriba para eventos de todo el día y una línea marcando la hora actual.

- Arrastrar una tarea, evento o hábito lo mueve de horario.
- Estirar el borde cambia la duración.
- Los cambios se ajustan a intervalos de 15 minutos.
- Arrastrar sobre espacio vacío pregunta si se quiere crear un evento o una tarea.
- Los hábitos sin horario fijo aparecen como chips sueltos que se programan
  arrastrándolos a una hora.
- Opción para mostrar las repeticiones futuras de una tarea recurrente como bloques
  de vista previa.

### Barra de opciones de vista

Presente en Bandeja, Hoy, Próximos y Proyecto. **Cada pantalla recuerda las suyas
por separado.**

- Forma de ver: lista, panel o calendario.
- Formato del calendario: semana, mes, cuatro días o día.
- Mostrar u ocultar: completadas, hábitos, repeticiones futuras.
- Cuántos días adelante mostrar.
- Orden: manual, por nombre, por fecha o por prioridad.
- Agrupar por: nada, prioridad o etiqueta.
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
6. Lista colapsable de las etiquetas que no son favoritas, cada una a su propia
   página; y lista colapsable de filtros.
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
  1/2/3 horas antes, 1/2/3 días antes, una semana antes. Los relativos requieren que
  la tarea tenga fecha y hora.

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
- **Notificaciones** — activar o desactivar push.
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
