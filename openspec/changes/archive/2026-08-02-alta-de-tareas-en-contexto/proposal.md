## Why

El dueño pidió tres cosas sobre el alta de tareas: que el modal del botón "Agregar tarea"
y del atajo `Q` salga **simple** y se despliegue al pulsar el `+`, que muestre a qué
proyecto va a ir **según dónde estoy parado**, y que el alta embebida en las listas sea
**más completa**.

Al mapear el código, la mayor parte ya está: hay **un solo componente** con dos
tratamientos visuales, el desplegar ya existe, y el alta embebida ya permite título,
descripción, fecha, fecha límite y prioridad —además de asignar y crear etiquetas
escribiendo `@nombre`—.

Lo que falta es concreto:

- **El modal de `Q` y del panel lateral no hereda dónde estás.** Está clavado en Bandeja.
  Parado en un proyecto, la tarea cae en Bandeja; parado en Hoy, queda sin fecha. El alta
  embebida sí hereda proyecto, sección y día: es la misma información, no pasada.
- **Ese modal abre con todo desplegado**, que es lo contrario de lo que se pide.
- **El alta embebida no dice a dónde va la tarea.** El spec exige que el destino se vea
  antes de confirmar, y en esa variante no se muestra nada.
- **Etiquetas y recordatorios no están en el alta.** Existen como selectores y se usan en
  el detalle; el spec hoy los prohíbe explícitamente en el alta.
- **El diálogo de crear tarea arrastrando en el calendario es una implementación
  paralela**, con su propio campo y su propio selector nativo, sin parser. El spec exige
  que ninguna superficie tenga implementación propia.
- **Existe una preferencia de proyecto por defecto** en la base y en el spec del parser
  que el código nunca lee.

## What Changes

**El modal de `Q` y del panel lateral hereda el contexto**

- Proyecto y sección de la vista donde estás; fecha del día en Hoy y en Próximos.
- Si no hay contexto, cae en el proyecto por defecto de las preferencias, que hoy existe
  y no se lee. Recién si tampoco hay, Bandeja.

**Ese modal abre simple y se despliega**

- Al abrirse muestra el título y el destino, nada más. El resto aparece al pulsar el
  control de desplegar.
- Es lo contrario de hoy, que abre con todos los campos a la vista.

**El destino se ve en las dos variantes**

- El alta embebida pasa a mostrar a dónde va la tarea, como un control que además permite
  cambiarlo. Hoy el spec prohíbe ese selector en la variante embebida por considerarlo
  ruido; con el destino heredado de más lugares, no verlo pasa a ser peor que verlo.

**Etiquetas y recordatorios entran en el alta**

- Como controles propios, además del `@` del parser que ya funciona.
- Esto revierte un requisito que hoy los prohíbe "ni siquiera deshabilitado".

**El alta del calendario deja de ser una implementación aparte**

- Pasa a usar el mismo componente, con el horario del rango arrastrado como contexto.

Ninguno de estos cambios toca el esquema. **BREAKING** de comportamiento: el modal de `Q`
deja de mandar siempre a Bandeja.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `alta-de-tareas`: el modal completo hereda el contexto de la vista y abre plegado; el
  destino se muestra en las dos variantes; etiquetas y recordatorios pasan a ofrecerse; y
  el alta del calendario deja de tener implementación propia.

## Impact

**Código.** `components/tasks/task-quick-add-row.tsx` concentra el alta y es donde va casi
todo. `components/layout/sidebar-add-task.tsx` y
`components/shortcuts/global-quick-add-dialog.tsx` son **dos diálogos idénticos copiados a
mano** —el segundo lo admite en un comentario— y los dos tienen que pasar a heredar
contexto: conviene resolver la duplicación en vez de arreglar el mismo bug dos veces.
`components/calendar/create-task-from-range-dialog.tsx` se reemplaza por el componente
compartido.

**Contexto de la vista.** Hoy el contexto llega por props desde cada montaje. Los dos
diálogos globales no tienen de dónde tomarlo, así que hace falta que la vista actual lo
publique de alguna forma. Es la decisión de diseño más importante de esta propuesta.

**Fuera de alcance, y descartado por escrito.** **Adjuntar archivos**: vetado en tres
fuentes independientes, y una de ellas anticipa este caso —dice que *"que la referencia
visual del alta lo muestre no cambia esa decisión"*— y prohíbe hasta el control
deshabilitado. **Ubicación** en el sentido de geolocalización: no existe en el modelo;
cuidado con la trampa de vocabulario, porque el spec de Trazio llama "ubicación" al
proyecto y la sección. El **botón rojo** de la referencia: el botón de confirmar conserva
el estilo de la aplicación. La disposición de botones del alta embebida tampoco cambia.
