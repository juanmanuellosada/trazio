## Context

Todo el alta vive en `components/tasks/task-quick-add-row.tsx`, con una prop que elige
entre dos tratamientos: el completo, con etiquetas de texto sobre cada selector, y el
embebido, con los mismos controles como chips y sin selector de proyecto.

El contexto llega **por props desde cada montaje**: la lista pasa su proyecto y su
sección, Hoy pasa la fecha de hoy, Próximos pasa el día de cada grupo, una fila pasa su
tarea como padre. La resolución tiene una prioridad escrita: lo que el usuario elige
explícitamente gana sobre lo que detectó el parser, y eso gana sobre el contexto.

Los dos diálogos globales —el del botón del panel lateral y el del atajo— son **el mismo
código copiado dos veces** y los dos pasan el inbox a mano.

Restricciones que condicionan: **D12** (sin estado global), **D24** (ninguna acción
disponible solo por un gesto), **D32** (`#` es proyecto y sección, `@` es etiqueta), y el
veto permanente a adjuntos.

## Goals / Non-Goals

**Goals:**

- Que apretar `Q` parado en un proyecto cree la tarea en ese proyecto.
- Que el alta abra por lo mínimo y crezca si hace falta.
- Que nunca se cree una tarea sin saber a dónde fue.
- Una sola implementación de alta, incluida la del calendario.

**Non-Goals:**

- Adjuntos y geolocalización.
- Cambiar el parser, sus símbolos o su precedencia.
- Rediseñar los selectores, que son compartidos con el detalle por contrato.
- Cambiar la disposición de botones del alta embebida.

## Decisions

### D-A. El contexto de la vista se publica, y se consume por props como hasta ahora

Los montajes que ya reciben contexto por props **no cambian**: funcionan y la prioridad
está resuelta.

Lo que falta es que los **dos diálogos globales** puedan saber dónde está el usuario. Hoy
no tienen forma: se abren desde el panel lateral y desde un atajo global, lejos de la
vista.

Hace falta que la vista actual publique su contexto de alta —proyecto, sección, fecha por
defecto— y que los diálogos lo lean. **Por D12 esto no va a un estado global**: va por
contexto de React, como ya se resuelve el detalle de tarea abierto.

*Alternativa descartada:* derivar el contexto de la ruta. Funciona para Bandeja, Hoy y
Próximos, pero no para la sección dentro de un proyecto, que no está en la URL. Y
duplicaría en un lugar la lógica que las vistas ya tienen.

### D-B. La cadena de destino, y el eslabón que falta

Orden de prioridad para el proyecto, del más fuerte al más débil:

1. Lo que el usuario elige en el selector.
2. Lo que el parser detectó con `#`.
3. El contexto de la vista.
4. **El proyecto por defecto de las preferencias.**
5. Bandeja.

El cuarto eslabón **existe en la base y lo exige el spec del parser, y el código nunca lo
lee**. Está reconocido como deuda desde la fase 1, donde se anotó que se usaba el proyecto
del contexto "porque hoy son equivalentes". Con el contexto llegando a más superficies
dejan de ser equivalentes, así que se implementa acá.

Los tres primeros eslabones ya funcionan y no se tocan.

### D-C. El modal completo abre plegado

Hoy los dos diálogos globales abren con todos los campos desplegados. Pasan a abrir con
el título y el destino, y el resto detrás del control de desplegar.

El mecanismo **ya existe**: el componente tiene un estado plegado y una prop que lo fuerza
abierto, que es justamente lo que usan hoy los diálogos. Es dejar de forzarlo.

**El alta embebida abre desplegada**, que es lo contrario y es correcto: llegaste ahí
haciendo clic en "Agregar tarea" dentro de una lista, ya declaraste la intención. El
modal global se abre desde cualquier lado y muchas veces solo para anotar un título.

### D-D. El destino se muestra siempre, y eso revierte un requisito

El spec dice hoy que la variante embebida **nunca** muestra selector de proyecto ni de
sección, porque el destino ya está determinado por el contexto y mostrarlo es ruido. Y en
otro requisito exige que el destino se vea antes de confirmar. Con la variante embebida
las dos cosas no se sostienen juntas: hoy no se muestra nada.

Se resuelve a favor de mostrarlo: **un control que dice a dónde va y permite cambiarlo**.
El argumento del ruido valía cuando el contexto era obvio porque acababas de hacer clic
dentro de esa sección; con el destino viniendo también de preferencias y de la cadena de
D-B, no verlo es peor.

### D-E. Etiquetas y recordatorios entran, y el `@` sigue

El spec los prohíbe hoy en el alta, "ni siquiera deshabilitado". Se revierte: los dos
selectores existen, se usan en el detalle, y la referencia del dueño los muestra.

**El `@` del parser sigue funcionando** y sigue creando etiquetas que no existen. Las dos
vías conviven bajo la misma regla de precedencia que ya rige para el resto: lo elegido en
el selector gana sobre lo detectado por el parser.

### D-F. El alta del calendario usa el componente compartido

El diálogo de crear tarea arrastrando en el calendario es una implementación paralela: su
propio campo de título, un selector nativo de proyecto, sin parser, y dos mutaciones
encadenadas para poner el horario. Viola el requisito de que ninguna superficie tenga
implementación propia, y también el que prohíbe selectores nativos.

Pasa a usar el componente compartido, con el rango arrastrado como contexto de fecha y
hora. **Si al hacerlo aparece que el componente compartido no sabe expresar "esta hora y
esta duración", eso es lo que hay que resolver** — no volver a la implementación aparte.

### D-G. Lo que la referencia muestra y no se copia

- **Adjunto**: vetado en tres fuentes, una de las cuales anticipa este caso por escrito y
  prohíbe hasta el control deshabilitado.
- **Ubicación**: geolocalización, no existe en el modelo. El spec de Trazio usa esa
  palabra para el proyecto y la sección, que sí están y ya se muestran.
- **El botón rojo**: el confirmar conserva el estilo de la aplicación.

## Risks / Trade-offs

**Publicar el contexto de la vista es lo más invasivo** → Toca la relación entre las
vistas y los diálogos globales, que hoy no se conocen. Si se hace mal, el síntoma es una
tarea creada en el lugar equivocado, que es peor que no heredar nada. Hay que probar cada
vista: Bandeja, Hoy, Próximos, un proyecto, una sección dentro de un proyecto, una
etiqueta, un filtro.

**Dos diálogos idénticos copiados** → Arreglar el bug en uno solo deja el otro roto, y
como uno se abre con el botón y el otro con el atajo, es fácil probar uno y dar por bueno
el otro. **Verificar por las dos vías.**

**El modal abre plegado y alguien va a extrañar los campos** → Es el pedido explícito del
dueño. El desplegar tiene que ser obvio.

**Revertir dos requisitos del mismo spec** → D-D y D-E van contra decisiones tomadas con
argumento. Los argumentos originales quedan citados en cada decisión para que se vea qué
cambió y por qué, en vez de parecer que se olvidaron.

**El gate en verde no prueba nada acá** → Todo lo que falla en esta tanda falla en
silencio: una tarea que cae en el proyecto equivocado no rompe ningún test.
