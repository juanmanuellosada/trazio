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
