# Trazio — Casos de prueba del parser

Contrato canónico del alta rápida en lenguaje natural. Estos casos **son** la
especificación: si el parser no los pasa, el parser está mal, no el caso.

El criterio de aceptación de la fase 1 ya referencia este archivo por nombre en
`docs/roadmap.md`: el parser tiene que pasar los **63 casos** de esta tabla.

---

## Cómo se leen

- **Entrada** — lo que el usuario escribe en el campo de alta rápida.
- **Título** — lo que queda como título después de confirmar, con los tokens
  reconocidos ya removidos.
- **Atributos** — lo que se extrajo.

Las fechas se expresan en relativo (`hoy`, `hoy+1`) y **los tests se escriben así,
nunca con fechas fijas**. Un test con `2026-07-25` hardcodeado se rompe mañana.

Zona horaria de referencia: la del usuario. Los tests corren con
`America/Argentina/Buenos_Aires` y también con al menos una zona con offset
distinto, para atrapar corrimientos de día.

---

## Reglas de desambiguación

Definidas acá porque el spec funcional no alcanzaba. Son decisiones, no
convenciones heredadas.

**Principio rector: ante ambigüedad, extraer menos.** Un atributo de menos lo
corrige el usuario en dos segundos; uno de más lo descubre cuando le suena una
notificación que no esperaba.

**R1 — Formato de fecha: día primero, siempre.** `15/03` es 15 de marzo. Nunca 3
de mayo. No existe interpretación mes-primero, ni siquiera cuando ambos números
son menores a 13.

**R2 — Año omitido: la próxima ocurrencia.** `15 de marzo` escrito en julio de
2026 resuelve a marzo de **2027**. Nunca a una fecha pasada.

**R3 — Hora sin AM/PM.** Las horas 1 a 7 se interpretan como PM; las 8 a 12, como
AM. `a las 3` es 15:00; `a las 9` es 09:00. Es la interpretación que acierta más
seguido en el uso cotidiano.

**R4 — Día de la semana suelto: solo como último recurso.** Si ya se reconoció una
fecha por otra vía, un nombre de día en el texto **no** se vuelve a interpretar.

**R5 — Un solo valor por atributo.** Si aparecen dos fechas, gana la primera
reconocida y la segunda queda como texto del título.

**R6 — Números sueltos no son fechas.** `Comprar 3 manzanas` no tiene fecha.
Un número solo se interpreta como fecha si está acompañado de un marcador
(`en 3 días`, `15 de marzo`, `15/03`).

**R7 — El resaltado es reversible.** Todo token reconocido se muestra resaltado y
se desactiva con doble clic. Al desactivarlo, el token vuelve a ser texto común y
el atributo se descarta.

**R8 — Preposiciones y artículos: se consumen solo si son parte de la locución.**
La preposición o el artículo forman parte del token únicamente cuando son parte
léxica de la locución que desambigua (`de mañana`, `esta mañana`, `pasado
mañana`, `este fin de semana`, `próxima semana`, `en 3 días`, `a las 3`, `por
45min`, `cada lunes`). Un determinante suelto delante de una fecha numérica o
nominal (`el 15 de marzo`, `el 20/08`) no es parte del token y queda en el
título.

Al remover un rango del medio del texto los espacios se normalizan: las
secuencias de espacio colapsan a uno y se recortan los extremos. Pero los
artículos huérfanos no se tocan — eso es lo que explica los títulos de los casos
14 (`Vence el`) y 21 (`Reunión el con el equipo del lunes`), que a primera vista
parecen inconsistentes con el caso 50.

### Precisiones

Aclaraciones sobre reglas ya definidas, adoptadas después del contrato original.

- **Sobre R2:** un año de dos dígitos siempre es `20YY`. No hay pivote de siglo.
- **Sobre R3:** una hora ya pasada no se corre al día siguiente. `Dentista 3pm`
  escrito a las 18:00 queda hoy 15:00 y vencida. Correr la fecha sería inventar
  intención.
- **Sobre R5:** "primera" es primera en el texto, de izquierda a derecha, no en
  orden de pasada del parser. Y `@` está exento de R5 porque las etiquetas son
  multivaluadas, como muestra el caso 43.
- **Sobre R7:** se resalta lo que produjo un atributo, no lo que se consideró. Un
  candidato descartado por R4 —como el "lunes" del caso 21— no queda resaltado.
- **Sobre "próxima semana" (caso 6):** resuelve al primer día de la semana
  siguiente según la preferencia `week_starts_on` del usuario. El caso 6 asume el
  valor por defecto, lunes.
- **Sobre el día de la semana y el fin de semana:** "lunes" y "próximo lunes"
  escritos un lunes resuelven a hoy+7, nunca a hoy. Pero "este fin de semana"
  escrito un sábado o un domingo resuelve a hoy. La asimetría es deliberada.
- **Sobre la recurrencia y el ancla:** la recurrencia sola no fija fecha —los
  casos 31 a 37 siguen sin `due_date`—, pero la recurrencia acompañada de una
  hora sí fija `due_at` en la próxima ocurrencia, como muestra el caso 54.
- **Sobre listas de días (casos 57-59):** `cada lunes, miércoles y viernes`
  reconoce los tres días como una sola repetición, con `BYDAY` siempre en
  orden canónico `MO,TU,WE,TH,FR,SA,SU` sin importar el orden en que se
  escribieron. Con hora y varios días, "la próxima ocurrencia" del ancla (E12)
  es la más próxima entre **todos** los días de la lista, no la del primero
  que aparece en el texto — ver el caso 59.

---

## Fechas relativas

| # | Entrada | Título | Atributos |
| --- | --- | --- | --- |
| 1 | `Llamar a mamá hoy` | Llamar a mamá | `due_date = hoy` |
| 2 | `Comprar pan mañana` | Comprar pan | `due_date = hoy+1` |
| 3 | `Turno médico pasado mañana` | Turno médico | `due_date = hoy+2` |
| 4 | `Revisar notas ayer` | Revisar notas | `due_date = hoy-1` |
| 5 | `Limpiar el garage este fin de semana` | Limpiar el garage | `due_date` = próximo sábado |
| 6 | `Enviar informe próxima semana` | Enviar informe | `due_date` = lunes de la semana siguiente |
| 7 | `Reunión próximo lunes` | Reunión | `due_date` = lunes siguiente |
| 8 | `Renovar seguro en 3 días` | Renovar seguro | `due_date = hoy+3` |
| 9 | `Vacaciones en 2 semanas` | Vacaciones | `due_date = hoy+14` |
| 10 | `Control en 6 meses` | Control | `due_date = hoy+6 meses` |
| 11 | `Renovar pasaporte en 1 año` | Renovar pasaporte | `due_date = hoy+1 año` |

## Fechas puntuales

| # | Entrada | Título | Atributos |
| --- | --- | --- | --- |
| 12 | `Cumpleaños de Ana 15 de marzo` | Cumpleaños de Ana | `due_date` = 15/03, próxima ocurrencia (R2) |
| 13 | `Pagar patente 15 de mar` | Pagar patente | `due_date` = 15/03, próxima ocurrencia |
| 14 | `Vence el 15 de marzo de 2027` | Vence el | `due_date = 2027-03-15` |
| 15 | `Entrega 15/03` | Entrega | `due_date` = 15/03, próxima ocurrencia (R1) |
| 16 | `Entrega 15/03/2027` | Entrega | `due_date = 2027-03-15` |
| 17 | `Entrega 15-03-27` | Entrega | `due_date = 2027-03-15` |
| 18 | `Reunión 05/06` | Reunión | `due_date` = 5 de junio, **no** 6 de mayo (R1) |

## Día de la semana suelto

| # | Entrada | Título | Atributos |
| --- | --- | --- | --- |
| 19 | `Reunión lunes` | Reunión | `due_date` = próximo lunes |
| 20 | `Gimnasio viernes` | Gimnasio | `due_date` = próximo viernes |
| 21 | `Reunión el 20/08 con el equipo del lunes` | Reunión el con el equipo del lunes | `due_date` = 20/08. El "lunes" **no** se parsea (R4) |

## Horas

| # | Entrada | Título | Atributos |
| --- | --- | --- | --- |
| 22 | `Llamar al banco a las 14:30` | Llamar al banco | `due_at` = hoy 14:30 |
| 23 | `Dentista 3pm` | Dentista | `due_at` = hoy 15:00 |
| 24 | `Desayuno 9am` | Desayuno | `due_at` = hoy 09:00 |
| 25 | `Reunión a las 3` | Reunión | `due_at` = hoy 15:00 (R3) |
| 26 | `Reunión a las 9` | Reunión | `due_at` = hoy 09:00 (R3) |
| 27 | `Llamar mañana a las 10` | Llamar | `due_at` = hoy+1 10:00 |

## Duraciones

| # | Entrada | Título | Atributos |
| --- | --- | --- | --- |
| 28 | `Correr 1h30m` | Correr | `duration_minutes = 90` |
| 29 | `Meditar por 45min` | Meditar | `duration_minutes = 45` |
| 30 | `Estudiar 2 horas` | Estudiar | `duration_minutes = 120` |

## Repetición

| # | Entrada | Título | RRULE |
| --- | --- | --- | --- |
| 31 | `Regar plantas cada día` | Regar plantas | `FREQ=DAILY` |
| 32 | `Sacar la basura cada semana` | Sacar la basura | `FREQ=WEEKLY` |
| 33 | `Pagar alquiler cada mes` | Pagar alquiler | `FREQ=MONTHLY` |
| 34 | `Renovar dominio cada año` | Renovar dominio | `FREQ=YEARLY` |
| 35 | `Reunión de equipo cada 2 semanas` | Reunión de equipo | `FREQ=WEEKLY;INTERVAL=2` |
| 36 | `Gimnasio cada lunes` | Gimnasio | `FREQ=WEEKLY;BYDAY=MO` |
| 37 | `Revisar mails cada día laborable` | Revisar mails | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` |

## Símbolos

| # | Entrada | Título | Atributos |
| --- | --- | --- | --- |
| 38 | `Llamar al contador p1` | Llamar al contador | `priority = 1` (Urgente) |
| 39 | `Ordenar el placard p4` | Ordenar el placard | `priority = 4` (Baja) |
| 40 | `Comprar leche @compras` | Comprar leche | etiqueta `compras` |
| 41 | `Terminar informe #Trabajo` | Terminar informe | proyecto `Trabajo` |
| 42 | `Revisar diseño #Trabajo/En curso` | Revisar diseño | proyecto `Trabajo`, sección `En curso` |
| 43 | `Comprar regalo @compras @urgente` | Comprar regalo | etiquetas `compras` y `urgente` |

## Casos críticos

Los que rompen la mayoría de los parsers. **Ninguno es opcional.**

| # | Entrada | Título | Atributos | Por qué |
| --- | --- | --- | --- | --- |
| 44 | `Salir a correr a la mañana` | Salir a correr a la mañana | **ninguno** | "la mañana" es un momento del día, no el día siguiente |
| 45 | `Reunión esta mañana` | Reunión | `due_date = hoy` | "esta mañana" es hoy, jamás hoy+1 |
| 46 | `Terminar el informe de la mañana` | Terminar el informe de la mañana | **ninguno** | Ídem 44 |
| 47 | `Comprar 3 manzanas` | Comprar 3 manzanas | **ninguno** | R6 |
| 48 | `Llamar al 4567-8900` | Llamar al 4567-8900 | **ninguno** | Un teléfono no es una hora ni una fecha |
| 49 | `Revisar objetivos Q1 2027` | Revisar objetivos Q1 2027 | **ninguno** | Un año suelto no es una fecha completa |
| 50 | `Preparar la reunión de mañana` | Preparar la reunión | `due_date = hoy+1` | Acá sí: "de mañana" es el día siguiente |
| 51 | `Comprar pan` | Comprar pan | **ninguno** | Sin tokens, sin atributos |
| 52 | `Pagar el alquiler el 1` | Pagar el alquiler el 1 | **ninguno** | Un número ordinal solo es ambiguo; no adivinar |

### El caso completo

| # | Entrada |
| --- | --- |
| 53 | `Reunión con Ana el próximo martes a las 3pm por 45min p2 @trabajo #Proyectos` |

Resultado esperado:

- **Título:** `Reunión con Ana`
- `due_at` = próximo martes 15:00
- `duration_minutes` = 45
- `priority` = 2 (Alta)
- etiqueta `trabajo`
- proyecto `Proyectos`

Este es el caso que va en la demo de la landing y el que conviene tener andando
primero: si funciona, funciona casi todo.

### Incorporaciones posteriores

Casos agregados después del contrato original de 53. No renumeran los
anteriores: hay specs de OpenSpec, tareas y decisiones que referencian los
casos existentes por número.

| # | Entrada | Título | Atributos | Por qué |
| --- | --- | --- | --- | --- |
| 54 | `Gimnasio cada lunes a las 8` | Gimnasio | RRULE `FREQ=WEEKLY;BYDAY=MO` y `due_at` = próximo lunes 08:00 (la hora 8 es AM por R3) | Es el caso mixto más común y no estaba. La hora reconocida no tiene dónde vivir salvo en `due_at`: si no se fija, el token "a las 8" se reconoce y se descarta en silencio |
| 55 | `Comprar pan manana` y `Comprar pan MAÑANA` | Comprar pan (en los dos casos) | `due_date = hoy+1` | La comparación de palabras clave ignora acentos y mayúsculas |
| 56 | `Comprar pan mañ` | Comprar pan mañ | **ninguno** | El parser corre en cada tecla, así que la mayor parte del tiempo ve texto incompleto; un prefijo no dispara reconocimiento |
| 57 | `Gimnasio cada lunes, miércoles y viernes por 1h` | Gimnasio | RRULE `FREQ=WEEKLY;BYDAY=MO,WE,FR`, `duration_minutes = 60` | Es el ejemplo de la demo de la landing: una lista de tres días con coma y "y" final, más una duración corta con "por". La lista se remueve del título de punta a punta (comas y "y" incluidos), no día por día |
| 58 | `Yoga cada martes y jueves` | Yoga | RRULE `FREQ=WEEKLY;BYDAY=TU,TH` | Caso mínimo de lista: dos días unidos solo por "y", sin coma. Como no hay hora, la recurrencia no fija ancla (ídem 31-37) |
| 59 | `Gimnasio cada lunes y jueves a las 8` | Gimnasio | RRULE `FREQ=WEEKLY;BYDAY=MO,TH` y `due_at` = la ocurrencia más próxima entre lunes y jueves, a las 08:00 | Lista de días con hora: con varios días, "la próxima ocurrencia" (E12) no es automáticamente la del primer día que escribió el usuario — es el día de la lista que caiga antes a partir de ahora, nunca hoy (R10). Con el reloj de referencia de la suite (`2026-07-26T18:00:00Z`), en `America/Argentina/Buenos_Aires` hoy es domingo 26/07 y el lunes 27/07 es lo más próximo (`due_at` = 2026-07-27 08:00 ART); en `Pacific/Kiritimati` (UTC+14) hoy ya es lunes 27/07, así que el próximo lunes salta a la semana siguiente (03/08) y el jueves 30/07 queda más cerca (`due_at` = 2026-07-30 08:00 Kiritimati) — el mismo texto ancla en un día de la semana distinto según la zona, que es justo lo que E13 quiere atrapar |
| 60 | `Regar las plantas cada 3 días` | Regar las plantas | RRULE `FREQ=DAILY;INTERVAL=3` | Faltaba el equivalente en días de `cada 2 semanas` (caso 35). Es además el ejemplo literal de D-D (`design.md` de `fase-2-potencia`): al ser intervalo puro, sin `BYDAY`, ancla en la fecha de completado, no en la de vencimiento |
| 61 | `Renovar seguro en 3 días` sigue sin repetición | Renovar seguro | `due_date = hoy+3` (caso 8, sin cambios) | No hay conflicto entre "cada 3 días" (repetición) y "en 3 días" (fecha relativa): son locuciones distintas, una empieza con "cada" y la otra con "en", y ninguna se solapa con la duración estimada (que solo reconoce horas/minutos, nunca días) |
| 62 | `Pagar el seguro cada 2 meses` | Pagar el seguro | RRULE `FREQ=MONTHLY;INTERVAL=2` | Por simetría con el intervalo de semanas y de días |
| 63 | `Renovar la garantía cada 2 años` | Renovar la garantía | RRULE `FREQ=YEARLY;INTERVAL=2` | Ídem, por simetría |

---

## Sobre la implementación

- **Los tests van con el primer commit del parser**, no después. Escribir la tabla
  como suite de Vitest antes de la primera línea de lógica.
- Los casos 44 a 52 y 54 a 56 son los que hay que escribir **primero**. Es
  tentador arrancar por los fáciles; los difíciles son los que definen la
  arquitectura.
- El parser corre en el cliente, en cada tecla, con debounce. Tiene que ser rápido
  y no puede tirar excepciones: ante cualquier entrada rara, devolver el texto
  como título sin atributos.
- Si un caso de esta tabla se decide cambiar, se cambia **acá primero** y se anota
  en `docs/decisions.md`. La tabla manda.

## Casos futuros

No entran en la fase 1, pero conviene que la arquitectura no los imposibilite:

- Rangos: `del 3 al 7 de agosto`
- Recurrencia con fin: `cada lunes hasta diciembre`, `cada día por 10 veces`
- Fechas relativas a otro evento: `dos días antes del vencimiento`
