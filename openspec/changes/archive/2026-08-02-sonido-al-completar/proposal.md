## Why

Completar algo en Trazio es silencioso. El dueño lo pidió así: *"hay que meterle un
sonido satisfactorio al completar las tareas o hábitos, para que dé feedback y genere ese
efecto mejorado de tachar algo"*.

Hay que decir de frente que esto roza dos líneas escritas del proyecto:

> `AGENTS.md`: *"Un gestor de tareas personal… **sin gamificación**."*
> `.claude/rules/copy.md`: *"La app organiza, no arenga… **nada de motivación forzada**."*

No está prohibido —ninguna decisión lo descarta— pero un sonido de recompensa es
exactamente lo que esas dos rechazan. **La tensión se resuelve por qué tipo de sonido
es**, no por si va o no: un clic seco que confirma que la acción ocurrió pertenece a la
misma familia que el tachado del título o la tostada de deshacer. Es retroalimentación.
Un acorde ascendente, o cualquier cosa que suene a felicitación, sí sería gamificación y
queda descartado.

Hay además un caso donde el sonido no es adorno: **marcar un hábito no tiene deshacer** —
está escrito que `Ctrl/Cmd+Z` no cubre hábitos— así que hoy la única señal de que el clic
funcionó es que el dibujo cambie. Una confirmación audible ahí agrega información real.

## What Changes

**Suena una confirmación al completar una tarea o marcar un hábito**

- Un sonido corto y seco. Confirmación, no celebración.
- **Se genera con la API de audio del navegador, sin archivo y sin librería.** No se
  agrega ninguna dependencia, y el proyecto no tiene hoy ni un solo archivo de audio.

**Un interruptor en Configuración para apagarlo**

- Columna nueva en las preferencias del usuario. Sería el **primer booleano** de esa
  tabla: hoy son todos enumerados o numéricos.
- **Viene encendido.** Es decisión del dueño, tomada sabiendo que para un producto con
  más usuarios lo correcto sería lo contrario.

**Lo que no suena**

- Desmarcar algo ya completado, o desmarcar un hábito.
- Deshacer.
- Lo que se completó en **otro dispositivo** y llega por tiempo real.
- El autoguardado de la descripción, que pasa por la misma mutación que completar.

Sin cambios de comportamiento fuera de eso.

## Capabilities

### New Capabilities

- `sonido-al-completar`: cuándo suena la confirmación, cuándo no, y la regla de que es
  confirmación y no premio.

### Modified Capabilities

- `configuracion`: se suma el ajuste para apagar el sonido.

## Impact

**Datos.** Columna nueva en `user_preferences`, booleana, con default en verdadero. Las
políticas de RLS **no se tocan**: son por fila y ya cubren cualquier columna.

**Código.** Un módulo nuevo que produce el sonido. Tres puntos de instrumentación cubren
el 100% de los caminos, porque el completar de tareas pasa por **una sola mutación** que
alimenta las nueve superficies donde se dibuja una fila, y los hábitos tienen la suya.
Uno de esos tres es preventivo: el completar en lote no existe hoy, pero si algún día se
agrega, ya está resuelto que suene una vez por lote y no una por tarea.

**Configuración.** El interruptor va en la sección General. El spec exige que **ninguna
sección se muestre inerte**, así que el ajuste no puede agregarse antes de que el sonido
funcione.

**Componentes.** No hay un interruptor reutilizable en el proyecto: los que existen están
pintados a mano en dos lugares distintos. Hay que decidir si se extrae uno o se copia el
patrón.

**Dependencias.** Ninguna. `AGENTS.md` prohíbe agregar librerías sin decisión explícita, y
para esto no hace falta.

**Fuera de alcance.** Sonido en cualquier otro evento —crear, borrar, recordatorios—.
Vibración. Volumen configurable. El sonido de las notificaciones push, que lo pone el
sistema operativo y ninguna línea de Trazio produce.
