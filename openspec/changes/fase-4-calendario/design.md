## Context

Es la primera vez que Trazio depende de un servicio externo para mostrar datos.
Hasta acá todo salía de Postgres con RLS: si la consulta devolvía algo, era del
usuario y era verdad. Los eventos de Google no funcionan así — viven afuera, se
piden por HTTP, pueden fallar, y el permiso para pedirlos caduca.

Eso cambia tres cosas de fondo: hay un **secreto de larga vida** que guardar
(el refresh token), hay un **estado de conexión** que puede romperse sin que el
usuario haga nada, y hay una **latencia** que antes no existía.

`docs/setup-google-calendar.md` ya deja resuelto el trámite de credenciales y fija
tres cosas técnicas: pedir `access_type=offline` y `prompt=consent` o Google no
devuelve refresh token; guardar el refresh token cifrado; y marcar la conexión como
`needs_reauth` cuando el refresh falla.

`calendar_connections` es la última tabla de `docs/data-model.md` que falta crear.

Restricciones heredadas que condicionan el diseño: D1 (sin offline: sin conexión no
se escribe), D5 (el rojo de marca no se usa para destructivos genéricos), D6 (RRULE,
elegido en la fase 2 justamente para no migrar acá), D8 (zona horaria IANA por
usuario), D9 (`due_date` y `due_at` excluyentes), D12 (sin librería de estado
global), D19 y D29 (paleta fija más color personalizado), D20 (el texto legal lo
provee el dueño), D22 (el dominio valida los redirects de OAuth), D24 (ninguna
acción disponible solo por arrastre), D28 (el detalle es modal centrado), D31 (cada
dependencia nueva exige decisión propia).

## Goals / Non-Goals

**Goals:**

- Que el refresh token nunca esté en claro en la base ni llegue jamás al navegador.
- Una sola línea de tiempo con tareas, hábitos y eventos, donde cada cosa se
  distingue de un vistazo.
- Que editar un evento recurrente no destruya la serie sin preguntar.
- Que la conexión rota se note y se arregle sin adivinar.
- Que todo lo que se puede hacer arrastrando se pueda hacer también sin arrastrar.

**Non-Goals:**

- Publicar tareas o hábitos de Trazio en Google. La conexión es de un solo sentido
  para ellos, y es una promesa explícita del spec.
- Otros proveedores de calendario. `calendar_connections.provider` existe y hoy
  siempre vale `google`.
- Invitados, respuestas a invitaciones y videollamadas. Se muestran y se editan los
  campos básicos de un evento, no se gestiona su asistencia.
- Sincronización incremental con `syncToken` o webhooks. Se lee por rango con caché
  corta; si el volumen lo pide, se revisa después de medirlo.

## Decisions

### D-A. El refresh token se cifra en la aplicación con AES-256-GCM

Antes de guardarlo en `calendar_connections.refresh_token`, se cifra con
AES-256-GCM usando una clave de 32 bytes que vive en una variable de entorno de
servidor. Se guarda el ciphertext junto con su nonce y su tag de autenticación.
Descifrar ocurre solo del lado servidor, en el momento de refrescar el access
token.

GCM y no CBC porque autentica: un ciphertext manipulado falla al descifrar en vez
de devolver basura silenciosamente.

**Hoy el proyecto no tiene ninguna decisión registrada sobre cifrado.** Esta fase
la crea, y se anota en `docs/decisions.md` — es exactamente el tipo de elección que
alguien va a querer entender dentro de un año.

*Alternativa descartada:* guardarlo en el Vault de Supabase, como se hizo con los
secretos del cron en la fase 2. El Vault está pensado para secretos **del
proyecto**, pocos y estables, no para un secreto por usuario que se crea y se
revoca con cada conexión.

*Alternativa descartada:* `pgsodium` con cifrado transparente de columna. Supabase
lo está discontinuando, y ata el cifrado a una extensión de la base en vez de
dejarlo en código que se puede leer y testear.

La clave **no** se guarda en la base. Si se pierde, las conexiones existentes dejan
de servir y cada usuario tiene que reconectar — molesto, no catastrófico, y
preferible a guardarla al lado de lo que protege.

### D-B. Se habla con Google por `fetch`, sin cliente oficial

Los endpoints que hacen falta son pocos: intercambiar el código por tokens,
refrescar el access token, listar calendarios, y el CRUD de eventos y calendarios.
`googleapis` es una dependencia grande que resuelve mucho más de lo que se necesita.

`AGENTS.md` cierra la lista de librerías del proyecto y D31 fijó el precedente: cada
dependencia nueva necesita su decisión. Evitar dos dependencias es preferible a
justificarlas.

Si al implementar el flujo OAuth resulta que `fetch` no alcanza —por ejemplo para
validar algo del token de forma no trivial—, se discute antes de instalar. No se
instala primero y se avisa después.

### D-C. Los eventos no se guardan, y el caché dura 60 segundos

Se piden a Google por rango de fechas y se cachean **en memoria del servidor,
60 segundos**, por combinación de usuario, calendario y rango.

El spec dice "caché de corta duración" y nunca lo cuantifica. Sesenta segundos es
suficiente para que moverse entre semanas no dispare una llamada por cada clic, y
corto como para que un evento creado en el teléfono aparezca en la próxima mirada.

No se guardan en Postgres, como fija el data model. Guardarlos obligaría a
mantenerlos sincronizados —altas, bajas, ediciones hechas fuera de Trazio— y ese es
justamente el problema que la API ya resuelve.

Por **D1** no hay caché offline: sin conexión, el calendario avisa que no pudo
cargar en vez de mostrar datos viejos como si fueran actuales.

### D-D. Un cambio sobre una serie recurrente siempre pregunta

Editar o eliminar un evento que se repite ofrece tres caminos, los mismos que
Google: **esta ocurrencia**, **esta y las siguientes**, **todas**. Cada uno es una
llamada distinta a la API y hay que implementar los tres.

La pregunta es obligatoria: no hay opción por defecto silenciosa. Cambiar sin
querer todas las ocurrencias de una reunión semanal ajena es destructivo y no se
deshace desde Trazio.

*Alternativa descartada:* aplicar siempre a esta ocurrencia. Es la más segura, pero
para cambiar el horario de una reunión recurrente habría que ir a Google — rompe la
promesa de que los eventos se editan desde donde aparecen.

### D-E. El calendario es una forma de ver, no una pantalla

`VIEW_SHAPE_OPTIONS` pasa de `["lista", "panel"]` a incluir `"calendario"`, y
aparece en las mismas pantallas donde ya está la barra de opciones. El formato —día,
cuatro días, semana, mes— es otra opción de la barra, persistida por pantalla en
`view_preferences` como todo lo demás.

**Los cuatro formatos existen siempre y el layout se adapta por ancho**, en vez de
prohibir formatos según el dispositivo. El spec se contradice a sí mismo: en un
lugar restringe por dispositivo y en otro lista los cuatro sin condición. Adaptarse
es más simple que mantener dos listas y explicar por qué en el teléfono falta una.

Hay una prueba existente que verifica que una clave `formato_calendario` en las
preferencias guardadas **se descarta** — quedó de la fase 2, cuando esa clave no
existía. Hay que revisarla, no borrarla: ahora la clave es válida.

### D-F. Un solo modelo de bloque para tres cosas distintas

La grilla dibuja bloques de tarea, de hábito y de evento. Los tres tienen inicio,
duración y color, pero se comportan distinto: un evento se guarda en Google, una
tarea en `tasks`, un hábito en `habit_schedule_overrides`.

La grilla no sabe de eso. Recibe bloques con una forma común y devuelve "este bloque
se movió a esta hora"; cada dominio traduce eso a su propia mutación. Así el
componente de calendario no acumula tres ramas de lógica de negocio, y sumar un
cuarto tipo más adelante no lo toca.

Los tres se distinguen visualmente por forma, no solo por color: el color ya está
tomado por el proyecto, la etiqueta o el calendario de origen.

### D-G. Todo lo que se arrastra se puede hacer sin arrastrar

Por **D24** y la regla de frontend, ninguna acción queda disponible solo por
arrastre:

| Acción por arrastre | Camino alternativo |
| --- | --- |
| Mover un bloque de horario | El selector de fecha y hora que ya existe |
| Estirar para cambiar la duración | El campo de duración estimada |
| Programar un hábito sin horario | El menú de la tarjeta del hábito |
| Crear arrastrando sobre espacio vacío | El alta rápida y el botón de nuevo evento |

No es purismo: el arrastre no funciona con teclado, es difícil con motricidad
reducida, e incómodo en pantallas chicas.

### D-H. Programar un hábito exige ampliar una guarda existente

`assertAppliesOnDate`, en `lib/habits/`, hoy **solo deja pasar el día de hoy** —
correcto para la fase 3, donde reprogramar solo se ofrecía desde la tarjeta y solo
para hoy.

El calendario muestra semanas y meses, y arrastrar el chip de un hábito al martes
que viene tiene que escribir un override de **ese** día. Hay que ampliar la guarda
para que acepte cualquier día en que el hábito efectivamente toque, no solo hoy.

Es un cambio de código real, no de interfaz. Y la guarda tiene que seguir
rechazando lo que no corresponde: un día anterior a la creación del hábito, o un
día en que su frecuencia no aplica.

### D-I. El aviso de reconexión es global

Cuando el refresh falla, la conexión pasa a `needs_reauth` y aparece un **banner
global**, no un aviso escondido en Configuración.

Un calendario que dejó de actualizarse engaña en todas las pantallas donde aparece:
mirás el martes, lo ves vacío, y planificás sobre información falsa. El aviso tiene
que estar donde está el daño.

Por **D5**, el banner no usa el rojo de marca: no es un error del usuario ni una
urgencia, es un estado que se resuelve con un clic.

## Risks / Trade-offs

**El permiso `calendar` completo hace más pesada la verificación de Google** → Es
una decisión tomada a conciencia por el dueño para poder administrar calendarios, y
`docs/setup-google-calendar.md` —que hoy desaconseja ese permiso— hay que
corregirlo. La mitigación es de tiempos, no técnica: **iniciar la verificación
apenas la fase funcione en desarrollo**, no cuando se quiera lanzar. Mientras esté
en modo Prueba, los refresh tokens caducan a los siete días, así que el flujo de
reconexión se va a ejercitar solo y seguido — conviene verlo como una oportunidad de
probarlo, no como una molestia.

**Una clave de cifrado perdida invalida todas las conexiones** → Cada usuario
reconecta y listo. Es el precio de no guardar la clave junto a lo que protege.
Documentarlo para que nadie "arregle" el problema metiéndola en la base.

**Depender de un servicio externo cambia el modo de fallar** → La API de Google
puede estar lenta, caída, o devolver 429. El calendario tiene que degradar con
claridad: mostrar tareas y hábitos, y avisar que los eventos no cargaron. Nunca una
pantalla en blanco ni un spinner infinito.

**Editar una serie recurrente es destructivo y no se deshace desde Trazio** → La
pregunta de tres opciones es obligatoria, sin default silencioso, y el texto tiene
que decir con claridad a cuántas ocurrencias afecta.

**El arrastre en una grilla temporal es mucho más difícil que en una lista** →
Reusa `@dnd-kit`, que ya se usa en el modo panel, pero acá hay ejes, colisiones,
solapamientos y ajuste a 15 minutos. Es la parte más propensa a bugs de toda la
fase y la que más hay que probar a mano.

**El gate en verde no prueba nada** → En la fase 3 el bloque de Hoy ignoró la
reprogramación del día, y un bug de realtime sobrevivió dos fases porque el único
test probaba crear y no borrar. Cada tanda se verifica en el navegador, y las
pruebas de arrastre y de series recurrentes se hacen a mano sí o sí.

## Migration Plan

1. Migración de `calendar_connections` con su RLS en el mismo archivo, `user_id`
   como PK, y `refresh_token` como texto que guarda el ciphertext.
2. `pnpm db:types:local` — nunca `db:types`, que apunta al remoto.
3. Variables de entorno: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI` y la clave de cifrado, en local y en Vercel.
4. Actualizar `docs/setup-google-calendar.md` con el permiso `calendar` completo y
   el porqué del cambio.
5. La política de privacidad se actualiza **antes** de activar la conexión.
6. Push a producción con la fase verificada.

Calificar con su esquema todo objeto que no esté en `public` o `pg_catalog`: el
`search_path` del rol que corre migraciones en Supabase hosteado no incluye
`extensions`, y eso ya hizo fallar un push en la fase 2.

Rollback: la tabla se dropea sin tocar nada. Desconectar Google no borra ningún dato
de Trazio, porque los eventos nunca estuvieron acá.

## Open Questions

- El spec no dice hasta dónde en el futuro se muestran las repeticiones de una tarea
  recurrente. Se implementa acotado al rango visible del calendario, que es lo único
  que se puede dibujar.
- El spec no define en qué calendario cae un evento creado desde Trazio cuando hay
  varios habilitados. Se usa el primario de Google, y se puede cambiar en el
  formulario.
- El spec no dice si los bloques de vista previa de repeticiones futuras son
  interactivos. Se implementan como no interactivos: son proyecciones de algo que
  todavía no existe.
