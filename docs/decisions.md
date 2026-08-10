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

**Nota (2026-08-02).** D40 supera la parte de esta decisión sobre comentarios:
un comentario pasa a ser texto plano. Lo que esta decisión fija sobre el
título y sobre la descripción sigue vigente sin cambios.

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
multivaluadas (nota: D32 invierte los símbolos del parser — esa exención hoy
corresponde a `@`, no a `#`; esta entrada queda como registro histórico de la
decisión original y no se reescribe); un año de dos dígitos siempre es `20YY`;
una hora ya pasada no se corre al día siguiente; y un candidato descartado no
se resalta.

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

---

## D28 — El detalle de tarea es modal centrado, no panel lateral

**Fecha.** 2026-07-27

**Contexto.** `docs/product-spec.md` §3 especificaba panel lateral
redimensionable que recuerda el ancho elegido, o pantalla completa en
teléfono. El dueño, al usar la app por primera vez, pidió que el detalle
abra por encima de la pantalla en vez de a un costado.

**Decisión.** El detalle de tarea pasa a modal centrado, sin ningún control
para redimensionarlo. En teléfono sigue siendo pantalla completa, que ya
estaba bien.

**Consecuencia.** El ancho del panel, que se guardaba en `localStorage`,
deja de tener sentido: un modal centrado no se redimensiona, así que esa
persistencia se elimina en vez de migrarse. `docs/product-spec.md` §3 se
actualiza en la misma tanda que esta decisión.

---

## D29 — El color personalizado de un proyecto convive con la paleta fija de D19

**Fecha.** 2026-07-27

**Contexto.** D19 cerró la paleta de proyectos y etiquetas a diez colores
fijos porque un color libre produce proyectos con contraste ilegible y
rompe el modo oscuro. El dueño pidió, además de la paleta, una opción de
color personalizado en el modal de proyecto.

**Decisión.** La paleta con nombre sigue siendo el camino principal y la
primera opción del selector. El color personalizado se ofrece como salida
al final de la lista, y **antes de guardarse valida contraste AA contra el
fondo de superficie de los dos temas (claro y oscuro), rechazando cualquier
color que no alcance el mínimo en cualquiera de los dos**. `projects.color`
amplía su check constraint para admitir un color personalizado con formato
válido, además de los diez identificadores de la paleta.

**Consecuencia.** Esta validación es lo único que separa esta decisión de
un retroceso sobre D19. Si en algún momento se afloja o se quita, vuelve
exactamente el problema que D19 cerró: proyectos con contraste ilegible y
modo oscuro roto. Cualquier cambio futuro al selector de color tiene que
preservar la validación, tanto en el cliente (Zod) como en la base (check
constraint).

---

## D30 — La fórmula matemática queda fuera del editor de descripción

**Fecha.** 2026-07-27

**Contexto.** La referencia visual del editor de descripción incluía una
opción de fórmula matemática en la barra de herramientas y en el menú de
insertar.

**Decisión.** No se implementa. Requiere un motor de renderizado matemático
completo, una dependencia grande para una función de uso marginal en un
gestor de tareas personal.

**Consecuencia.** El resto del editor —títulos, negrita, cursiva, tachado,
resaltado, código, listas, citas, tablas y notas al pie— no depende de la
fórmula matemática, así que se puede sumar más adelante, si aparece una
necesidad real, sin rehacer nada de lo ya construido.

---

## D31 — Dependencias nuevas para el editor de descripción y el selector de emojis

**Fecha.** 2026-07-27

**Contexto.** `AGENTS.md` exige decisión explícita para agregar librerías
fuera de la lista cerrada. El editor de descripción necesita ampliar su
barra de herramientas y su menú de insertar, y el modal de proyecto
necesita un selector de emojis categorizado y buscable.

**Decisión — editor de descripción.** Se investigó qué trae hoy
`@tiptap/starter-kit` (3.29.0) antes de fijar la lista, en vez de asumirlo:
además de los títulos, ya incluye negrita, cursiva, **tachado**
(`extension-strike`), **código en línea** (`extension-code`), **bloque de
código** (`extension-code-block`), **regla horizontal**
(`extension-horizontal-rule`) y **cita** (`extension-blockquote`); ninguna
de esas seis hace falta instalarla de nuevo. Lo que falta y se agrega:

- `@tiptap/extension-highlight` — resaltado, no viene en el starter kit.
- `@tiptap/extension-task-list` y `@tiptap/extension-task-item` — listas de
  tareas, tampoco vienen.
- `@tiptap/extension-table`, `@tiptap/extension-table-row`,
  `@tiptap/extension-table-cell` y `@tiptap/extension-table-header` —
  tabla; en Tiptap v3 son cuatro extensiones separadas, no una sola.

**Notas al pie y "destacado" no suman dependencia nueva.** Se buscó la
extensión oficial de notas al pie y no existe como paquete libre: el
soporte de Tiptap para notas al pie es parte de Tiptap Pages, un producto
pago (`@tiptap-pro/...`), fuera de lo que este proyecto usa. Notas al pie y
el bloque "destacado" del menú de insertar —que tampoco existe como
extensión oficial— se construyen como nodos propios de Tiptap sobre
`@tiptap/core`, que ya es una dependencia transitiva del starter kit, sin
agregar ningún paquete nuevo.

**Decisión — selector de emojis.** Se comparó `emojibase-data` contra
`@emoji-mart/data` y `unicode-emoji-json`. Las tres traen datos
categorizados, pero D4 fija que la app es español únicamente, y solo
`emojibase-data` trae nombre y palabras de búsqueda (`tags`) traducidos al
español por cada emoji (`es/compact.json`, ~556 KB) además de los nombres
de categoría (`es/messages.json`); las otras dos solo traducen textos de
interfaz genéricos —o nada— y dejan el nombre y las palabras clave de cada
emoji en inglés. Se agrega **`emojibase-data`**, importando únicamente los
archivos del locale español y no el paquete completo, que incluye decenas
de locales.

**Consecuencia.** Se agregan siete paquetes de Tiptap y `emojibase-data` a
la lista de librerías decididas de `AGENTS.md`. El selector de emojis
importa `emojibase-data/es/compact.json` y `emojibase-data/es/messages.json`
con `import()` dinámico recién al abrirse el selector, nunca en el arranque
de la aplicación: son miles de entradas y cargarlas con la app empeoraría
el arranque.

---

## D32 — Los símbolos del parser se invierten: `#` proyecto y sección, `@` etiqueta

**Fecha.** 2026-07-28

**Contexto.** El contrato fijaba lo contrario —`#` etiqueta, `@`
proyecto— en los casos 40 a 43 y 53 de `docs/parser-test-cases.md`.

**Decisión.** Se invierte: `#` elige proyecto y sección (coincidencia más
larga, hasta 3 niveles), `@` elige o crea una etiqueta.

**Por qué.** El público del producto viene de Todoist, que usa esa
convención — `docs/landing.md` lo describe explícitamente. Que el símbolo
haga lo que la persona espera vale más que la coherencia con el hashtag de
internet, sobre todo porque el error se descubre recién después de haber
creado la tarea mal.

**Consecuencia.** Es un cambio de contrato, no de interfaz, así que viaja
en cinco partes: el contrato (`docs/parser-test-cases.md`), el reconocedor
del parser, `docs/product-spec.md` §6, el contrato ejecutable
(`lib/parser/casos.ts`) y la demo de la landing. La multiplicidad se
invierte junto con los símbolos: las etiquetas son varias por tarea, el
proyecto es uno solo.

---

## D33 — Los nombres de prioridad pasan a `P<n> · Nombre`, y la prioridad 3 cambia de azul

**Fecha.** 2026-07-28

**Decisión.** Las prioridades se muestran como `P1 · Urgente`,
`P2 · Alta`, `P3 · Media`, `P4 · Baja`. La prioridad 3 (Media) deja el azul
de marca y pasa a un azul más visible.

**Por qué.** El código corto es el que se tipea y el que la persona busca;
el nombre es lo que hace entender qué significa sin deducirlo del orden.
Solo el código obliga a saber de antemano si uno es lo más o lo menos
urgente; solo el nombre pierde la conexión con lo que se escribe.

**Consecuencia.** Hay que actualizar `docs/design-system.md` §3 y los
specs archivados que fijan los nombres viejos. El hex concreto del nuevo
azul de prioridad 3 se elige más adelante, con la validación de contraste
de `lib/validation/colors.ts` ya existente, verificado en los dos temas
(tarea 5.6 de `interfaz-refinada`).

---

## D34 — Se adelanta la administración de etiquetas; la página propia y las favoritas siguen en fase 2

**Fecha.** 2026-07-28

**Contexto.** D14 adelantó `labels` y `task_labels` a la fase 1 con
alcance mínimo: crear una etiqueta por símbolo si no existe, asignarla,
mostrar el chip. La administración completa —crear, renombrar, recolorear,
eliminar— y el selector con búsqueda quedaban para la fase 2.

**Decisión.** Se adelanta también la administración de etiquetas y el
selector con búsqueda y selección múltiple en cada tarea.

**Por qué.** La mitad ya estaba adelantada por D14, y terminar ahora
cuesta menos que volver más adelante.

**Consecuencia.** **La página propia por etiqueta y las etiquetas
favoritas siguen en fase 2** — son navegación, no gestión, y no bloquean
nada de lo que se adelanta acá.

---

## D35 — El centrado de la columna de contenido vuelve, con un piso de ancho

**Fecha.** 2026-07-28

**Contexto.** El contenido se centraba originalmente; se pasó a alineado
a la izquierda (`docs/design-system.md` §5.1) porque centrado dejaba un
hueco muerto entre el panel lateral y el contenido, cuando la columna
medía 768px. Ahora la columna mide 1152px.

**Decisión.** Centrado por encima de un umbral de ancho, alineado a la
izquierda por debajo.

**Por qué.** Las dos observaciones eran ciertas en su momento: centrado
dejaba hueco cuando la columna medía 768px; con la columna en 1152px ese
hueco casi no existe en pantallas grandes, pero sí en las medianas.

**Consecuencia.** El umbral concreto lo define la skill `ui-ux-pro-max`
(tarea 9.2 de `interfaz-refinada`) — lo que esta decisión fija es que no
vuelva a resolverse con un número de columna fijo y chico. (Nota: D39
elimina el umbral que esta decisión introdujo — el centrado pasa a
aplicarse siempre que sobra espacio, sin container query. Esta entrada
queda como registro histórico de por qué existió la condición.)

---

## D36 — El índice GIN de `search_vector` no lo usa el planner bajo RLS; se acepta

**Fecha.** 2026-07-29

**Contexto.** `tasks_search_vector_idx` (GIN, creado en
`20260729120018_tasks_search_vector.sql`) existe para que
`search_vector @@ tsquery` sea rápido. Medido con `EXPLAIN (ANALYZE,
BUFFERS)` contra el Docker local con 580.000 filas: sin RLS, el planner usa
el GIN y la consulta tarda 0,2ms. Con RLS activa, como rol `authenticated`,
el planner **no** lo usa — recurre al btree `tasks_user_id_due_at_idx` para
acotar por `user_id` y aplica el `tsquery` como `Filter` fila por fila. Con
80.000 tareas propias eso da 18ms.

La causa es `pg_proc.proleakproof`: `ts_match_vq`, la función detrás de
`@@`, no está marcada `LEAKPROOF`. Para un rol no-superusuario con RLS
activa, Postgres no empuja un operador no-leakproof como condición de
índice antes de aplicar la política de fila — hacerlo evaluaría el operador
sobre filas que el usuario no puede ver, justo lo que RLS existe para
impedir.

**Decisión.** Se acepta el comportamiento. El índice GIN queda: sostiene la
columna generada (D-B de `openspec/changes/fase-2-potencia/design.md` —
`unaccent()` no es `IMMUTABLE`, la configuración `spanish_unaccent` sí lo
es) y sirve igual si algún día una consulta corre sin RLS. El fallback por
`user_id` ya acota el conjunto, y un usuario real de una app de tareas
personales tiene cientos o pocos miles de tareas, no ochenta mil — a esa
escala el filtro fila por fila no se nota.

**Alternativas descartadas.**

- Marcar `ts_match_vq` como `LEAKPROOF`. Es una función del sistema, no de
  este proyecto: es un cambio de seguridad global de Postgres, no algo que
  este proyecto deba tocar, y probablemente ni sea posible en Supabase
  hosteado, donde no hay superusuario.
- Hacer `buscar_tareas` `SECURITY DEFINER` para que el operador corra sin
  RLS activa y el planner sí empuje el GIN. Tira abajo la defensa en
  profundidad que fijó D-A: `SECURITY INVOKER` es la que garantiza que la
  RLS queda como última línea de defensa aunque el AST compilado tenga un
  error. Ganar milisegundos a costa de esa garantía no vale la pena.

**Consecuencia.** El índice GIN sigue en las migraciones aunque el planner
no lo elija bajo RLS — no se dropea, porque sostiene la columna generada.
Si algún día la cantidad de tareas por usuario deja de ser "cientos o pocos
miles", esta decisión se revisa con un `EXPLAIN` nuevo en la mano.

---

## D37 — `replica identity full` en las tablas que Realtime filtra por `user_id`

**Fecha.** 2026-07-31

**Contexto.** Ningún borrado se propagaba por Realtime, en ninguna tabla, desde
fase 1. `lib/realtime/subscribe.ts` suscribe ocho tablas (`tasks`, `projects`,
`sections`, `comments`, `reminders`, `filters`, `habits`, `habit_completions`) con
`filter: user_id=eq.<uuid>`. Con `replica identity default` —el default de
Postgres—, la fila vieja que un DELETE manda al WAL trae solo la primary key, sin
`user_id`. Realtime no puede evaluar el filtro contra esa fila y descarta el
evento sin avisar: ni error, ni log, nada. Crear y editar funcionaban bien porque
un INSERT y un UPDATE sí llevan la fila completa.

El bug pasó dos fases sin detectarse porque el único test de Realtime que existía,
`e2e/realtime-sync.spec.ts`, probaba crear una tarea, no borrar nada. Se destapó
al desmarcar un hábito completado en una pestaña y ver que no desaparecía de la
otra.

**Decisión.** `replica identity full` en las ocho tablas que un cliente suscribe
con filtro por `user_id` (migración
`20260731000000_realtime_replica_identity_full.sql`). `labels` y `task_labels`
quedan afuera: están en la publicación `supabase_realtime` desde fase 1 mirando a
fases futuras, pero ningún cliente se suscribe a ellas todavía, así que no hay
filtro que el DELETE necesite poder evaluar.

**Por qué.** Es la recomendación estándar de Supabase para Realtime filtrado por
una columna que no es la PK: manda la fila vieja completa (no solo la PK) en cada
UPDATE y DELETE, así el filtro por `user_id` se puede evaluar siempre. El costo es
más bytes en el WAL por cada UPDATE/DELETE — para el volumen de escritura de una
app personal, despreciable.

**Alternativas descartadas.**

- Filtrar del lado del cliente en vez de con `filter` de Realtime (suscribirse a
  toda la tabla y descartar lo que no es del usuario). Manda a cada cliente los
  cambios de todos los usuarios y depende de que el filtrado en el navegador nunca
  tenga un bug — la RLS ya no protegería nada en esa capa.
- `replica identity` por índice único en `user_id` en lugar de `full`. No aplica:
  `replica identity index` exige que el índice sea único, y `user_id` no lo es en
  ninguna de estas tablas (varias filas por usuario).

**Consecuencia.** El próximo que agregue una tabla a `supabase_realtime` con un
cliente que se suscriba filtrando por una columna que no es la PK tiene que
recordar `replica identity full` en la misma migración — si no, el mismo bug en
silencio se repite. `e2e/realtime-sync.spec.ts` ahora también cubre borrar, para
que quede como regresión y no solo como decisión escrita.

## D38 — El refresh token de Google se cifra en la aplicación con AES-256-GCM

**Fecha.** 2026-07-31

**Contexto.** `calendar_connections.refresh_token` (fase 4) es el primer secreto
de larga vida y por usuario que Trazio guarda: un valor que, si se filtra, le da a
quien lo tenga acceso de lectura y escritura al calendario de Google de esa
persona hasta que se revoque. El proyecto no tenía hasta ahora ninguna decisión
registrada sobre cifrado de datos en reposo.

**Decisión.** El refresh token se cifra en `lib/calendar/crypto.ts` con
AES-256-GCM antes de guardarse, usando una clave de 32 bytes que vive en la
variable de entorno de servidor `CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY`
(`docs/setup-google-calendar.md`). Se guarda un único valor en base64 con el
nonce, el tag de autenticación y el ciphertext concatenados. Descifrar ocurre
solo del lado servidor, en el momento de refrescar el access token. La clave no
se guarda en la base: si se pierde, cada usuario reconecta.

**Por qué.** GCM y no CBC porque autentica: un ciphertext manipulado falla al
descifrar en vez de devolver basura en silencio, lo cual importa para un secreto
que habilita acceso a una cuenta de terceros.

**Alternativas descartadas.**

- El Vault de Supabase, como los secretos del cron de fase 2. Está pensado para
  secretos del proyecto, pocos y estables, no para un secreto por usuario que se
  crea y se revoca con cada conexión.
- `pgsodium` con cifrado transparente de columna. Supabase lo está
  discontinuando, y ata el cifrado a una extensión de la base en vez de dejarlo
  en código que se puede leer y testear.

**Consecuencia.** Cualquier tabla futura que guarde un secreto por usuario sigue
este mismo patrón: cifrado en aplicación con AES-256-GCM y clave de servidor, no
Vault ni cifrado de columna. Perder la clave de cifrado invalida todas las
conexiones existentes — documentado para que nadie la mueva a la base "para no
perderla".

---

## D39 — Se elimina el umbral de centrado que fijó D35; `mx-auto` corre siempre

**Fecha.** 2026-08-01

**Contexto.** D35 centraba la columna de contenido solo por encima de un
umbral de ancho disponible (90rem/1440px, medido con container queries para
que colapsar el panel lateral contara), implementado como el par de clases
`w-full max-w-content @[90rem]:mx-auto`. Pero el tope de la columna
(`--container-content`) es 72rem/1152px, y entre 1152px y 1440px de ancho
disponible ninguna de las dos condiciones se cumple: no llena (sobra ancho)
ni centra (no llegó al umbral). En ese tramo el contenido queda pegado a la
izquierda con hasta ~288px muertos del lado derecho — exactamente el reparto
que D35 existía para evitar, y en un monitor de 1600px, que no es un caso de
borde. Además, cinco vistas (Etiquetas, Filtros, resultados de un filtro,
Hábitos, Buscar) tenían `max-w-content` pero nunca recibieron la variante de
container query: el despliegue original de D35 cubrió cinco pantallas y
quedaron afuera sin que nadie volviera a pasar.

**Decisión.** Se saca la condición. El par pasa de
`w-full max-w-content @[90rem]:mx-auto` a `w-full max-w-content mx-auto`, en
todas las vistas, incluidas las cinco que no lo tenían. `mx-auto` sin
condición ya resuelve lo que D35 pedía: por debajo del tope de columna llena
el ancho disponible, porque no queda margen para repartir; por encima,
centra. No hace falta un umbral aparte para eso.

**Por qué no se recalibra el número en vez de sacar la condición.** El
defecto no fue elegir mal 90rem — fue que un umbral fijo depende del tope de
columna (72rem), y los dos se descalibran apenas uno cambia sin el otro: es
lo que ya pasó, cuando el tope de columna subió de 48rem a 72rem sin que el
umbral de centrado se recalculara. Elegir hoy un número nuevo, mejor
ajustado a 72rem, no evita que se repita — deja la misma clase de bug
esperando la próxima vez que el tope de columna cambie. Sacar la condición
quita la variable que hay que mantener sincronizada a mano.

**Consecuencia.** El `@container` de `app/(app)/layout.tsx` se revisó: sigue
en pie porque `components/view-options/view-options-bar.tsx` todavía usa
`@[90rem]:mx-auto` (fuera del alcance de esta tanda); si ese archivo pasa al
mismo criterio, `@container` queda sin ningún consumidor y se puede sacar.
`docs/design-system.md` §5.1 documenta el mecanismo de umbral y container
query que esta decisión reemplaza, y queda pendiente de actualizar.

**Nota (2026-08-02).** Lo pendiente de este párrafo ya se completó:
`view-options-bar.tsx` pasó al mismo criterio y no queda ninguna ocurrencia
de `@[90rem]` ni de `@container` en el código.

---

## D40 — Un comentario vuelve a ser texto plano; la descripción no se toca

**Fecha.** 2026-08-02

**Contexto.** Un comentario se escribía con el mismo editor Tiptap enriquecido
que la descripción de la tarea: barra de herramientas, títulos, tablas, listas
de tareas, bloques de código, notas al pie. No un parecido — el mismo
componente importado. D2 lo decidía así explícitamente, en la misma oración
que descarta el markdown en el título: *"La descripción y los comentarios sí
son enriquecidos."*

El dueño, usándolo, decidió que no lo quiere así: un comentario es una nota
corta al margen de una tarea, y darle el mismo peso editorial que a la
descripción es desproporcionado. La barra de formato ocupa más que lo que se
suele escribir.

**Decisión.** Un comentario se escribe y se muestra como texto plano, en un
campo de texto simple. Sin barra de herramientas, sin menú de insertar, sin
diálogo de enlaces. Los saltos de línea que la persona escriba se respetan al
mostrarlo. `comments.content` pasa de `jsonb` a `text`; los comentarios ya
escritos se convirtieron con una migración que aplana el documento
preservando el texto y los saltos de línea entre bloques, y pierde el formato
que tuvieran (negritas, títulos, listas, tablas) de forma irreversible.

Esto **supera la parte de D2** que decía que los comentarios son enriquecidos.
Lo que D2 decide sobre el **título** —texto plano— sigue vigente y no se toca.

**La descripción de la tarea no se toca.** Sigue enriquecida, con el editor
Tiptap y las extensiones de D31, sin fórmula matemática (D30). Queda una
asimetría deliberada entre los dos: la descripción es el cuerpo de la tarea
—donde va un procedimiento, una lista de pasos, una tabla— y el comentario es
una nota al margen. Que se vean distintos es información, no ruido, y no es
una inconsistencia a resolver más adelante: el impulso de "unificar" los dos
editores va a volver, y esta decisión es la respuesta ya escrita para cuando
vuelva.

**Por qué no un editor enriquecido con las opciones capadas.** Seguiría
guardando un documento estructurado con un solo tipo de nodo — la complejidad
de Tiptap en una superficie que no la necesita, sin ninguno de sus beneficios.

**Consecuencia.** `components/comments/comment-composer.tsx` y
`comment-item.tsx` usan un campo de texto (`Textarea`) en vez de
`TaskDescriptionEditor`; `comment-content.tsx` renderiza el texto guardado en
vez de instanciar un editor de solo lectura. El veto a adjuntos en
comentarios no cambia. `docs/product-spec.md` queda actualizado para
describir los comentarios como texto plano.

---

## D41 — La fila de tarea crece hacia abajo, en niveles; el proyecto se ancla a la derecha

**Fecha.** 2026-08-02

**Contexto.** La fila de tarea era una sola línea: casilla, título, y pegados
al título los chips de etiqueta y la fecha, todo comprimido en una franja
mientras entre 260 y 810px quedaban sin usar según la tarea. El dueño lo
pidió así: *"de ancho no, expandir para abajo me refería. Así tenés más
lugar. Y que el proyecto se muestre alineado al título de la tarea pero todo
a la derecha, y abajo la fecha y las etiquetas."* Además, dos cosas que
importan no se mostraban en ningún lado: de qué proyecto y de qué sección es
una tarea, en las vistas que cruzan proyectos (Hoy, Próximos, Etiqueta,
Filtro, Buscador, Completado).

**Decisión.** La fila pasa a dos niveles: el título con el proyecto y la
sección anclados al borde derecho, y debajo — solo si hay algo que
mostrar — la fecha y las etiquetas. Cada nivel se renderiza únicamente si
tiene contenido: una tarea sin fecha ni etiquetas sigue en una sola línea,
como antes.

El proyecto y la sección se muestran en Hoy, Próximos, Etiqueta, Filtro,
Buscador y Completado (las seis vistas que cruzan proyectos) y **no** en la
Bandeja, un Proyecto, una sección, las subtareas del detalle ni el tablero
de Bandeja o de Proyecto — ahí ya lo dice el encabezado. Esa condición se
decide de forma explícita en cada uno de los nueve montajes de `TaskRow`
(prop `showProject`), nunca derivada de `variant`: el tablero y agrupar por
prioridad dentro de un proyecto también son compactos y ahí el proyecto
sobra igual.

El chip de proyecto/sección va como **hermano** del botón del título, nunca
adentro: el botón toma su nombre accesible de todo su contenido, y meter el
chip adentro cambiaría "Pagar el alquiler" por "Pagar el alquiler Trabajo"
para quien navega por teclado o lector de pantalla, rompiendo además las
pruebas que buscan tareas por su nombre.

En 390px, anclar el chip al lado del título le sacaría 60-100px justo donde
menos sobra (el título ya baja a 60-80px con etiquetas y hora). Ahí el chip
baja al segundo nivel, junto a la fecha y las etiquetas, en vez de quedarse
arriba.

El nombre de sección se trae con una consulta mayorista y cacheada de todas
las secciones del usuario (`useAllSections`, sembrada desde el layout igual
que `useProjects`), nunca de a un proyecto por vez — el patrón que prohíbe
`.claude/rules/database.md` para una lista que cruza proyectos.

**Esto acota el requisito de `vistas-lista`** (`docs/design-system.md` §5.1)
que decía que la metadata nunca se pega al borde derecho: la fecha y las
etiquetas siguen sin pegarse (bajan al segundo nivel, a la izquierda); el
proyecto y la sección son la única excepción, porque anclarlos es lo que los
vuelve recorribles entre filas.

**Consecuencia.** `components/tasks/task-row.tsx` concentra el cambio
visual; nueve superficies (`task-group-list.tsx`, `label-view.tsx`,
`filter-results-view.tsx`, `search-command.tsx`, `completed-view.tsx`,
`hoy-view.tsx`, `proximos-view.tsx`, y los montajes que dejan `showProject`
en su valor por defecto: `sectioned-tasks.tsx`, `task-list.tsx`,
`board.tsx`) deciden explícitamente si lo muestran. Se agregan
`lib/sections/get-all-sections.ts` y `useAllSections` en
`lib/sections/use-sections.ts`, sembrados por
`components/providers/all-sections-seed.tsx` desde `app/(app)/layout.tsx`.
Una línea tenue separa tareas hermanas de primer nivel (`divide-y` en cada
`<ul>` de fila); las subtareas y la fila de "Agregar tarea" no llevan línea.
`docs/design-system.md` §5.1 queda actualizado para describir el layout de
dos niveles.

---

## D42 — El botón de continuar en el detalle se llama "Abrir detalle", sin anunciar que crea

**Fecha.** 2026-08-03

**Contexto.** El botón decía "Crear y abrir detalle". El dueño, después de usarlo:
*"no me gusta que el botón sea crear y abrir detalle. Que sea solo abrir detalle y
obviamente que se lleve todo el progreso de lo que hice."* Esto contradice el
requisito escrito el mismo día en `openspec/specs/alta-de-tareas/spec.md` (bloque
`saltar-al-detalle-desde-el-alta`), que pedía que el nombre dejara claro que la
acción crea la tarea — precisamente para que nadie la pulsara creyendo que solo
muestra más campos.

**Decisión.** El botón pasa a llamarse "Abrir detalle" en las dos superficies del
alta. El comportamiento no cambia: sigue creando la tarea con todo lo cargado
(título, descripción, prioridad, fecha, fecha límite, etiquetas y recordatorios)
y después abre su detalle, igual que antes.

**Riesgo aceptado.** El nombre ya no anuncia que la acción crea una tarea. Alguien
puede pulsar "Abrir detalle" pensando que solo va a ver más campos, y cerrar el
detalle sin tocar nada — la tarea queda creada igual, silenciosamente, porque
comentarios y subtareas cuelgan de una tarea real y no hay forma de mostrar un
detalle sin haberla creado antes (decisión ya tomada, sin cambios). El dueño
evaluó ese riesgo y lo aceptó a cambio de un nombre más corto y más claro sobre
qué pasa al pulsarlo.

**Consecuencia.** `components/tasks/task-quick-add-row.tsx` y sus tests quedan
actualizados con el nombre nuevo. El requisito de
`openspec/specs/alta-de-tareas/spec.md` se corrige para pedir que el nombre
describa el destino de la acción en vez de exigir que anuncie la creación.

---

## D43 — El panel de Hoy no muestra eventos, y lo dice

**Fecha.** 2026-08-03

**Contexto.** Con la capacidad `hoy-con-eventos`, Hoy pasa a ofrecer los tres
formatos (lista, panel, calendario) como Próximos y Proyecto. En panel, las
columnas de esas dos pantallas salen de un criterio de agrupación —día en
Próximos, sección en Proyecto— y acá el único disponible es "agrupar por"
(nada, prioridad, etiqueta). Un evento no tiene prioridad ni etiqueta: metido
en cualquier columna sería ruido, y una columna "Eventos" aparte sería
inventar un cuarto criterio que no convive con los otros tres.

**Decisión.** El panel de Hoy muestra únicamente tareas. Cuando el usuario
tiene eventos hoy y mira Hoy en formato panel, una línea avisa que ese formato
no los muestra. Sin esa línea, alguien mira el panel y concluye que no tiene
reuniones — omitir en silencio es peor que no ofrecer el dato.

**Riesgo aceptado.** Quien vive del panel tiene que cambiar a lista o
calendario para ver sus eventos de hoy. Se acepta: la alternativa —forzar un
evento dentro de un criterio de agrupación que no le corresponde— es peor.

**Consecuencia.** `components/tasks/hoy-view.tsx` arma las columnas del panel
con `groupTasks` sobre atrasadas y tareas de hoy juntas (sin columna propia de
atrasadas, mismo criterio que ya usa el panel de Próximos), y muestra el aviso
cuando `useHoyEvents` trae al menos un evento. El contador de eventos no
descuenta según el formato activo: la capacidad `hoy-con-eventos` sigue
trayendo los eventos aunque el panel no los pinte.

---

## D44 — En el empate de Hoy, el evento va primero

**Fecha.** 2026-08-03

**Contexto.** La capacidad `hoy-con-eventos` intercala tareas y eventos por
hora en una sola secuencia. Cuando una tarea y un evento caen exactamente a la
misma hora, hace falta un criterio de desempate: sin uno, el orden depende de
en qué orden respondieron las dos consultas (`useHoyTasks`/`useHoyEvents`),
que llegan por caminos independientes a propósito (el desacople con Google es
la propiedad más importante de Hoy) y por lo tanto no tienen un orden de
llegada estable entre sí.

**Decisión.** A igual hora, el evento se muestra primero. Un evento es un
compromiso con otra gente —una reunión no se corre sola—; una tarea a esa
misma hora sí se puede mover. Con ese criterio el orden queda total y
determinístico, sin depender de qué consulta respondió antes.

**Consecuencia.** `buildHoySequence` (`lib/tasks/hoy-sequence.ts`) ordena el
tramo de "con hora" por instante absoluto ascendente y, a igual instante,
antepone la entrada de tipo evento — cubierto por la prueba "empate a la misma
hora: primero el evento" en `lib/tasks/hoy-sequence.test.ts` y en
`components/tasks/hoy-view.test.tsx`.

---

## D45 — El salto de Hoy se mitiga con precarga en el layout; se acepta un residuo en frío

**Fecha.** 2026-08-03

**Contexto.** D-E de `openspec/changes/hoy-con-eventos-y-formatos/design.md`
daba por aceptado el salto que producen las filas de evento al insertarse
después de las tareas —entre 250 y 300px, con clics que terminan cayendo en la
fila equivocada—. Verificado en el navegador, el dueño lo consideró
intolerable y pidió mitigarlo.

**Decisión.** Se agrega `HoyEventsSeed`
(`components/calendar/hoy-events-seed.tsx`), montado desde
`app/(app)/layout.tsx`, que dispara la misma consulta que usa Hoy —mismo
`queryKey`— apenas se monta el layout, en vez de recién al llegar a Hoy. Es
una precarga, no una espera: sigue sin haber esqueleto de carga ni
`isLoading` compartido, y las tareas de Hoy siguen sin esperar a Google. Al
vivir en el layout, que no se remonta entre pantallas de `app/(app)/`, la
consulta sale una vez por carga completa de página, no una vez por
navegación.

**El precio aceptado.** Toda pantalla de la app dispara ahora una llamada a
Google Calendar aunque esa pantalla no muestre ningún evento —Bandeja, un
Proyecto, Configuración, lo que sea, con tal de que sea la primera pantalla de
la sesión—. Acotado por el caché de un minuto del lado del cliente (ver más
abajo): solo la primera pantalla de cada carga completa paga esa llamada; el
resto de la navegación dentro de esa carga la reusa.

**Lo que no se resuelve.** El salto sigue existiendo al entrar directo a Hoy
en frío —por URL, marcador o recargando estando ya ahí—: ahí no hay ventaja
que precargar, porque la precarga y la propia pantalla arrancan al mismo
tiempo. Es deliberado: se mitiga el caso frecuente (navegar dentro de la app
hasta Hoy), no el menos frecuente (aterrizar ahí en frío).

**El defecto real que apareció.** La consulta
(`lib/calendar/use-today-events.ts`) no tenía `staleTime`, así que la
precarga y el montaje de Hoy —mismo `queryKey`— disparaban dos pedidos
idénticos a Google en vez de uno: React Query servía el caché al instante
pero igual refetcheaba en el fondo con el default en cero. Se corrigió con
`staleTime: 60_000`. Esto es distinto del caché de un minuto que ya existía
del lado del servidor (`lib/calendar/events-cache.ts`, un mapa en memoria por
proceso): ese evita pedirle dos veces lo mismo a la API de Google; el nuevo
evita que el propio navegador dispare el pedido dos veces en una misma
visita.

**Caso borde que queda anotado, sin resolver.** La precarga toma la zona
horaria que el layout renderizó en la última carga completa de página; Hoy la
lee de su propia consulta de preferencias, que se repite en cada navegación a
la pantalla. Si alguien cambia su zona horaria en Configuración y navega a
Hoy sin recargar, las dos claves de caché quedan con zonas horarias
distintas y esa visita no encuentra nada precargado — no es un error de
corrección, los eventos que se terminan mostrando son igual los correctos,
pero esa visita puntual pierde la mitigación y el salto vuelve a pasar. Se
corrige solo en la próxima carga completa de página.

**Consecuencia.** `openspec/changes/hoy-con-eventos-y-formatos/design.md`
(D-E) queda actualizado para describir la precarga en vez del salto asumido
sin mitigar.

---

## D46 — "Abrir detalle" sin título crea la tarea vacía y la abre; si se cierra sin titularla, no queda

**Fecha.** 2026-08-03

**Contexto.** Reporte del dueño: *"Cuando le doy al botón de abrir detalle
se cierran los modals si no escribí nada, debería abrirse vacío."*
Verificado: `submitAndOpenDetail()` (`task-quick-add-row.tsx`) trataba un
título vacío igual que "Cancelar" —`if (!trimmed) { cancel(); return; }`—,
así que ni creaba la tarea ni abría nada. En la superficie embebida esto
colapsaba el compositor a su botón "Agregar tarea"; en el modal global
(`variant="full"`), `cancel()` además cierra el diálogo entero
(`closeComposerSurface` → `onCancel?.()`), así que el reporte del dueño
("se cierran los modals") era literal: apretar el botón hacía desaparecer
todo sin mostrar nada en su lugar.

**Decisión.** "Abrir detalle" ya no cancela con el título vacío: crea la
tarea igual —el esquema lo permite, `tasks.title` es `not null` pero sin
`check` contra la cadena vacía— y abre su detalle, con el foco puesto en el
título (`TaskDetailFocusField` suma el valor `"title"`, mismo mecanismo que
ya usan `T`/`Y` para fecha y prioridad).

Ese detalle recién abierto se hace cargo de que la tarea no quede sin
título de forma permanente: si se cierra —`X`, `Escape`, clic afuera,
Atrás, o pasar a otro detalle— sin haber cargado uno, la tarea se borra,
silenciosa (sin el toast "Tarea eliminada" ni el deshacer de
`useDeleteTask`: la persona nunca llegó a percibir que existía, así que no
hay nada que ofrecerle deshacer — nueva mutación `useDeleteEmptyTask`). Si
sí se llegó a escribir algo pero el autoguardado con debounce todavía no
disparó, el cierre lo fuerza (`flush`) en vez de perderlo.

Este resguardo solo se activa para la tarea que nació sin título por este
camino (`wasCreatedEmptyRef`, fijado al primer render con
`task.title === ""`): el cierre del detalle de cualquier tarea que ya tenía
título al abrirse —la inmensa mayoría— no pasa por acá y no cambia en nada.

**Convive con D42, no lo contradice.** D42 dice que cerrar el detalle sin
tocar nada deja la tarea "con lo que tenía al crearse" — esa decisión asume
una tarea que **ya tenía título** al crearse, que sigue siendo el caso
normal (alta con título, "Abrir detalle"). D46 cubre el caso nuevo que D42
no contemplaba: una tarea que **todavía no tiene título** en el momento de
cerrar. Las dos leen distinto en aislamiento porque hablan de dos estados
de partida distintos; juntas: con título, se queda tal cual (D42); sin
título, no queda (D46).

**El límite aceptado, sin resolver.** El borrado de acá arriba depende de
que se ejecute JavaScript de React al desmontar el formulario — cubre todo
cierre dentro de la aplicación, pero no una recarga de página (F5) ni
cerrar la pestaña con ese detalle vacío todavía abierto: ahí no corre nada
que borre la tarea, y queda huérfana en la base con título vacío. Se decide
**no** resolver esto con filtrado cruzado (excluir `title = ''` de cada
consulta de lista y de búsqueda — son más de diez sitios distintos,
`lib/tasks/get-*.ts`, `use-*-tasks.ts`, `lib/search/use-search.ts`, entre
otros) ni con un `beforeunload`/cron de limpieza: el disparador es angosto
(hace falta dejar el título vacío a propósito y además abandonar la pestaña
sin cerrar el detalle primero) y las dos soluciones agregan superficie
permanente para un caso raro. El precio: una recarga en esas condiciones
puede dejar una fila en blanco, sin texto, visible y clickeable en la lista
del proyecto correspondiente hasta que alguien la abra y la cierre de
nuevo (ahí sí se borra, por el mismo mecanismo) o la borre a mano.

**Consecuencia.** `components/tasks/task-quick-add-row.tsx` (ya no cancela
con título vacío; pide foco de título al abrir sin uno),
`components/tasks/task-detail-context.tsx` (`TaskDetailFocusField` suma
`"title"`), `components/tasks/task-detail-content.tsx` (foco de título al
abrir; borrado o `flush` al cerrar una tarea nacida vacía) y
`lib/tasks/mutations.ts` (`useDeleteEmptyTask`) quedan actualizados, con sus
tests. El requirement "El alta ofrece continuar en el detalle de la tarea"
de `openspec/specs/alta-de-tareas/spec.md` queda corregido para pedir que
la acción abra siempre, con o sin título, y para separar el escenario de
cerrar con título (D42) del de cerrar sin él (D46).

---

## D47 — El agrupador define las columnas del panel; etiqueta queda afuera, y el panel exceptúa el tope de ancho de D39

**Fecha.** 2026-08-03

**Contexto.** El modo panel tenía sus columnas cableadas por pantalla —secciones
en Bandeja y Proyecto, días en Próximos— sin relación con el control "agrupar
por" de la barra de opciones, que ya existía y no las tocaba. Pedido del dueño:
*"en el modo panel, el agrupador es por lo que se muestra cada columna. O sea si
yo no agrupo por nada, las columnas se muestran por secciones. Si yo pongo por
fecha las columnas son las fechas disponibles. Y así con cada campo."*
(`openspec/changes/panel-con-columnas-por-campo/`).

**Decisión.** Las columnas del panel salen del agrupador, no de la pantalla:
"nada" (la agrupación natural de cada pantalla), sección, fecha o prioridad.
Mover una tarjeta entre columnas escribe el campo que las define — sección (con
la posición), fecha (conservando la hora) o prioridad —, con cualquier valor del
agrupador; reordenar **dentro** de una columna sigue exigiendo orden manual,
porque es lo único que puede persistir una posición elegida a mano. Esto
invierte la condición anterior, que apagaba el arrastre justo cuando había
agrupación activa.

**Etiqueta no se ofrece en el panel.** Una tarea puede tener varias, así que
aparecería repetida en varias columnas y mover dejaría de significar una sola
cosa. El agrupador es el mismo control y la misma preferencia guardada que la
lista, donde etiqueta sigue disponible: una preferencia guardada en "etiqueta"
se trata como "nada" dentro del panel, sin pisarse — volver a la lista la
encuentra intacta.

**En Hoy, "nada" es prioridad.** Hoy cruza proyectos (no tiene secciones
propias) y es un solo día (no hay días con los que armar columnas): de los
cuatro campos del agrupador, prioridad es el único que le queda con el que
agrupar signifique algo. Es la única de las cuatro pantallas donde "nada" no
reproduce lo que ya mostraba la lista antes de este cambio.

**El panel exceptúa el tope de ancho de D39.** La columna de contenido se
centra siempre en 1152px; un tablero no es una línea de texto —cada columna
tiene su propio ancho corto, y el tope solo limita cuántas se ven a la vez—,
así que en modo panel el contenido ocupa el ancho disponible. Es una excepción
acotada a esa forma de ver: lista y calendario no cambian.

**Consecuencia.** `components/projects/sectioned-tasks.tsx`,
`components/tasks/proximos-view.tsx` y `components/tasks/hoy-view.tsx` arman
sus columnas del panel con el modelo compartido (`lib/board/panel-columns.ts`,
`lib/board/panel-move.ts`) en vez de cablearlas. `lib/view-options/schema.ts`
pierde `isDragEnabled` (la condición que invertía) y suma `effectivePanelGroupBy`/
`effectiveListGroupBy`. `docs/product-spec.md` y `docs/design-system.md`
(§5.1) quedan actualizados con el modelo nuevo, el caso especial de Hoy y la
excepción de ancho.

---

## D48 — El panel deja de ofrecer "nada"; cada pantalla tiene su propio valor por defecto

**Fecha.** 2026-08-03

**Contexto.** D47 hizo que el agrupador definiera las columnas del panel, con
"nada" como la agrupación natural de cada pantalla. Pedido del dueño: *"no
tiene sentido que en el modo panel haya estos 2 agrupadores, nada y sección,
porque los dos agrupan por sección. Deja solo sección por default y ya."* Tenía
razón en dos frentes: en Bandeja y Proyecto, "nada" y "sección" producían
exactamente las mismas columnas —una redundancia visible en el propio
desplegable—, y además "nada" era el único valor del agrupador que significaba
algo distinto en cada pantalla —secciones acá, días en Próximos, prioridad en
Hoy (D47)—, lo que lo hacía imposible de explicar con un solo nombre.

**Decisión.** El panel deja de ofrecer "nada" como valor del agrupador. Cada
pantalla ofrece en su lugar un valor por defecto propio y explícito: sección en
Bandeja de entrada y Proyecto, fecha en Próximos, prioridad en Hoy — los mismos
que ya venía mostrando "nada" en cada una. La lista no cambia: "nada" ahí sigue
significando "no agrupar", sin ambigüedad con ninguna otra pantalla.

**No se pisa la preferencia guardada.** El default de toda pantalla sigue
siendo "nada" en la fila de `view_preferences` —eso no cambia—, así que la
inmensa mayoría de las personas tiene "nada" guardado. `effectivePanelGroupBy`
(`lib/view-options/schema.ts`) resuelve esa preferencia (y "etiqueta", y
"sección" en Hoy/Próximos, que tampoco tienen salida en el panel) al valor por
defecto de la pantalla actual, sin escribir nada: volver a la lista sigue
encontrando "nada" intacto.

**El resultado visible no cambia para nadie.** Quien hoy ve columnas por
sección en un proyecto sigue viéndolas igual, solo que el control ahora dice
"Sección" en vez de "Nada". La única pantalla donde esto exigió tocar código de
verdad —no solo el mapeo de `effectivePanelGroupBy`— fue **Próximos**: ahí
"nada" y "fecha" explícito nunca produjeron las mismas columnas ("nada" arma la
ventana de días configurada, con huecos; "fecha" arma solo los días que ya
tienen tareas, sin ventana — distinción que ya existía desde D47). Como ahora
las dos comparten la misma etiqueta visible ("Fecha"), `components/tasks/proximos-view.tsx`
tuvo que dejar de mirar el valor resuelto por `effectivePanelGroupBy` para
decidir qué columnas armar, y mirar en cambio el valor crudo guardado
(`options.groupBy === "fecha"`): así seguir distinguiendo el default histórico
de la elección explícita, aunque el control ya no pueda mostrar esa diferencia.
Bandeja, Proyecto y Hoy no necesitaron ese cambio: ahí "nada" y su equivalente
explícito siempre armaron exactamente las mismas columnas.

**Consecuencia.** `lib/view-options/schema.ts` (`effectivePanelGroupBy` deja de
pasar "nada" sin tocar y resuelve al valor por defecto de la pantalla, vía la
nueva `panelNaturalGroupBy`), `components/view-options/view-options-bar.tsx`
(el panel deja de ofrecer "nada" en su desplegable), `components/tasks/proximos-view.tsx`
(distingue default de "fecha" explícito por el valor crudo) y
`components/projects/sectioned-tasks.tsx` (la rama muerta que trataba "nada"
como "sección" en el panel se simplifica, ya que `effectivePanelGroupBy` nunca
vuelve a devolver "nada") quedan actualizados, con sus tests.
`openspec/specs/modo-panel/spec.md` y `openspec/specs/opciones-de-vista/spec.md`
quedan corregidos para reflejar que el panel no ofrece "nada".

---

## D49 — "Nada" es una lista corrida en todas partes; Hoy deja de agrupar en lista

**Fecha.** 2026-08-05

**Contexto.** En la lista, "nada" significaba dos cosas distintas según la
pantalla: en Bandeja y Proyecto armaba bloques por sección (el único camino
para verlos, porque la lista no ofrecía agrupar por sección); en el resto era
lo que dice su nombre, una lista corrida. Pedido del dueño: *"en modo lista
también tiene que haber más agrupadores, por default es el sección pero
tendría que haber más"*. Es el mismo problema que D48 sacó del panel, ahora en
la lista: un valor con dos significados según dónde se lo mire, y además un
hueco real — no había forma de ver un proyecto sin sus bloques de sección.

**Decisión.** El agrupador de la lista suma sección y fecha a lo que ya tenía
(nada, prioridad, etiqueta), con los cinco significando lo mismo que en el
panel. "Nada" pasa a ser una sola lista corrida, sin bloques ni encabezados,
**en todas las pantallas** — nunca la agrupación natural de la que se está
mirando. Bandeja de entrada y Proyecto pasan a tener "sección" como valor por
defecto, explícito en vez de heredado de "nada": al abrir se ve exactamente
igual que antes, solo que el control ahora lo dice. "Sección" nunca se ofrece
donde la vista cruza proyectos (Hoy, Próximos, una etiqueta, un filtro): una
sección pertenece a un proyecto, y fuera de uno no significa nada. La lista de
Hoy, en cambio, deja de ofrecer el agrupador por completo: dejó de ser una
lista de tareas — es la secuencia de tres tramos con eventos intercalados,
ordenada por hora (`hoy-con-eventos`) — y agrupar la rompe, además de dejar a
un evento sin prioridad, etiqueta ni sección con qué agruparse. Es una pérdida
frente a lo que Hoy ofrecía hasta ahora (prioridad y etiqueta), asumida: esas
opciones ya convivían mal con la secuencia desde que los eventos se
intercalaron. Su panel no cambia, sigue ofreciendo el agrupador — ahí no hay
eventos ni secuencia que romper.

**Una migración, no una traducción al leer.** Quien tenía "nada" guardado en
un proyecto o en la Bandeja lo tenía porque, hasta ahora, significaba
"sección" ahí — la inmensa mayoría, porque era el valor por defecto. Si el
código nuevo lo interpretara literalmente sin tocar la base, esas personas
abrirían su proyecto y lo verían aplanado de golpe, sin haberlo pedido. Se
podría haber resuelto traduciendo el valor al leer ("en un proyecto, 'nada'
sigue significando sección"), pero eso es exactamente el problema que se
está sacando, y además dejaría la lista corrida inalcanzable para siempre en
un proyecto — la mitad del pedido. La migración
(`supabase/migrations/20260805010000_view_preferences_seccion_migration.sql`)
reescribe, una sola vez, las filas de `view_preferences` con `view_key` de
Bandeja o de un proyecto que tengan `groupBy: "nada"` guardado, pasándolas a
`"seccion"`. Es idempotente y solo toca esa clave del jsonb, sin pisar el
resto del documento ni las filas de etiqueta, filtro, Hoy o Próximos, donde
"nada" ya significaba lista corrida.

**Lo que se pierde al aplanar un proyecto, y dónde queda.** Los bloques de
sección traen tres cosas que solo viven en su encabezado: colapsar, agregar
una tarea dentro de esa sección, y su menú (renombrar, eliminar). Agrupando
por cualquier otro valor, las tres desaparecen de la lista. Colapsar se pierde
sin reemplazo — es una comodidad de lectura, no una acción sobre los datos.
Agregar una tarea en una sección puntual sigue alcanzable sin los bloques: el
selector de destino del alta rápida (`TaskDestinationSelect`) y la sintaxis
`#Proyecto/Sección` del parser de lenguaje natural no dependen de que el
bloque esté en pantalla. Renombrar y eliminar una sección, en cambio, solo
viven en el menú de `SectionItem` (`components/sections/section-list.tsx`) —
ni el modo panel las ofrece nunca, agrupe por lo que agrupe—, así que la única
puerta para esas dos es volver a agrupar por sección. Es el mismo trato que ya
tenían prioridad y etiqueta desde antes de esta ronda (el panel ya resolvía su
mitad ofreciendo "crear sección" solo cuando sus columnas son secciones): no
es un hueco nuevo, es extender un criterio ya aceptado a dos valores más.

**El arrastre no se sostiene fuera de "sección".** Agrupando por fecha,
prioridad o etiqueta —incluida "nada", una lista corrida que puede mezclar
tareas de secciones distintas cuya posición no es comparable entre sí (D25)—
no hay drag and drop: el mismo renderizador genérico que ya se usaba para
prioridad y etiqueta se extiende a los dos valores nuevos, sin agregar
arrastre a ninguno.

**Consecuencia.** `lib/view-options/schema.ts` (`defaultOptionsForViewKey`
suma "sección" como default explícito de Bandeja y Proyecto;
`effectiveListGroupBy` deja de tratar "fecha" como "nada", solo sigue
resolviendo así a "sección" —para el renderizador genérico de grupos, no para
la lista completa—), `lib/view-options/group-tasks.ts` (agrupa por fecha
reusando `dateColumns` de `lib/board/panel-columns.ts`, sin duplicar el
bucketing), `components/projects/sectioned-tasks.tsx` (la rama de bloques pasa
a depender de `groupBy === "seccion"`, no de `"nada"`),
`components/view-options/view-options-bar.tsx` (la lista ofrece los cinco
valores, "sección" acotada a Bandeja y Proyecto, y Hoy no ofrece el control en
absoluto en lista) y `components/tasks/hoy-view.tsx` (la lista fuerza "nada"
sin importar lo guardado) quedan actualizados, con sus tests.
`openspec/specs/opciones-de-vista/spec.md` y `openspec/specs/vistas-lista/spec.md`
quedan corregidos: el primero ya decía que la lista ofrece los cinco valores
—una inconsistencia con el código, que solo ofrecía tres, que esta ronda
también corrige.

## D50 — El bloque del calendario muestra según su alto, y saltear un hábito no toca la racha

**Fecha.** 2026-08-05

**Contexto.** Dos huecos de `calendario-legible-y-manipulable`. Primero: un
bloque del calendario mostraba lo mismo —un ícono y el título— midiera doce
píxeles (un cuarto de hora) o mil (un día entero), sin horario, sin proyecto
ni calendario de origen, sin etiquetas, y sin forma de completar una tarea o
un hábito desde ahí. Segundo: "saltear un hábito un día puntual" no existía
en toda la aplicación, y lo más parecido —reprogramar el horario del día—
devuelve el hábito a su hora habitual en vez de marcarlo como no hecho a
propósito.

**Decisión — la escalera de contenido por alto.** El contenido de un bloque
con horario es una escalera: cada dato aparece solo si el alto real del
bloque alcanza para una línea más (`ladderSteps` en
`components/calendar/calendar-block-chip.tsx`). Orden fijo, de lo que
distingue bloques vecinos a lo que no: título (con el control de completar
si corresponde), horario, calendario de origen o proyecto, etiquetas. El
control de completar **nunca se cae** por falta de espacio —es una acción,
no información— ni siquiera en el bloque de quince minutos (doce píxeles),
que activa un modo apretado aparte (`TIGHT_HEIGHT_THRESHOLD_PX`): sin
relleno vertical, una sola línea sin envolver, mismo recurso que usa Google
Calendar. La alternativa descartada es un alto mínimo por bloque: mentiría
sobre la duración, que es justamente lo que un calendario comunica con la
altura.

**Decisión — saltear un hábito no toca la racha.** Palabras del dueño: *"si
en un hábito me salteé un día, ese día queda ahí fijo en el calendario. Si
yo después lo completo se actualiza la racha."* De ahí salen tres reglas.
Saltear **no saca el bloque del calendario**: se queda, marcado como
salteado (`CalendarBlock.skipped`, atenuado con la misma opacidad que una
vista previa, pero — a diferencia de una — sigue interactivo). Es
**reversible**: completar después actualiza la racha como cualquier otro
día, y no se ofrece "Saltear" sobre un bloque ya cumplido ni ya salteado.
Y **no toca el cálculo de racha en absoluto**: el salteo vive en su propia
tabla, `habit_skips` (migración `20260805000000_habit_skips.sql`), separada
a propósito de `habit_completions` —la única que lee
`calcular_racha_habito`— y de `habit_schedule_overrides` —que reprograma un
horario, un concepto distinto de "decidí no hacerlo este día". Una tabla que
la función de racha ni siquiera conoce deja fuera de discusión que saltear
pueda inflarla o desinflarla. `lib/habits/day-status.ts` resuelve los tres
estados de un día —pendiente, cumplido, salteado— en un único lugar
(`resolveHabitDayStatus`), con cumplido ganando si alguna vez coinciden.

**Los salteos quedan fuera de la publicación de tiempo real.** Mismo motivo
que ya tiene `habit_schedule_overrides` (D-A de `design.md` de
`fase-3-habitos`): ninguna otra interfaz se suscribe a esta tabla todavía, y
sumarla ahora sería anticipar un consumidor que no existe. Si otra ronda
necesita que un salteo hecho en una pestaña aparezca sin refrescar en otra,
se agrega entonces, junto con ese consumidor.

**Consecuencia.** `components/calendar/calendar-block-chip.tsx` (la
escalera, el modo apretado, la marca de salteado),
`lib/calendar/screen-blocks.ts` (`habitToCalendarBlock` recibe `skipped`,
`eventToCalendarBlock` recibe `calendarName`, `taskToCalendarBlock` ya
recibía `projectName`), `lib/habits/skips.ts` (`useSkipHabit`,
`useUnskipHabit`, `useHabitSkipsForRange`) y
`components/calendar/screen-calendar.tsx` (arma el menú contextual de cada
tipo de bloque y cablea completar/saltear a sus mutaciones) quedan
actualizados, con sus tests.

---

## D51 — Un hábito sí se puede redimensionar en el calendario; la duración es del hábito entero

**Fecha.** 2026-08-07

**Contexto.** El grupo 1 de `calendario-legible-y-manipulable` (archivado)
había decidido que un bloque de hábito no ofrece manija de redimensionar
porque `habit_schedule_overrides` —la tabla de reprogramación puntual de un
día— no tiene columna de duración, y ofrecer el gesto sin poder persistirlo
sería mentir. Esa razón sigue siendo cierta, pero dejó de ser el único lugar
donde una duración de hábito podría guardarse: `habits.duration_minutes` ya
existe como columna desde la migración `20260729170000_habits.sql`, ya está
tipada en `lib/habits/habit-columns.ts` y ya es parcheable vía `HabitPatch`
en `lib/habits/mutations.ts` — y de hecho ya alimenta el alto visual del
bloque en la grilla (`lib/calendar/screen-blocks.ts`). El dueño pidió
revertir la decisión vieja: *"si les doy doble click debería poder
editarlos"* (sobre abrir el diálogo de edición, cambio relacionado del mismo
pedido) y, sobre redimensionar, que se habilite escribiendo la duración del
hábito completo.

Además, seleccionar un bloque de hábito (clic, Enter o Espacio —
`calendar-block-chip.tsx` ya lo anuncia con `role="button" tabIndex={0}` y
responde a los tres) no abría nada: `handleSelectBlock` en
`screen-calendar.tsx` tenía un `return` vacío para hábito, con el comentario
"sin un detalle propio que abrir todavía desde acá" — un control que se
anuncia accionable pero no hace nada, aunque `HabitFormDialog` ya estaba
montado y cableado (solo lo alcanzaba el menú contextual).

**Decisión.** Dos cambios. Primero: seleccionar un bloque de hábito abre
`HabitFormDialog`, igual que tarea abre su detalle y evento su diálogo de
edición — mismo `handleSelectBlock`, extrayendo el id real del hábito con
`parseHabitBlockId` antes de setear el estado (el id del bloque es
compuesto, `habitId::fecha`). Segundo: la manija de redimensionar se ofrece
también en un hábito; estirarla escribe `habits.duration_minutes` — **afecta
a todas las ocurrencias del hábito, nunca solo al día que se está viendo**.
Es el mismo criterio que ya rige mover un hábito sin horario a la grilla
(fija `habits.scheduled_time` en el hábito entero, no un override): acá no
hay "duración de ese día" que un override pueda dejar intacta, así que no
hay nada que preservar aparte de la duración general.

**Mover y redimensionar quedan separados por el gesto, no por el rango.**
`onMoveBlock` y `onResizeBlock` (props de `CalendarView`) ya eran dos
callbacks distintos — uno cableado al arrastre de `@dnd-kit`
(`handleDragEnd`), el otro al seguimiento nativo de puntero de la manija
propia (`draggable-timed-block.tsx`) — pero `screen-calendar.tsx` los hacía
apuntar a la misma función (`handleMoveOrResize`), que trataba cualquier
cambio de rango de un hábito como una reprogramación puntual del día. Se
separan en `handleMoveBlock` (mover: sigue escribiendo el override del día,
sin cambios) y `handleResizeBlock` (redimensionar: escribe la duración
global), sin adivinar el gesto comparando fechas — la ambigüedad que eso
introduciría es justo lo que la separación de callbacks evita. Para tarea y
evento las dos funciones producen el mismo patch (`taskDragPatch`/
`eventDragChanges` ya derivan todo del rango final, sin distinguir mover de
redimensionar), así que comparten esa cola en una función interna.

**El doble clic no necesitó un mecanismo nuevo.** Con el diálogo abriéndose
al primer clic, existía el riesgo de que el segundo clic de un doble clic
cayera sobre el overlay del diálogo recién abierto y lo cerrara. Se verificó
que tarea y evento ya abren su propio diálogo/detalle al primer clic, con la
misma clase de diálogo controlado por estado (sin `Dialog.Trigger`, así que
Base UI no tiene un "disparador" que excluir de la detección de clic
afuera) y sin ningún guard especial contra un segundo clic — el mismo riesgo,
si existe, ya es preexistente e idéntico para los tres tipos de bloque. No
se inventó nada nuevo para hábito: replicar la wiring existente no agrega
riesgo por encima del que ya había.

**Duración mínima y snap.** Los mismos que ya rigen tarea y evento —
`resizeBlockToPosition` y las constantes de `lib/calendar/drag.ts`
(`SNAP_MINUTES`, `MIN_BLOCK_MINUTES`) — sin lógica propia para hábito: el
`disabled`/la geometría de `draggable-timed-block.tsx` no distinguían tipo,
solo la exclusión explícita que se saca acá.

**Consecuencia.** `components/calendar/screen-calendar.tsx`
(`handleSelectBlock` abre el diálogo; `handleMoveOrResize` se separa en
`handleMoveBlock`/`handleResizeBlock`, con un aviso de `toastSuccess` al
redimensionar un hábito que dice explícitamente que el cambio es del hábito
entero) y `components/calendar/draggable-timed-block.tsx` (la manija ya no
excluye `block.type === "habit"`) quedan actualizados, con test de
interacción (`screen-calendar-habit-interactions.test.tsx`) que cubre clic,
doble clic y el redimensionado. `docs/product-spec.md` queda actualizado
para describir el comportamiento nuevo.

**Tensión que queda para una propuesta aparte.**
`openspec/specs/vista-calendario/spec.md:193` ("Mover y redimensionar se ven
al instante... Eso SHALL valer para las tres pantallas que muestran el
calendario y para los tres tipos de bloque") y `:226-228` ("Un bloque de
hábito SHALL ofrecer editarlo, completarlo y saltearlo ese día. Por **D24**,
mover y redimensionar NUNCA SHALL ser las únicas formas de cambiar el
horario de un bloque") no se tocan en esta tanda — el pedido explícito fue
no editar nada bajo `openspec/specs/`. Con el código ya cambiado, la lectura
de la línea 193 ("los tres tipos de bloque" sí redimensionan) pasa a
describir la realidad, pero la 226-228 nunca listó "redimensionar" entre las
acciones de un bloque de hábito ni mencionó que la duración resultante es
global — queda a resolver con una propuesta de OpenSpec aparte si el spec de
`vista-calendario` necesita una actualización explícita.

---

## D52 — Un hábito pasado se corrige desde el calendario; el mini-mapa sigue de solo lectura

**Fecha.** 2026-08-07

**Contexto.** La guarda original (`assertIsToday`, `lib/habits/mutations.ts`)
solo dejaba marcar o desmarcar el hábito de HOY, reflejando el requirement
"Los días pasados no se pueden corregir" (`openspec/specs/habitos/spec.md`).
Sirvió mientras el único lugar para marcar un hábito era su casillero (Hoy,
`/habitos`), donde "otro día" no tenía sentido. El calendario cambió eso: ya
dibuja una ocurrencia por cada día que el hábito toca, con su propio
casillero (`calendar-block-chip.tsx`) — ver una fila del lunes pasado y no
poder tildarla ahí mismo, con la app mostrando exactamente ese día, se leía
como un límite arbitrario. El dueño pidió levantarlo: *"se puede marcar y
desmarcar cualquier día pasado en que el hábito tocaba. El futuro sigue
prohibido."*

**Decisión.** La guarda pasa de "solo hoy" a "nunca el futuro"
(`assertNotFuture`): cualquier día de hoy hacia atrás en que el hábito toque
según su frecuencia (`isHabitDueOn`) se puede marcar y desmarcar, siempre
desde el calendario. `habits.completed_today` — la marca de HOY que lee el
resto de la app (Hoy, `/habitos`, el badge) — solo se actualiza cuando la
fecha marcada es hoy; una fecha pasada actualiza únicamente la caché por
rango que lee el calendario (`lib/habits/completions.ts`), para no pintar el
hábito de hoy como hecho por corregir un día distinto. No se toca
`calcular_racha_habito`: **D10** ya documenta que la racha se calcula al leer
y tolera explícitamente una corrección retroactiva, así que marcar el lunes
pasado recalcula la racha sola, sin ningún trigger ni columna nueva.

**El mini-mapa de los últimos 14 días (`/habitos`, `habit-mini-map.tsx`)
queda afuera.** Sigue siendo puramente decorativo — sin `<button>`, sin
`onClick`, ni siquiera para el día de hoy —, tal como ya lo describía su
propio comentario. El dueño solo pidió habilitar la corrección en el
calendario; ampliarla al mini-mapa es una superficie distinta (una grilla de
14 celdas en vez de bloques con menú contextual) que no se tocó.

**Consecuencia.** `lib/habits/mutations.ts` (`assertNotFuture` reemplaza a
`assertIsToday`; los `onMutate` de `useMarkHabitDone`/`useUnmarkHabitDone`
dejan de pisar `completed_today` incondicionalmente), `lib/habits/errors.ts`
(mensaje de tres partes renombrado), `lib/habits/completions.ts` (nuevo: la
caché por fecha que le faltaba al calendario para no confundir un día
completado con "todos los días completados") y
`openspec/specs/habitos/spec.md` (el requirement "Los días pasados no se
pueden corregir" pasa a "El futuro no se puede marcar ni corregir", con un
requirement nuevo que deja explícito que la corrección vive en el calendario
y el mini-mapa sigue de solo lectura) quedan actualizados.

---

## D53 — Completar una recurrente antes de vencer corta en el vencimiento, no en hoy

**Fecha.** 2026-08-07

**Contexto.** `lib/recurrence/next.ts` calculaba la siguiente ocurrencia como
la primera de la regla estrictamente posterior a **hoy** (`rule.after(now,
false)`), para las dos anclas. Eso es correcto para una tarea vencida hace
rato, que es el caso que el requirement "Una tarea recurrente vencida no se
adelanta sola" (`openspec/specs/tareas-recurrentes/spec.md`) tenía en mente
al redactarse. Pero para una regla anclada al calendario (`resolveAnchor` →
`"due"`: `BYDAY`/`BYMONTHDAY`/`BYMONTH`, o ancla explícita "vencimiento"),
completada **antes** de que venza — tildar un bloque de un día futuro en el
calendario semanal, o una fila de Próximos —, "la primera ocurrencia
posterior a hoy" resultaba ser la propia fecha de vencimiento: la instancia
nueva nacía con el mismo `due_date` que la recién completada, en vez de
avanzar a la ocurrencia siguiente. Reportado por el dueño como "se duplica
en vez de pasar a la siguiente ocurrencia".

**Decisión.** El corte pasa a ser la primera ocurrencia estrictamente
posterior al **mayor entre hoy y el vencimiento**, solo para ancla `"due"`.
Para ancla `"completion"` el corte sigue siendo `now`, sin cambios: no hay
vencimiento del que protegerse, porque la serie ya cuenta desde el
completado. El requirement "Una tarea recurrente vencida no se adelanta
sola" se actualiza en el spec vivo, en la misma tanda, para decir la regla
completa en vez de solo el caso vencido, con un escenario nuevo que cubre
completar antes de vencer.

**Por qué no se aprovechó para tocar el caso sin fecha.** Una recurrente sin
ningún vencimiento (`dueDate` nulo) sigue anclando en `now` como hasta
ahora — `anchorDate` cae a `now` cuando no hay `dueDate`, así que el corte
también queda en `now`: mismo comportamiento de siempre, sin caso especial
nuevo que mantener.

**Dos defectos secundarios aparecieron al revisar el camino de completar una
recurrente, y se corrigieron en la misma tanda:**

- `lib/recurrence/create-next-occurrence.ts` no copiaba `parent_id`: una
  subtarea recurrente generaba su siguiente instancia en la raíz del
  proyecto en vez de bajo su padre. Se agrega `parent_id` a las columnas
  leídas y al insert.
- `components/calendar/screen-calendar.tsx` (`previewBlocks`) no filtraba
  `task.completed_at`: con la opción "mostrar repeticiones futuras" activa
  (apagada por defecto), una recurrente ya completada seguía emitiendo
  bloques de vista previa. Se agrega el filtro.

**Consecuencia.** `lib/recurrence/next.ts`, `lib/recurrence/create-next-occurrence.ts`,
`components/calendar/screen-calendar.tsx` y
`openspec/specs/tareas-recurrentes/spec.md` quedan actualizados. Tests
nuevos en `lib/recurrence/next.test.ts` y `lib/recurrence/series.test.ts`
cubren completar antes de vencer, con y sin horario; `lib/recurrence/create-next-occurrence.ts`
tiene test propio por primera vez.

---

## D54 — El calendario se desplaza un año hacia cada lado, no infinito, y nunca recuerda dónde quedó

**Fecha.** 2026-08-08

**Contexto.** `calendario-scroll-infinito` reemplaza la navegación por
páginas de día/cuatro días/semana por un desplazamiento horizontal continuo
(`openspec/changes/calendario-scroll-infinito/design.md`). Dos preguntas
quedaban abiertas al proponerlo: hasta dónde llega el desplazamiento antes
de necesitar otra forma de moverse, y si la pantalla debía volver a abrir
donde el usuario la había dejado.

**Decisión — un año para cada lado, no infinito de verdad.** La tira
continua cubre `CONTINUOUS_RANGE_DAYS` (365) días antes y después de hoy —
`TOTAL_CONTINUOUS_DAYS`, 731 columnas en total, `lib/calendar/layout.ts`—,
montando (virtualizando) solo las visibles más un margen de
`COLUMN_VIRTUALIZATION_MARGIN_DAYS` (siete días, una semana) a cada lado,
`components/calendar/grid-metrics.ts`. Ir más lejos de un año no está
resuelto por esta tanda —no hay todavía un selector de fecha en
`CalendarNav`—, queda para cuando alguien lo pida de verdad.

*Por qué no infinito de verdad.* Un desplazamiento sin límite obliga a
reposicionar `scrollLeft` cerca de los extremos para no acumular contenido
sin fin, y eso pelea con la inercia táctil (el gesto "salta" en medio del
deslizamiento) y le saca a la barra de desplazamiento cualquier significado
honesto. Un año de cada lado es más de lo que cualquiera recorre arrastrando
con el dedo, y el límite es indoloro: nadie necesita desplazarse un año
entero a mano para llegar a algún lado.

*El margen de virtualización se midió, no se adivinó (tarea 4.2).* Antes de
fijar el número se montó `TimeGrid` con columnas **llenas** de bloques (15
por día, no vacías) y se cronometró el render de 7 a 31 columnas a la vez:
el costo por columna resultó chico frente al costo fijo de montar la
grilla (de 7 a 31 columnas el tiempo total creció apenas ~1.7x), así que una
semana de margen a cada lado —el peor caso, formato semana, monta 21
columnas a la vez— queda lejos de cualquier costo notorio.

**Decisión — la posición del desplazamiento no se persiste.** Al entrar a
cualquier pantalla con calendario, hoy queda como primera columna visible,
sin importar dónde había quedado la última vez (`components/calendar/screen-calendar.tsx`,
el estado del desplazamiento arranca en `null` y nunca se guarda en
`view_preferences` ni en ningún otro lado).

*Por qué.* Volver a una pantalla y encontrarla en una semana de hace un mes
es desconcertante, y el caso frecuente es mirar lo que viene — el mismo
motivo por el que ya no se persistía antes con la navegación por páginas.
Guardar la posición hubiera significado agregar una columna nueva o un
campo a `view_preferences` solo para un caso de uso que nadie pidió.

**De paso, la barra de desplazamiento horizontal queda oculta** (tarea 9.1,
pregunta abierta del `design.md`): con un año de ancho, el pulgar de una
barra nativa sería minúsculo y sin ninguna marca de semana o mes — más
ruido que referencia. El gesto de arrastrar/deslizar queda como único medio
para moverse dentro del año (`className="no-scrollbar"`, ya usado en
`components/ui/command.tsx`).

**Consecuencia.** `lib/calendar/layout.ts` (`TOTAL_CONTINUOUS_DAYS`,
`dayOffsetFromToday`, `dateAtOffsetFromToday`, `continuousColumnIndex`),
`components/calendar/grid-metrics.ts` (`COLUMN_VIRTUALIZATION_MARGIN_DAYS`),
`components/calendar/use-continuous-scroll.ts` (nuevo) y
`components/calendar/time-grid.tsx` quedan actualizados. Los datos por rango
(`useCalendarRangeEvents`, `useHabitScheduleOverridesForRange`,
`useHabitSkipsForRange`, `useHabitCompletionsForRange`) pasan a pedirse por
trozos de semana ISO con dos semanas de margen (`lib/dates/data-window.ts`),
para que correrse un día no vuelva a pedir lo ya cargado.

---

## D55 — `position: sticky; left: 0` no pega un ítem de CSS Grid en una grilla que se desplaza de verdad

**Fecha.** 2026-08-08

**Contexto.** El esqueleto de dos ejes de `calendario-scroll-infinito`
(`design.md`, decisión 1) asumía que `position: sticky` bastaba para fijar
la columna de horas, la esquina superior izquierda y el hueco de la fila de
todo el día mientras la grilla se desplaza horizontalmente — la tarea 1.2
ya había probado que el pegado convivía con el `transform` del overlay de
arrastre, y quedó por escrito como el supuesto verificado que sostenía todo
el diseño. Ese supuesto nunca se puso a prueba de verdad: hasta el bloque 4,
`columnWidthPx` se calculaba para que las columnas visibles llenaran
exactamente el ancho del contenedor, así que `scrollLeft` era siempre 0 —
no había desplazamiento horizontal real con el que `sticky` pudiera fallar.

Recién al verificar los bloques 4 a 6 en el navegador (no en jsdom, que no
hace layout) apareció el defecto: con el desplazamiento continuo de verdad
(731 columnas), la columna de horas dejaba de mostrar cualquier hora al
correrse — el texto seguía en el DOM (confirmado con el árbol de
accesibilidad) pero se pintaba a cientos de miles de píxeles fuera de
pantalla.

**Causa.** `position: sticky; left: 0` en un ítem de CSS Grid ubicado en
una sola columna (`grid-column: 1`, sin abarcar más) queda contenido a su
propia área de grilla para el cálculo de sticky — y esa área es tan angosta
como el propio ítem. Reproducido en un caso mínimo, aislado de Trazio
(una grilla de una sola fila con una columna angosta fija y cientos de
columnas anchas alrededor, sin ningún código de este proyecto): el ítem
sticky se mueve exactamente como si no tuviera `position: sticky`, en
cualquier magnitud de desplazamiento, incluso chica (probado con apenas 10
columnas). Ampliar el área de grilla del ítem a todas las columnas
(`grid-column: 1 / -1`) tampoco lo arregla. `position: sticky; top: 0` para
el eje vertical, en cambio, funciona sin problema — el defecto es específico
del eje que se desplaza de verdad.

**Decisión.** Las tres piezas fijas de la izquierda (esquina, columna de
horas, hueco de la fila de todo el día) dejan de depender de
`position: sticky` para el eje horizontal. Cada una queda marcada con
`data-gutter-cell`, y un único `useEffect` en `TimeGrid`
(`components/calendar/time-grid.tsx`) escucha el `scroll` del contenedor y
aplica `transform: translateX(scrollLeft)` a las tres a mano, en cada
evento — el mismo resultado visual que el pegado prometía, calculado a
mano porque el navegador no lo hace bien acá. El eje vertical
(`position: sticky; top: 0`) no se toca: sigue funcionando.

**Por qué no separar la columna de horas en su propio contenedor con
scroll.** Es exactamente la alternativa que `design.md` descartó en la
decisión 1 (sincronizar `scrollLeft` a mano entre dos contenedores, fuente
clásica de temblor). El arreglo elegido sigue usando un único contenedor
con desplazamiento — solo cambia CÓMO se fija la pieza que no se mueve, de
CSS puro a un `transform` calculado en cada evento de scroll, que es barato
(el navegador ya optimiza `transform` para composición, sin relayout).

**Consecuencia.** `components/calendar/time-grid.tsx` y
`components/calendar/all-day-row.tsx` quedan actualizados. Sin test nuevo
dedicado (jsdom no hace layout real, así que no puede reproducir ni el
defecto ni el arreglo); la cobertura de esto es la verificación manual en
el navegador de esta misma tanda. Si `position: sticky` alguna vez empieza
a funcionar correctamente para este caso en los navegadores soportados, el
`transform` a mano se puede volver a sacar sin que nada más dependa de él.

---

## D56 — El badge deja de contar recordatorios; el título del documento existe porque el badge no se pinta en Linux

**Fecha.** 2026-08-08

**Contexto.** El badge del ícono contaba filas de `reminders` de hoy sin entregar
más hábitos pendientes, en vez de tareas más hábitos: quien tenía ocho tareas
para hoy y ningún recordatorio configurado veía en el ícono solo el número de
sus hábitos, un número distinto del contador de Hoy del panel lateral para la
misma pregunta ("cuánto me queda hoy"). Además, verificado contra la
documentación de Chrome y de MDN, la API de badging está disponible en
Chromium sobre Linux pero el sistema no pinta el badge — solo se muestra en
Windows y macOS con la PWA instalada. El indicador no existía de hecho en la
máquina de quien más lo usa.

**Decisión.** El badge pasa a contar lo mismo que `getTodayTaskCount`
(`lib/tasks/today-count.ts`): tareas sin completar que vencen hoy o están
atrasadas, más hábitos pendientes de hoy. Deja de contar recordatorios —
reemplazo, no suma, porque un recordatorio es casi siempre sobre una tarea que
ya entra en el conteo y sumarlo la contaría dos veces. `document.title` lleva
el mismo número antepuesto entre paréntesis (`(8) Trazio`), reaplicado después
de cada cambio de ruta porque el `metadata` del App Router reescribe el título
al navegar y se lo lleva puesto: es la única de las dos superficies que
funciona en Linux, sin instalar la PWA y en cualquier navegador.

**Consecuencia.** `lib/reminders/use-app-badge.ts` se elimina. El criterio de
"atrasada o vence hoy" se extrajo a `dueTodayOrOverdueFilter`
(`lib/tasks/hoy-filter.ts`), la misma función que ya usa la vista Hoy, para
que el panel lateral (`lib/tasks/today-count.ts`) y el nuevo módulo del
cliente (`lib/pending-count/pending-today-count.ts`) nunca diverjan. El hook
que sincroniza badge y título (`lib/pending-count/use-pending-today-sync.ts`)
vive en un módulo propio, no en `lib/reminders/`, porque después de este
cambio no toca la tabla `reminders`. `components/settings/app-badge-sync.tsx`
sigue montado donde estaba.

## D57 — Un recordatorio de hábito se evalúa al enviar, nunca se materializa por adelantado

**Fecha.** 2026-08-08

**Contexto.** Una tarea es una fila con un `due_at` concreto: se puede calcular
su `remind_at` una vez y guardarlo. Un hábito no es una fila por día, es una
regla (`frequency_type`, `scheduled_time` opcional) con las excepciones —
completado, salteado, reprogramado— viviendo en tres tablas laterales que
pueden cambiar en cualquier momento, incluso un minuto antes del aviso. La
alternativa evidente, materializar las ocurrencias de los próximos días en
una tabla propia (como ya hace `reminders` con `remind_at`), fue la primera
opción evaluada porque reusa el cron existente sin cambios.

**Decisión.** No se generan filas de recordatorio futuras. `claim_due_habit_reminders`
corre cada minuto y evalúa, contra el estado *actual* de `habits`,
`habit_schedule_overrides`, `habit_skips` y `habit_completions`, qué avisos
están vencidos en ese instante. Se descarta materializar porque convierte
cada excepción en una invalidación: saltear, marcar, reprogramar, archivar,
editar la frecuencia o la hora, cambiar la zona horaria de la cuenta — cada
uno pasaría a exigir un trigger que reescriba filas ya generadas, y el que se
olvide se manifiesta como una notificación de un hábito que ya se hizo, el
peor modo de falla posible para esta función porque enseña a ignorar los
avisos.

**Consecuencia.** Ninguna acción sobre un hábito necesita tocar una tabla de
recordatorios para cancelar o correr su aviso: completar, saltear, reprogramar
o archivar ya escriben donde siempre escribieron, y el próximo minuto del cron
ve el estado nuevo. El costo es una consulta más cara por minuto (un join
sobre hábitos activos con recordatorios) y la regla de "pendiente" escrita en
SQL además de en TypeScript (`lib/habits/pending-today.ts`), con comentarios
cruzados en los dos lados y una batería de tests de casos borde
(`supabase/tests/habit-reminders-claim.test.ts`) como red si alguna vez se
separan.

## D58 — La ventana de gracia de un recordatorio de hábito lleva cota inferior; la de tarea no

**Fecha.** 2026-08-08

**Contexto.** `claim_due_reminders` (tareas) reclama todo lo vencido con
`remind_at <= now()`, sin piso: un recordatorio de hace tres días se dispara
apenas el cron vuelve de una caída, porque cada recordatorio es una fila que
existe desde que se creó — "vencido hace tres días" es una sola fila vieja.
Copiar ese mismo criterio para hábitos sería grave por la razón opuesta de
D57: como una ocurrencia se calcula al vuelo contra la regla, sin cota
inferior la primera corrida después de este despliegue encontraría vencidas
*todas* las ocurrencias pasadas de *todos* los hábitos con recordatorio
configurado, y las mandaría juntas de una.

**Decisión.** `claim_due_habit_reminders` acota el intervalo a
`momento <= at and momento > at - interval '15 minutes'`. Quince minutos
porque el cron corre cada minuto: tolera una caída real del cron o de la edge
function sin perder el aviso, y un aviso quince minutos tarde todavía sirve.
Más viejo que eso se descarta en silencio, coherente con lo que D7 ya manda
para tareas ("si no llegó a tiempo, no se reintenta").

**Consecuencia.** Una caída de más de quince minutos pierde los avisos de esa
ventana — aceptado, es preferible a una andanada de notificaciones viejas
apenas el sistema vuelve. El número (15) es elegido, no medido: revisarlo
después de la primera semana en producción con un dispositivo real es la
pregunta abierta que quedó en `design.md` de `recordatorios-de-habitos`.

## D59 — "Sin compartir" se acota: se publica una vista de solo lectura, sin cuentas invitadas

**Fecha.** 2026-08-09

**Contexto.** `docs/product-spec.md` §13 decía, sin matices, "sin equipos,
compartir, invitar ni asignar" — la misma decisión que sostiene que Trazio es
de una persona por cuenta y que ninguna fila necesita más política de RLS que
`auth.uid() = user_id`. `enlace-de-lectura-de-un-proyecto` pide mostrar un
proyecto a alguien sin cuenta, y en una primera lectura eso suena a violar esa
decisión.

**Decisión.** No la viola: se acota. Compartir, en el sentido que `docs/product-spec.md`
§13 prohibía, es que **otra cuenta** edite, comente o reciba una tarea
asignada — eso sigue sin existir, y este cambio no crea ningún camino hacia
ahí. Lo que se agrega es distinto en naturaleza: un enlace de lectura
resuelto por un token de 256 bits (`get_shared_project`,
20260809030000_get_shared_project.sql), consumido por el rol `anon` —no por
otra cuenta autenticada—, que nunca puede escribir nada. No hay invitación,
no hay una segunda cuenta viendo las filas de la primera a través de RLS, no
hay asignación. Es la misma diferencia que ya existía entre "ver una
captura de pantalla" y "tener acceso a la cuenta": esto es una captura de
pantalla que se actualiza sola, con un botón para apagarla.

**Consecuencia.** `docs/product-spec.md` §13 y la lista de "Fuera de alcance"
de este mismo cambio (`proposal.md`) quedan explícitas: equipos, invitar,
asignar y editar ajeno siguen fuera; enlace de lectura no. Cualquier
propuesta futura que empiece a acercarse a "otra cuenta con permisos sobre
tus filas" tiene que pasar por esta misma pregunta — y, salvo que también se
acote con la misma precisión, la respuesta sigue siendo no.

## D60 — "Sin exportar ni importar" se acota: copiar un proyecto como markdown al portapapeles no es exportar

**Fecha.** 2026-08-09

**Contexto.** `docs/product-spec.md` §13 dice, sin matices, "sin exportar ni
importar datos, en ninguna versión" (D3). `copiar-un-proyecto-como-markdown`
pide poder copiar un proyecto entero al portapapeles como texto, y en una
primera lectura eso suena a violar esa decisión.

**Decisión.** No la viola: se acota. Exportar, en el sentido que D3 prohibía,
es un **ciclo de portabilidad**: un archivo de respaldo, un formato
versionado que hay que sostener con sus propias migraciones, y un camino de
vuelta —un importador— que reconstruye la cuenta desde ese archivo. Eso es lo
que arrastra superficie de mantenimiento real. Copiar un proyecto como
markdown al portapapeles no es eso: no hay archivo, no hay formato
versionado, no hay camino de vuelta, no reconstruye nada. Es la misma acción
que ya existe en una tarea con "copiar enlace directo", con el contenido en
vez de la URL.

**Consecuencia.** Sigue sin haber exportación de la cuenta, descarga de
archivos, importador ni formato de intercambio. Cualquier propuesta futura
que se acerque a "un archivo que se puede volver a cargar" tiene que pasar
por esta misma pregunta — y, salvo que también se acote con la misma
precisión, la respuesta sigue siendo no. Esto tampoco es la revisión que la
nota de D3 dejó pendiente "para poder revisarlo más adelante con la
información a la vista": el derecho de acceso de la Ley 25.326 y la
migración desde otra herramienta siguen sin estar cubiertos.

## D61 — La carga del día deja de ser un número mudo: compara contra el tiempo libre real

**Fecha.** 2026-08-09

**Contexto.** `openspec/specs/carga-del-dia/spec.md` ("El total no juzga") y
`docs/product-spec.md` §3 "Hoy" dicen, sin matices, que el total planificado
"no juzga: sin color de alerta ni comparación contra el tiempo disponible".
Esa decisión nació para que Trazio no se convirtiera en un capataz —
`.claude/rules/copy.md` es explícito: "la app organiza, no arenga". Pero
"5h 20m planificadas" es un número que no dice nada por sí solo: nadie sabe,
mirándolo, si le sobra el día o si ya lo tiene lleno. Para saberlo hay que
restar contra algo, y esa resta es exactamente el dato que la decisión
original prohibía mostrar.

**Decisión.** Se revisa, de forma acotada: el total pasa a compararse contra
el tiempo libre real del día — "te quedan 3h 40m libres y 2h 15m de tareas
sin agendar" — y a avisar cuando lo pedido no entra en lo disponible. Lo que
no se revisa es lo que sostenía la decisión original: **la app sigue sin
juzgar**. No hay opinión sobre la persona, hay aritmética sobre datos que
ella misma cargó. Decir "pediste más horas de las que tenés" no evalúa una
decisión suya — evalúa una resta. Siguen sin existir puntajes, rachas de
productividad, felicitaciones ni ningún tratamiento visual de alarma
("¡Cuidado! Tu día está sobrecargado" queda tan afuera como antes). Y sigue
sin bloquear ni impedir nada: si algo no entra, se agenda igual, porque el
número describe, no vigila.

Junto con esto se agrega "¿Qué hago ahora?", una acción que mira el hueco
hasta el próximo bloque agendado y propone una sola tarea que entre ahí. Usa
la misma primitiva de tiempo que el total: sin ella, no hay con qué medir el
hueco.

El modelo de tiempo que hace posible esta resta queda fijado así, y no se
vuelve a proponer nada distinto sin pasar por esta misma decisión:

- **El calendario es la única fuente de verdad sobre ocupación.** Lo que
  está agendado ocupa; lo que no, no.
- **Tiempo comprometido** = eventos de Google Calendar + tareas y hábitos
  que tienen hora asignada (todo lo que es un bloque en el calendario).
- **Pedido sin lugar** = tareas y hábitos con duración estimada pero sin
  hora.
- **Tiempo libre** = lo que queda del día menos lo comprometido.
- **Una sola preferencia nueva:** a qué hora termina el día, en
  Configuración, con 22:00 de default.
- **No se modela horario laboral ni franjas de disponibilidad.** Se
  evaluaron y se rechazaron explícitamente: el dueño usa Trazio para todo
  —personal y laboral mezclado, con tareas agendadas a las 12:15 y a las
  13:00, adentro de su propia jornada— y una franja de "horario laboral"
  no describiría su día, lo falsearía. La única fuente de ocupación sigue
  siendo lo que el calendario dice que está ocupado, nunca una regla
  aparte sobre qué horas "cuentan".

**Consecuencia.** El número vale lo que valga el calendario del usuario: si
copia algunas reuniones a Google Calendar y otras no, el tiempo libre se va
a sobrestimar. Se acepta porque el error es visible y se autocorrige — la
persona ve "3h libres" un día que sabe que está tapado, agrega el bloque que
faltaba, y la próxima vez el número acierta. No es un costo que se pague en
silencio: es el mismo trato que ya existía entre "el dato es tan bueno como
lo que cargaste" y "el dato es exacto porque lo medimos nosotros", y Trazio
elige lo primero en todos lados, no solo acá. Cualquier propuesta futura que
se acerque a "horario laboral", "franja de disponibilidad" o "capacidad
configurable por persona" tiene que volver a esta pregunta — y, mientras el
uso real siga siendo el mismo (todo mezclado, sin franjas), la respuesta
sigue siendo no.

## D62 — La racha deja de ser la única métrica de un hábito; se suman constancia y repeticiones

**Fecha.** 2026-08-09

**Contexto.** El pedido original fue agregar contenido explicativo sobre "los
21 días para formar un hábito" — una cifra que viene de *Psycho-Cybernetics*
(1960) de Maxwell Maltz, una observación clínica sobre pacientes de cirugía
plástica, no investigación sobre hábitos. Agregar un párrafo motivacional
además violaría `.claude/rules/copy.md` ("la app organiza, no arenga"). Por
otro lado, la única métrica que hoy tiene un hábito —la racha— es dura de una
forma que no refleja la evidencia real: Lally, van Jaarsveld, Potts & Wardle
(2010), siguiendo 96 personas formando un hábito diario real, encontraron una
mediana de 66 días hasta la automaticidad (rango de 18 a 254) y que fallar un
día no afecta materialmente el proceso. Una racha diaria, en cambio, vuelve a
0 con el primer día sin marcar.

**Decisión.** Se usa la evidencia para cambiar la mecánica, no para agregar
texto. La racha se mantiene sin cambios (sigue rigiendo D50). Se suman dos
métricas nuevas, calculadas al leer y nunca guardadas —mismo criterio que D10
ya exige para la racha—: **constancia**, la proporción de días cumplidos
sobre los días que tocaban en una ventana de 30 días (o menos si el hábito es
más joven), donde un día salteado sale del denominador sin contar ni a favor
ni en contra; y un **contador de repeticiones**, el total histórico de
`habit_completions`, sin ventana ni tope. Se suma además una única línea de
texto, al pie de `/habitos`, con la referencia a Lally et al. (2010) y su
rango real — nunca repetida por tarjeta, nunca acompañada de un gráfico,
puntaje, insignia o nivel.

**Consecuencia.** `pantalla-habitos` queda con dos requirements nuevos y uno
modificado (`openspec/changes/metricas-de-habitos/`). Ninguna tabla ni
columna nueva. Cualquier propuesta futura que quiera "medir el progreso" de
un hábito tiene que pasar por la misma pregunta que esta decisión ya
resolvió: ¿es un número que informa, o un puntaje que evalúa a la persona?
Insignias, niveles y comparación entre personas siguen fuera de alcance.
