# Trazio — Decisiones

Registro de decisiones tomadas y por qué. Existe para que no se rediscutan cada vez
que alguien —persona o agente— las cuestiona.

Formato: una entrada por decisión, con contexto, decisión y consecuencia. Las nuevas
se agregan al final, con fecha.

---

## D1 — Sin modo offline

**Contexto.** El diseño original prometía funcionar sin conexión, pero los cambios
hechos offline solo sobrevivían mientras la pestaña siguiera abierta. Si se cerraba
antes de reconectar, se perdían silenciosamente.

**Decisión.** La app es 100% online. Sin caché de datos, sin cola de mutaciones, sin
service worker de contenido. Sin conexión, la app lo dice y bloquea la escritura.

**Por qué.** Un offline que pierde datos es peor que no tener offline. El usuario no
se entera de que perdió algo, y la confianza no se recupera. Prometer menos y
cumplirlo es preferible.

**Consecuencia.** El service worker existe únicamente para push notifications. No
volver a introducir caché de datos sin rediscutir esta decisión.

---

## D2 — El título de una tarea es texto plano

**Contexto.** La idea original permitía markdown completo en el título: negrita,
itálica, resaltado y links.

**Decisión.** El título es texto plano. La descripción y los comentarios sí son
enriquecidos.

**Por qué.** El título se renderiza en al menos cinco contextos donde el formato
estorba o directamente no se puede aplicar: chips de calendario de veinte píxeles,
notificaciones push, badges, resultados de búsqueda y el `<title>` del documento.
Un link dentro de un título es un problema de renderizado en todos ellos.

---

## D3 — Sin exportar ni importar datos

**Decisión.** No hay exportación ni importación, en ninguna versión.

**Nota.** Se recomendó lo contrario: exportar cubre el derecho de acceso del titular
que reconoce la Ley 25.326 de protección de datos personales en Argentina, e
importar es la principal barrera para que alguien migre desde otra herramienta. El
dueño del proyecto decidió dejarlo afuera. Queda registrado para poder revisarlo más
adelante con la información a la vista.

---

## D4 — Español únicamente

**Decisión.** La app es solo en español rioplatense. No hay archivos de traducción
ni infraestructura de i18n. Los textos van directo en el código.

**Por qué.** No hay intención de salir del mercado hispanohablante. Montar i18n para
un solo idioma es costo puro.

**Consecuencia.** Si algún día se agrega otro idioma, hay que extraer todos los
textos. Es un costo aceptado conscientemente.

---

## D5 — El rojo es marca y es urgencia

**Contexto.** `#EC1E2A` es color de marca (está en el ícono) y también el color de
la prioridad Urgente.

**Decisión.** Comparten el mismo rojo.

**Nota.** Se advirtió que compartir el color diluye el significado de urgencia. Se
aceptó el riesgo.

**Consecuencia práctica.** Para que el rojo conserve algo de peso semántico, **no
usarlo para errores de formulario ni para acciones destructivas genéricas**. Esos
estados necesitan otro tono.

---

## D6 — Recurrencia en RRULE

**Decisión.** Las reglas de repetición se guardan en formato RRULE (RFC 5545), con
la librería `rrule`.

**Por qué.** Es el mismo estándar que usa Google Calendar. Un formato propio sería
más rápido de escribir en la fase 2 y obligaría a una migración de datos en la fase
4, cuando haya que hablar con la API de Google.

---

## D7 — Recordatorios solo por push, una sola entrega

**Decisión.** Los recordatorios llegan exclusivamente como notificación push. La
opción de recordatorio por email se elimina de la interfaz. Cada recordatorio se
entrega como máximo una vez; si no llegó a tiempo, no se reintenta.

**Por qué.** En el diseño original la opción de email existía en la interfaz pero
nunca enviaba nada. Una opción configurable que no hace nada es un bug de confianza.

---

## D8 — Zonas horarias: lista IANA completa

**Contexto.** El diseño original ofrecía 13 zonas horarias.

**Decisión.** Lista IANA completa, obtenida del navegador con `Intl`.

**Por qué.** Trece es un número arbitrario que deja gente afuera sin ahorrar nada:
la lista completa sale gratis del runtime.

---

## D9 — `due_date` y `due_at` separados

**Decisión.** Una tarea con hora usa `due_at` (`timestamptz`); una tarea sin hora
usa `due_date` (`date`). Son excluyentes, garantizado por constraint.

**Por qué.** La alternativa —un `timestamptz` único más un booleano `has_time`— es
más compacta pero produce corrimientos de un día al convertir zonas horarias. Es la
causa más común de bugs de fecha en este tipo de app.

---

## D10 — Las rachas se calculan, no se guardan

**Decisión.** `habit_completions` guarda las marcas; la racha actual y la mejor
racha se calculan al leer.

**Por qué.** Un contador denormalizado hay que mantenerlo sincronizado en cada alta,
baja y modificación, y se desfasa apenas hay un borrado o una corrección
retroactiva. Con el índice adecuado el cálculo es barato.

---

## D11 — `user_id` redundante en todas las tablas

**Decisión.** Toda tabla lleva `user_id`, incluso cuando la propiedad podría
derivarse de una relación (una sección pertenece a un proyecto que pertenece a un
usuario).

**Por qué.** Las políticas de RLS quedan en una sola comparación, sin joins. Es más
rápido y muchísimo más difícil de escribir mal.

**Consecuencia.** Hay que mantener la consistencia al mover una tarea entre
proyectos: el `user_id` no cambia, pero conviene un trigger que valide que el
proyecto destino pertenece al mismo usuario.

---

## D12 — Sin librería de estado global

**Decisión.** Server Components, TanStack Query y `useState` local. No se instala
Redux, Zustand ni equivalente.

**Por qué.** Casi todo el estado de esta app es estado de servidor, y TanStack Query
ya lo resuelve. El estado local que queda es de interfaz y vive en el componente que
lo usa.

**Consecuencia.** Si aparece una necesidad real de estado global compartido, se
discute antes de instalar nada.

---

## D13 — React Hook Form

**Fecha.** 2026-07-25

**Contexto.** `.claude/rules/frontend.md` ya mandaba usar React Hook Form con Zod
para formularios, pero la librería no estaba en la lista cerrada de `AGENTS.md` ni
registrada acá, y `AGENTS.md` prohíbe agregar librerías fuera de esa lista sin
decisión explícita.

**Decisión.** Se adopta React Hook Form junto con Zod.

**Consecuencia.** El esquema de validación se define una sola vez en
`lib/validation/` y se importa de los dos lados, cliente y servidor; se agrega a la
lista de librerías decididas de `AGENTS.md`.

---

## D14 — Las etiquetas se adelantan a la fase 1, con alcance acotado

**Fecha.** 2026-07-25

**Contexto.** Los casos 40, 43 y 53 del contrato del parser emiten etiquetas, y que
el parser pase el contrato es criterio de aceptación de la fase 1; pero `labels` y
`task_labels` estaban planificadas para la fase 2. Sin esas tablas, el usuario
escribe `#compras` y la etiqueta desaparece sin explicación.

**Decisión.** Se crean `labels` y `task_labels` en la fase 1, con RLS. Entra: crear
una etiqueta por `#` desde el alta rápida si no existe una que coincida, asignarla,
mostrar el chip, y agregar o quitar etiquetas desde el detalle de la tarea
reemplazando el conjunto completo. No entra: la página de administración de
etiquetas, la página propia por etiqueta, las favoritas y el acceso "Etiquetas" del
panel lateral.

**Consecuencia.** La fase 1 pasa de cinco tablas a siete.

---

## D15 — "próxima semana" respeta la preferencia del usuario

**Fecha.** 2026-07-25

**Contexto.** El caso 6 del contrato fijaba "próxima semana" en el lunes siguiente,
pero `user_preferences.week_starts_on` admite domingo y sábado.

**Decisión.** Resuelve al primer día de la semana siguiente según `week_starts_on`.

**Consecuencia.** El caso 6 del contrato pasa a documentar que asume el valor por
defecto (lunes); a quien configuró que su semana empieza el domingo, el parser deja
de contestarle otra cosa.

---

## D16 — Asimetría cuando la fecha relativa cae en el día de hoy

**Fecha.** 2026-07-25

**Contexto.** Nada definía qué pasa con "lunes" escrito un lunes, ni con "este fin
de semana" escrito un sábado.

**Decisión.** El día de la semana suelto o precedido de "próximo" resuelve siempre
a la próxima ocurrencia y nunca a hoy —un lunes, "lunes" es hoy+7—; pero "este fin
de semana" escrito un sábado o un domingo resuelve a hoy.

**Consecuencia.** La asimetría es deliberada, no un descuido: quien quiere hoy
escribe "hoy", pero "este fin de semana" en pleno fin de semana significa
literalmente el que está transcurriendo.

---

## D17 — El contrato del parser pasa de 53 a 56 casos

**Fecha.** 2026-07-25

**Contexto.** Al implementar aparecieron tres agujeros de cobertura.

**Decisión.** Se agregan `Gimnasio cada lunes a las 8` (repetición con hora, el
caso mixto más común y que no estaba), entradas sin acentos o en mayúsculas, y
texto parcial.

**Consecuencia.** La regla del ancla de recurrencia se precisa —la recurrencia sola
no fija fecha, pero la recurrencia acompañada de una hora sí fija `due_at` en la
próxima ocurrencia, porque de lo contrario un token ya reconocido se descartaría en
silencio—; y el número de casos hay que mantenerlo sincronizado en
`docs/roadmap.md`, `docs/product-spec.md` §6 y el propio contrato.

---

## D18 — Versiones del stack

**Fecha.** 2026-07-25

**Contexto.** Ningún documento fijaba versión de nada.

**Decisión.** Node 24 LTS, Next.js 16 con App Router, React 19, TypeScript 5.9+
con `strict`, Tailwind v4 y pnpm 11.

**Consecuencia.** Tailwind v4 cambia la instalación de shadcn/ui, que se configura
por CSS y no por `tailwind.config.js`; se acepta porque arrancar un proyecto nuevo
en v3 es nacer con una migración pendiente.

---

## D19 — Los colores de proyectos y etiquetas salen de una paleta fija

**Fecha.** 2026-07-25

**Contexto.** `projects.color` y `labels.color` eran `text` sin restricción.

**Decisión.** Paleta cerrada de alrededor de diez colores con nombre, impuesta por
check constraint en la base y compartida por Zod desde `lib/validation/`.

**Consecuencia.** No hay color libre; un `text` sin restricción produce proyectos
con contraste ilegible y rompe el modo oscuro.

---

## D20 — El texto de términos y privacidad lo provee el dueño del proyecto

**Fecha.** 2026-07-25

**Contexto.** El pie de la landing linkea las dos páginas y no existían.

**Decisión.** La implementación maqueta las páginas con sus metadatos, pero no
redacta texto legal genérico ni deja un placeholder en producción.

**Consecuencia.** La landing no se publica sin ese texto; y queda pendiente si D3
(sin exportar datos) se refleja en la política de privacidad, dado que la Ley
25.326 argentina cubre el derecho de acceso.

---

## D21 — Las reglas de desambiguación del parser se registran acá

**Fecha.** 2026-07-25

**Contexto.** `docs/parser-test-cases.md` define R1 a R7 y manda explícitamente que
los cambios se anoten en este log, cosa que no se había hecho.

**Decisión.** Quedan registradas las siete reglas originales (R1 día primero
siempre; R2 año omitido resuelve a la próxima ocurrencia y nunca al pasado; R3 las
horas 1 a 7 son PM y las 8 a 12 AM; R4 el día de la semana suelto solo como último
recurso; R5 un solo valor por atributo, gana la primera reconocida; R6 los números
sueltos no son fechas; R7 el resaltado es reversible con doble clic), más la regla
nueva **R8** —la preposición o el artículo se consumen solo cuando son parte
léxica de la locución que desambigua, y un determinante suelto delante de una fecha
queda en el título— y las precisiones adoptadas: "primera" en R5 es primera en el
texto de izquierda a derecha; `#` está exento de R5 porque las etiquetas son
multivaluadas; un año de dos dígitos siempre es `20YY`; una hora ya pasada no se
corre al día siguiente; y un candidato descartado no se resalta.

**Consecuencia.** Sobre todas ellas manda un principio rector, **ante ambigüedad
extraer menos** — un atributo de menos lo corrige el usuario en dos segundos, uno
de más lo descubre cuando le suena una notificación que no esperaba. El contrato
sigue siendo la fuente de verdad de los casos; este log guarda el porqué.

---

## D22 — El dominio del producto es `trazio.com.ar`.

**Fecha.** 2026-07-25

**Contexto.** Hasta ahora no había dominio. El deploy vive en
`trazio-three.vercel.app`, que sirve como URL de la app pero **no** se puede usar
como dominio remitente de correo: Resend verifica un dominio pidiendo registros
DNS (SPF, DKIM, el MX del return-path y DMARC), y el DNS de `vercel.app` es de
Vercel, no nuestro. Además `vercel.app` está en la Public Suffix List. Sin dominio
propio, la confirmación de cuenta y el reset de contraseña no pueden funcionar
para nadie que no sea el dueño de la cuenta de Resend, y eso bloquea el primer
criterio de aceptación de la fase 1.

**Decisión.** Se registra `trazio.com.ar` en NIC Argentina. Se evaluaron
`trazio.com` y `trazio.io`, ambos ocupados, y `trazio.ar`, libre pero menos
instalado entre usuarios argentinos. `.com.ar` es el más reconocible en el
mercado al que el producto apunta explícitamente.

**Consecuencia.** Los correos transaccionales se envían desde un **subdominio de
envío** (`envios.trazio.com.ar`) y no desde el dominio raíz, para que un problema
de reputación quede contenido y no arrastre al dominio principal. El dominio es
además el de la landing, el de la app y el que validan los redirects de Google
OAuth.

---

## D23 — Testing Library para tests de componente

**Fecha.** 2026-07-26

**Contexto.** Las pantallas de autenticación (tarea 4.5 en adelante) exigen tests
de componente sobre los formularios: validación que falla y que pasa, estado de
carga, error mostrado. `AGENTS.md` no tenía ninguna librería para eso —
Vitest solo cubría tests de lógica pura, y `@testing-library/react` no estaba en
la lista cerrada.

**Decisión.** Se agregan `@testing-library/react`, `@testing-library/jest-dom` y
`@testing-library/user-event` como devDependencies, más `jsdom` como entorno de
DOM para Vitest. Se activan por archivo con el pragma `// @vitest-environment
jsdom`, no de forma global, para no pagar el costo de jsdom en el resto de la
suite (que sigue en `"node"`).

**Consecuencia.** `vitest.config.ts` suma `setupFiles: ["./vitest.setup.ts"]`,
que carga los matchers de `jest-dom`. Se agrega a la lista de librerías
decididas de `AGENTS.md`.

---

## D24 — Arrastrar proyectos solo reordena, no anida

**Fecha.** 2026-07-26

**Contexto.** El spec pedía anidar proyectos sosteniendo el arrastre. Es la
interacción más frágil de la interfaz: en teléfono compite con el scroll, y la
diferencia entre reordenar y anidar queda librada a cuánto tiempo sostuvo el
usuario, sin una señal clara de qué va a pasar al soltar.

**Decisión.** Arrastrar reordena entre hermanos y nada más. Anidar y cambiar de
padre se hacen por el menú contextual y el diálogo "Mover a…".

**Consecuencia.** Anidar cuesta un clic más, pero es una acción estructural y
poco frecuente —el árbol de proyectos se arma una vez y casi no se toca—,
mientras que reordenar es cotidiano. Se prioriza que la acción frecuente sea
fluida y que la rara sea difícil de equivocar. Es coherente con la regla de
`.claude/rules/frontend.md` de que ninguna acción quede disponible solo por
arrastre. **Para las tareas el criterio va a ser distinto**, porque convertir
una tarea en subtarea sí es frecuente: ahí el camino corto va a ser por
teclado.

---

## D25 — Hoy y Completado no ordenan por `position`

**Fecha.** 2026-07-26

**Contexto.** `position` solo ordena entre hermanos del mismo proyecto; en las
vistas transversales el número no es comparable y el orden resulta arbitrario.

**Decisión.** Hoy se ordena por hora y Completado por fecha de completado
descendente. Bandeja y Proyecto siguen con el orden manual.

**Consecuencia.** El orden manual queda donde el usuario puede efectivamente
arrastrar. Cuando la fase 2 traiga la barra de opciones de vista con orden
configurable, estas dos vistas ya tienen un default que se explica solo.

---

## D26 — El trigger de la Bandeja distingue borrado directo de cascada de cuenta

**Fecha.** 2026-07-27

**Contexto.** `projects_protect_inbox()` (migración
`20260726011604_projects_inbox_protection.sql`) rechaza cualquier `DELETE`
sobre la Bandeja. Pero borrar la cuenta borra la fila de `auth.users`, y el
`ON DELETE CASCADE` de `projects.user_id` intenta borrar también la Bandeja
del usuario — el mismo `DELETE` que el trigger existe para rechazar. Con eso,
la eliminación de cuenta fallaba entera para todos los usuarios.

**Decisión.** El trigger permite el `DELETE` de la Bandeja cuando ya no
existe fila en `auth.users` para ese `user_id`
(`not exists (select 1 from auth.users where id = old.user_id)`), y sigue
rechazándolo en cualquier otro caso. Se comprobó empíricamente en Postgres
—no por deducción— que durante la cascada de `auth.users` la fila padre ya
no está presente cuando el trigger de `projects` se dispara, a diferencia de
un `DELETE` directo sobre `projects`, donde la fila de `auth.users` del
usuario sigue existiendo. Migración:
`20260727001408_projects_inbox_protection_allow_account_deletion.sql`.

**Consecuencia.** Borrar, archivar o desmarcar `is_inbox` de la Bandeja por
acción directa del usuario sigue bloqueado, con test dedicado en
`supabase/tests/account-deletion.test.ts`. Cualquier cambio futuro a este
trigger tiene que preservar la distinción entre las dos rutas: si se pierde,
la eliminación de cuenta se vuelve a romper para todo el mundo.

---

## D27 — `projects.color` es nulo para la Bandeja de entrada, no el azul de marca

**Fecha.** 2026-07-27

**Contexto.** La migración `20260726013242_projects_color_allow_inbox_blue.sql`
amplió `projects_color_check` para que el trigger de aprovisionamiento pudiera
crear la Bandeja con el hex de marca `#283B56` en la misma columna que, para el
resto de los proyectos, guarda un id de la paleta fija de diez colores
(`lib/validation/colors.ts`). Eso mezcló dos vocabularios incompatibles en una
sola columna `text`, y ya provocó un incidente real: código que indexaba
`PROJECT_COLORS[project.color]` directamente obtenía `undefined` para la
Bandeja y crasheaba. Se mitigó centralizando la resolución en
`resolveProjectColorHex()`, que degradaba a gris ante cualquier valor
inesperado — pero la causa de fondo, la columna mezclada, seguía ahí.

**Decisión.** `projects.color` pasa a ser nulo para la Bandeja de entrada, y
la interfaz dibuja su azul de marca fijo en vez de leerlo de la columna.
Mismo criterio que ya se aplica a `icon` (también nulo para la Bandeja, por
ser un proyecto especial que no se renombra, no se borra, no se archiva y no
se recolorea desde la interfaz). Se descartó la alternativa de agregar un
id reservado a la paleta porque habría que esconderlo del selector de color:
más casos especiales, no menos. El constraint nuevo lo expresa a nivel de
base de datos — no solo de aplicación — con `is_inbox` como discriminante:
la Bandeja solo puede tener `color` nulo, y el resto de los proyectos solo
uno de los diez ids de la paleta (nunca nulo, nunca el hex viejo).
Migración: `20260727010000_projects_color_null_for_inbox.sql`.

**Consecuencia.** `resolveProjectColorHex()` trata `null` como "es la
Bandeja" y resuelve al azul de marca (`#283B56` en claro, `#8CA3C9` en
oscuro, la variante accesible ya usada en el resto del sistema de color) en
vez de degradar a gris — el gris neutro queda exclusivo para valores
realmente inesperados. La paleta seleccionable (`PROJECT_COLOR_IDS`) sigue
siendo exactamente los diez colores que el usuario puede elegir, sin un
valor ajeno colado en el medio.
