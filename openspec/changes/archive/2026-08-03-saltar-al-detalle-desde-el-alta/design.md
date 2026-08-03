## Context

El alta de tareas es un componente único con dos tratamientos: el modal, que abre plegado con
título y destino, y el embebido en listas y secciones, que abre desplegado.

Ofrece confirmar y cancelar. El detalle, que es donde viven las subtareas, los comentarios y
la descripción con formato, solo se alcanza sobre una tarea que ya existe.

Hace unas horas el detalle pasó a dejar su entrada en el historial, así que volver atrás lo
cierra en vez de sacar al usuario de la aplicación.

## Goals / Non-Goals

**Goals:**

- Que darse cuenta a mitad de escribir de que la tarea necesita más no obligue a confirmar,
  buscarla y abrirla.
- Que no se pierda nada de lo cargado al saltar.

**Non-Goals:**

- Cambiar qué campos tiene el alta.
- Un editor intermedio entre el alta y el detalle.

## Decisions

### D-A. Crea y abre; no hay otra opción posible

La acción **crea la tarea** con lo que haya y **abre su detalle**.

No es una elección entre dos diseños: **el detalle muestra comentarios y subtareas, y las dos
cuelgan de una tarea que existe**. Un "editor grande previo a crear" no podría mostrarlas, así
que no sería el detalle: sería una tercera pantalla con el mismo aspecto y menos capacidades,
y habría que mantenerla.

Consecuencia que conviene tener a la vista: **la tarea queda creada aunque después el usuario
cierre el detalle sin tocar nada**. Es lo correcto —confirmó al pulsar la acción— pero es
distinto de cancelar el alta, y la etiqueta del control tiene que dejarlo claro.

### D-B. Es la acción secundaria, no la principal

La acción principal del alta sigue siendo **agregar la tarea**. La nueva es una salida para el
caso menos frecuente.

En la variante embebida el espacio es escaso y ya hay dos botones. Que la tercera no compita:
si al mirarla las tres pesan igual, está mal resuelta.

### D-C. Visible sin desplegar

El modal global abre plegado. La acción nueva **tiene que verse ahí**, sin desplegar.

El motivo es el caso de uso: uno se da cuenta de que la tarea necesita más **justo cuando el
alta le queda corta**, que es antes de desplegar nada. Esconderla detrás del desplegado la
haría inútil para el momento en que hace falta.

### D-D. No se pierde nada

Todo lo cargado viaja: el título con lo que el lenguaje natural interpretó, la descripción,
la fecha, la prioridad, las etiquetas, los recordatorios y el destino.

Es lo que hace que la acción tenga sentido; si hubiera que recargar algo, sería más rápido
confirmar y abrir a mano.

## Risks / Trade-offs

**Tres acciones en un formulario de dos** → D-B. El riesgo es que confirmar deje de ser
obvio, y eso se ve mirando, no razonando.

**Una tarea creada sin querer** → Alguien puede pulsar la acción esperando "ver más campos" y
encontrarse con la tarea ya creada. Se mitiga con la etiqueta, que tiene que decir que crea.

**El espacio en la variante embebida** → Es la más apretada y la que se dibuja dentro de cada
lista y sección. Si las tres acciones no entran cómodas ahí, hay que resolverlo, no encogerlas
hasta que quepan.

**El parser podría interpretar de más al confirmar** → Al crear se aplica lo que el lenguaje
natural detectó en el título. Es el mismo comportamiento que confirmar normalmente, pero
alguien que salta al detalle esperando "seguir editando el texto tal cual" puede sorprenderse
de que el título haya perdido los tokens reconocidos.
