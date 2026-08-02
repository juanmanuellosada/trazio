## Why

El clic derecho sobre una tarea no hace nada: aparece el menú del navegador. Todas las
acciones de una tarea están detrás del botón de tres puntitos, que además **solo se ve al
pasar el mouse**.

Y cuando se abre, ese menú no resuelve nada en el lugar: para poner una fecha o una
prioridad hay que abrir el detalle. Los atajos `T` e `Y` ya existen para eso, pero lo que
hacen es abrir el detalle con el selector enfocado, no cambiar el valor ahí mismo.

El dueño pidió un menú con acciones rápidas: filas de fecha y de prioridad resueltas en el
propio menú, más agregar una tarea encima o debajo.

La mayor parte de las piezas ya está: **la primitiva de menú por clic derecho existe** —y
su propia documentación dice que espera un segundo consumidor—, los accesos rápidos de
fecha existen, y el punto de color de prioridad ya se reutiliza en la fila. Falta
ensamblar.

## What Changes

**El clic derecho sobre una tarea abre su menú**

- Sería el segundo consumidor de la primitiva de menú contextual, hoy usada solo por el
  editor de descripción.

**Un solo menú, no dos**

- El botón de tres puntitos y el clic derecho abren **el mismo** menú. Tener dos listas de
  acciones que divergen es peor que cualquiera de las dos.

**El menú resuelve fecha y prioridad sin salir**

- Una fila de accesos rápidos de fecha: los cuatro que ya existen, más quitar la fecha y
  abrir el selector completo.
- Una fila con las cuatro prioridades.
- `T` e `Y` pasan a abrir esas filas en vez de abrir el detalle.

**Agregar una tarea encima o debajo**

- Dos acciones nuevas. Usan **el componente de alta compartido**, como exige el spec: no
  se escribe un alta propia.

**Se suman fecha límite y recordatorios**

- Hoy no están en el menú de la fila; para tocarlos hay que abrir el detalle.

Lo que ya está —duplicar, mover, subir, bajar, convertir en subtarea, copiar enlace, abrir
en ventana aparte, eliminar— se mantiene.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tareas`: el menú de acciones de una tarea se abre también con clic derecho, es único
  para las dos entradas, y resuelve fecha y prioridad sin abrir el detalle. Se suman
  agregar tarea encima y debajo, fecha límite y recordatorios.

`atajos-de-teclado` **no necesita delta**, y eso es un hallazgo: su requisito ya dice que
`T` e `Y`, con el menú abierto, *"abren el selector de fecha"* y *"de prioridad"* de esa
tarea. El código de hoy abre el detalle con el campo enfocado, que ya se desviaba del
contrato. Resolverlo dentro del menú lo acerca al spec en vez de alejarlo.

## Impact

**Código.** `components/tasks/task-row.tsx` concentra el menú y es donde va casi todo. La
primitiva de menú contextual ya soporta ítems, separadores y submenús. Los accesos rápidos
de fecha y el punto de prioridad ya existen y se reutilizan.

**Alta.** Agregar tarea encima y debajo son superficies de alta nuevas, y el spec de
`alta-de-tareas` exige que **ninguna superficie tenga implementación propia**. Van con el
componente compartido. El cálculo de la posición tiene primitivas ya escritas.

**Lo que no existe hoy y hay que resolver.** Entre los accesos rápidos de fecha no está
"sin fecha" —quitar la fecha es un botón aparte dentro del selector— ni "abrir el selector
completo".

**Riesgo puntual.** El clic derecho tiene que seguir dando el menú del navegador donde
corresponda: sobre un enlace, sobre texto seleccionado, sobre un campo de edición.

**Fuera de alcance.** El menú contextual en otras superficies: proyectos, secciones,
etiquetas, eventos del calendario. "Añadir una extensión" de la referencia, que es de
Todoist y no aplica.
