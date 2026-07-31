## Why

Trazio sabe qué tenés que hacer y qué querés sostener, pero no sabe **cuándo
entra**. Una lista de doce tareas para hoy no dice si el día alcanza. Los
compromisos con horario —las reuniones, los turnos, lo que ya está agendado— viven
en otra aplicación, así que planificar sigue siendo mirar dos pantallas y hacer la
cuenta a ojo.

Esta fase pone tareas, hábitos y eventos en una sola línea de tiempo. Es la última
del roadmap y la que cierra la promesa del producto.

## What Changes

**Conexión con Google**

- OAuth con Google, con el **refresh token cifrado del lado servidor** y guardado
  en `calendar_connections`. Nunca llega al navegador.
- Elegir qué calendarios se muestran, de los que ya tenés en Google.
- Aviso de reconexión cuando el token deja de servir.

**Eventos**

- Leer los eventos de los calendarios elegidos, con caché corta. **No se guardan
  en la base**: se piden a Google en cada consulta.
- Crear, editar, mover y eliminar eventos desde Trazio.
- Sobre un evento que se repite, la edición y el borrado **preguntan si aplica a
  esta ocurrencia, a esta y las siguientes, o a todas**, como hace Google.
- Crear, renombrar, recolorear y eliminar calendarios.

**La vista de calendario**

- Cuatro formatos: día, cuatro días, semana y mes. Las 24 horas del día, con una
  fila aparte arriba para los eventos de todo el día y una línea marcando la hora
  actual.
- Se suma como tercera forma de ver en la barra de opciones, junto a lista y panel.
- Tareas, hábitos y eventos dibujados juntos, cada uno reconocible.

**Manipular el tiempo directamente**

- Arrastrar una tarea, un hábito o un evento lo mueve de horario. Estirar el borde
  cambia la duración. Todo se ajusta a **intervalos de 15 minutos**.
- Arrastrar sobre espacio vacío pregunta si querés crear un evento o una tarea.
- Los hábitos sin horario aparecen como chips sueltos que se programan
  arrastrándolos a una hora.
- Opción para ver las repeticiones futuras de una tarea recurrente como bloques de
  vista previa.
- **Ninguna de estas acciones queda disponible solo por arrastre**: todas tienen su
  camino por menú o formulario, como fija D24.

**Lo que no cambia de sentido**

- **Las tareas y los hábitos de Trazio no se publican en Google.** La conexión es
  de un solo sentido para ellos: Trazio lee y edita eventos que ya existen allá.

Nada de esto es **BREAKING**. El único cambio observable sobre algo ya entregado es
que la barra de opciones gana un tercer valor y Configuración una sexta sección.

## Capabilities

### New Capabilities

- `conexion-google-calendar`: OAuth, cifrado y guardado del refresh token,
  selección de calendarios, estado de la conexión y aviso de reconexión.
- `eventos-de-calendario`: leer, crear, editar, mover y eliminar eventos, con las
  tres formas de aplicar un cambio sobre una serie recurrente.
- `administracion-de-calendarios`: crear, renombrar, recolorear y eliminar
  calendarios de Google desde Trazio.
- `vista-calendario`: los cuatro formatos, la grilla de 24 horas, la fila de todo
  el día, la línea de la hora actual y cómo se dibujan juntos tareas, hábitos y
  eventos.
- `manipulacion-temporal`: arrastrar y redimensionar con ajuste a 15 minutos,
  crear arrastrando sobre espacio vacío, los chips de hábitos sin horario, y el
  camino alternativo obligatorio de cada una.

### Modified Capabilities

- `esquema-datos`: cae el requisito que prohíbe crear `calendar_connections`; se
  crea con su RLS y el refresh token cifrado.
- `configuracion`: aparece la sección Calendarios, hoy deliberadamente ausente.
- `opciones-de-vista`: `calendario` se suma al selector de forma de ver, aparece el
  formato de calendario, y se expone el control de repeticiones futuras que estaba
  reservado.
- `atajos-de-teclado`: `E` deja de ser un atajo sin destino y abre el alta de un
  evento.
- `vistas-lista`: los eventos del día aparecen en Hoy, en el orden que fija el
  spec.
- `modo-panel`: cae la exclusión explícita del modo calendario.
- `infraestructura-base`: las variables de Google OAuth y la clave de cifrado pasan
  a formar parte del entorno.
- `sincronizacion-tiempo-real`: se define qué pasa con `calendar_connections` — no
  se replica, porque los eventos no viven en la base.

## Impact

**Esquema.** Una tabla nueva, `calendar_connections`, la última que faltaba de
`docs/data-model.md`. Con `user_id` como PK, su RLS, y `refresh_token` guardado
cifrado.

**Servidor.** Rutas nuevas bajo `app/api/auth/google/` para el flujo OAuth y el
callback. Módulo `lib/calendar/` con el cliente de Google, el cifrado, el caché de
eventos y el refresco del access token. Todo lo que toque el secreto de cliente o
el refresh token vive del lado servidor y nunca cruza al navegador.

**Código.** Ruta o modo de vista para el calendario, componentes de grilla y
bloques, y arrastre reusando `@dnd-kit`, que ya está instalado. Se tocan
`lib/view-options/schema.ts` (el tercer valor y el formato),
`components/shortcuts/shortcut-provider.tsx` (destino de `E`),
`components/settings/settings-modal.tsx` (la sexta sección),
`components/layout/sidebar-content.tsx` (el acceso "agregar evento" que el spec
pide desde la fase 1 y nunca se implementó), y `lib/habits/` para permitir
programar un hábito en un día que no sea hoy.

**Dependencias.** Ninguna nueva: se habla con Google por `fetch` y el arrastre usa
`@dnd-kit`, ya presente.

**Trámites y contenido que dependen del dueño.** Las credenciales de Google Cloud,
las tres variables de entorno más la clave de cifrado, la actualización de la
política de privacidad **antes** de activar la conexión, y el inicio de la
verificación de Google apenas la fase funcione en desarrollo.

**Fuera de alcance.** Publicar tareas o hábitos de Trazio en Google. Otros
proveedores de calendario. Videollamadas, invitados y respuestas a invitaciones:
los eventos se muestran y se editan en sus campos básicos, no se gestiona su
asistencia.
