## Why

El agrupador de la lista ofrece **nada, prioridad y etiqueta**. Faltan los dos que el panel acaba de
ganar: **sección** y **fecha**.

El dueño lo pidió así: *"en modo lista también tiene que haber más agrupadores, por default es el
sección pero tendría que haber más"*.

Y arrastra el mismo problema que él mismo señaló en el panel: **"sin agrupar" no significa lo
mismo en todas partes**. En un proyecto muestra las tareas repartidas en bloques por sección; en
Hoy, en una etiqueta o en un filtro muestra una lista corrida. Un solo valor, dos comportamientos.

Eso además deja un hueco: **hoy no hay forma de ver un proyecto como una lista corrida**. Si tiene
secciones, siempre se ven los bloques.

**Una inconsistencia que esto corrige de paso**: el spec vigente afirma que en la lista el control
ofrece los cinco valores. El código ofrece tres. Quedó así hoy al restringir cada forma de ver a lo
que sabe manejar, y el escenario no se actualizó.

## What Changes

**El agrupador de la lista pasa a tener cinco valores con significado propio**

| Valor | Qué hace en la lista |
| --- | --- |
| Sin agrupar | **Una sola lista corrida**, sin bloques ni encabezados. Hoy esto no existe en un proyecto |
| Sección | Bloques por sección. Es lo que hoy hace "sin agrupar" en un proyecto |
| Fecha | Bloques por día |
| Prioridad | Como hoy |
| Etiqueta | Como hoy |

**El valor por defecto de cada pantalla deja de ser implícito.** En Bandeja y Proyecto pasa a ser
**Sección**, que es lo que ya se ve. Nadie debería notar un cambio al abrir.

**Sección se ofrece solo donde hay un proyecto solo** — Bandeja y Proyecto—, la misma regla que ya
rige en el panel: una sección no significa nada en una vista que cruza proyectos.

**BREAKING** de datos: hoy "sin agrupar" guardado en un proyecto muestra secciones. Después de esto
significaría lista corrida, así que quien lo tenga guardado **vería su proyecto plano de golpe**.

## Capabilities

### Modified Capabilities

- `opciones-de-vista`: el agrupador de la lista gana sección y fecha; "sin agrupar" pasa a
  significar lista corrida en todas las pantallas; y el valor por defecto de cada pantalla se vuelve
  explícito.
- `vistas-lista`: un proyecto puede verse sin bloques de sección, que hoy es imposible.

## Impact

**Hace falta una migración de datos, y es lo único de esta ronda que toca la base.** Las
preferencias guardadas viven en un documento por pantalla. Un "sin agrupar" ya guardado en un
proyecto tiene que reescribirse a "sección" **una sola vez**; si no, el usuario abre y ve su
proyecto plano sin haber pedido nada.

No alcanza con resolverlo al leer: después de la migración, "sin agrupar" tiene que poder
significar de verdad lista corrida, y no hay forma de distinguir *"nunca lo toqué"* de *"lo elegí"*
si se sigue traduciendo en la lectura.

**Lo que se pierde al aplanar un proyecto.** Los bloques de sección no son solo un encabezado:
traen **colapsar, agregar una tarea dentro de esa sección, y el menú de la sección**. Una lista
corrida no tiene dónde poner nada de eso, así que agrupando por cualquier otra cosa **esas acciones
desaparecen de la lista**. Hay que verificar que sigan alcanzables desde otro lado, o el cambio
rompe **D24**.

**El arrastre.** Reordenar a mano depende de la posición dentro de un contexto. Agrupando por algo
que no sea sección, arrastrar dentro de un bloque no tiene dónde persistirse — el mismo problema que
el panel ya resolvió apagándolo salvo en orden manual.

**Hoy es el caso raro.** Su lista ya no es una lista de tareas: es una secuencia de tres tramos con
eventos intercalados, ordenada por hora. Agrupar rompe eso. Hay que decidir explícitamente qué
ofrece Hoy, en vez de heredar la regla general.

**Fuera de alcance**: agrupar por proyecto, igual que en el panel, por el mismo motivo.
