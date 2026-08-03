## Why

El dueño lo pidió así: *"Pongamos un sonido al descompletar la tarea. Tiene que ser igual de
duración y estilo que el de completar pero contrario en notas, así contrasta."*

Hoy descompletar es silencioso, y **está escrito que tiene que serlo**: el spec dice que
desmarcar NUNCA suena. Eso se decidió hace unas horas, cuando el sonido se agregó, y el
motivo era razonable: no llenar la aplicación de sonidos.

Al usarlo, el dueño encontró la asimetría molesta. Completar confirma y descompletar no, así
que la acción inversa se siente muda — y descompletar es justamente el momento en el que uno
duda de si el clic llegó.

## What Changes

**Descompletar una tarea suena**

- **Misma duración y misma envolvente** que completar. Es el mismo tipo de confirmación.
- **Nota más grave.** Es lo que hace que se distingan sin escuchar dos veces.
- Se apaga con el mismo interruptor que el de completar. No se agrega un segundo ajuste
  para algo que es la otra cara de lo mismo.

**Lo que sigue sin sonar**

- Deshacer.
- Lo que cambia en otro dispositivo y llega por sincronización.
- Desmarcar un hábito. Marcar un hábito suena porque no tiene deshacer y el sonido es la
  única confirmación; desmarcarlo es la corrección de un error y no necesita celebrarse ni
  confirmarse dos veces.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `sonido-al-completar`: descompletar una tarea pasa a sonar, con la misma forma que
  completar y una nota más grave.

## Impact

**Código.** El módulo del sonido suma una variante grave; hoy tiene tres constantes con
nombre y la frecuencia es una de ellas. El punto donde se dispara ya distingue completar de
descompletar —esa condición existe y se usa para el texto de deshacer—, así que es la misma
guarda leída al revés.

**Ajuste.** Ninguno nuevo: el interruptor existente cubre los dos.

**Fuera de alcance.** Sonido al desmarcar un hábito. Un segundo ajuste. Y cualquier cosa que
se parezca a una melodía: la decisión escrita exige **un solo evento sonoro** y prohíbe
secuencias y acordes, así que "contrario en notas" se resuelve con una nota más grave, no con
un movimiento descendente de dos.
