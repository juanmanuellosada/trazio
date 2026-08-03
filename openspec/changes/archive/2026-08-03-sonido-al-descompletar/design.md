## Context

El sonido al completar se agregó hace unas horas, con una restricción de fondo escrita en dos
lugares del proyecto: es *"sin gamificación"* y *"la app organiza, no arenga"*. La tensión se
resolvió por el tipo de sonido: un clic seco de confirmación, un solo evento, sin cola, que no
varía con la racha ni con la cantidad.

Y se decidió que desmarcar no suena. Esta propuesta revierte esa parte.

El módulo tiene tres constantes con nombre —frecuencia, duración y pico— pensadas para
afinarlo sin buscar. El disparo se cuelga del callback de éxito de la mutación, y hay una
condición que ya distingue completar de descompletar, usada para el texto de la tostada de
deshacer.

## Goals / Non-Goals

**Goals:**

- Que descompletar confirme, igual que completar.
- Que los dos se distingan sin tener que escucharlos uno tras otro.

**Non-Goals:**

- Sonido al desmarcar un hábito.
- Un segundo ajuste.
- Sonido en cualquier otro evento.

## Decisions

### D-A. Misma forma, nota más grave

Duración, envolvente y volumen iguales. Cambia la frecuencia, hacia abajo.

**"Contrario en notas" tiene un límite que conviene tener escrito**: la decisión del sonido
exige un solo evento y prohíbe secuencias y acordes. Un movimiento descendente de dos notas
sería una secuencia, y ahí empieza a sonar a melodía — que es la frontera con la
gamificación que ese diseño trazó.

Una nota más grave contrasta lo suficiente y no cruza esa línea. Grave se asocia sin esfuerzo
con deshacer, quitar o volver atrás; agudo, con confirmar. El contraste es de dirección, no
de forma.

### D-B. Un solo interruptor para los dos

El ajuste que existe apaga el sonido al completar. Pasa a apagar los dos.

Dos interruptores para las dos caras de la misma acción sería configuración por configurar:
nadie quiere el sonido al completar y no al descompletar.

### D-C. Desmarcar un hábito sigue sin sonar, y no es una inconsistencia

Marcar un hábito suena. Desmarcarlo, no.

El motivo está en el diseño original: marcar un hábito **no tiene deshacer** —está escrito
que `Ctrl+Z` no cubre hábitos— así que el sonido es la única confirmación de que el clic
llegó. Desmarcar es la corrección de un error, y no necesita confirmarse con el mismo peso.

En tareas la simetría tiene sentido porque las dos direcciones son acciones normales; en
hábitos una es la acción y la otra es el arrepentimiento.

## Risks / Trade-offs

**Dos sonidos parecidos pueden no distinguirse** → Es el riesgo real y solo se resuelve
escuchándolos. Si con la nota elegida suenan iguales, hay que separarlos más — sin cambiar la
forma.

**Más sonido es más chance de que canse** → Descompletar es mucho menos frecuente que
completar, así que el volumen total de sonido casi no sube. Pero si al usarlo molesta, el
interruptor apaga los dos.

**Se revierte una decisión de hace horas** → Es la segunda vez en el día que se toca el
sonido. La primera fue alargarlo. No es indecisión: es que un sonido se ajusta usándolo, y no
hay forma de decidirlo por escrito.
