# Trazio — Términos de servicio y política de privacidad (borrador)

> **Esto es un borrador técnico, no un texto legal.** Lo escribió un agente a
> partir del código y los documentos del producto, no un abogado, y nadie con
> formación legal lo revisó todavía. No lo publiques tal cual. Sirve como base
> precisa de **qué hace el sistema con los datos** — la parte que solo se puede
> escribir conociendo el código — para que el dueño del proyecto lo revise,
> corrija y complete con asesoramiento legal antes de que se muestre a un
> usuario real. La sección final, "Qué le falta decidir al dueño", enumera lo
> que este borrador deja abierto a propósito.

---

## Términos de servicio

### Qué es Trazio

Trazio es un gestor de tareas personal. Cada cuenta es de una sola persona:
no hay equipos, no hay forma de compartir un proyecto ni de asignarle una
tarea a otra persona. Lo que ves en tu cuenta es tuyo y solo tuyo.

### El servicio es gratuito

Hoy Trazio no tiene plan pago ni versión paga. Usarlo no cuesta nada. Esto
puede cambiar en el futuro, pero mientras no haya un modelo de precios
definido, no corresponde decir nada más específico que esto: es gratis, sin
condiciones ocultas y sin fecha de vencimiento anunciada.

### Necesitás conexión a internet

Trazio funciona enteramente online. No hay una versión que guarde cambios sin
conexión para sincronizarlos después: si no tenés internet, la app te lo dice
y no te deja escribir. No es una limitación temporal — es como está construida
a propósito, para no arriesgarse a perder algo que escribiste offline y que
nunca llegó a guardarse.

### El contenido es tuyo

Los proyectos, tareas, descripciones y etiquetas que creás en Trazio son tuyos.
Los usamos únicamente para darte el servicio: mostrártelos, ordenarlos,
avisarte cuando corresponda. No los usamos para nada más.

### Límites de responsabilidad

Antes de volcar ahí algo importante, conviene que sepas esto:

- **Es un producto joven.** Puede tener errores, cambios de comportamiento
  entre versiones, y funcionalidad que todavía no existe.
- **No garantizamos disponibilidad continua.** Puede haber cortes,
  mantenimiento o interrupciones, sobre todo en esta etapa.
- **No hay forma de exportar tus datos.** Si en algún momento querés dejar de
  usar Trazio, hoy no existe un botón que te dé una copia de lo que cargaste.
  Es una decisión tomada (no un olvido) y la explicamos con más detalle en la
  política de privacidad, más abajo.

Nada de esto es una forma elegante de decir que no nos importa: es preferible
que lo sepas antes de depender de la app para algo crítico, y no después.

---

## Política de privacidad

### Qué datos recogemos

Recogemos solamente lo necesario para que la app funcione. Tabla por tabla,
esto es lo que guardamos:

| Qué | Dónde vive | Qué incluye |
| --- | --- | --- |
| Tu cuenta | Autenticación de Supabase | Tu correo electrónico y tu contraseña (si te registrás con contraseña) o los datos básicos que te identifican si entrás con Google. |
| Tu perfil | Tabla `profiles` | Tu nombre completo, y una foto de perfil si en algún momento cargás una. |
| Tus preferencias | Tabla `user_preferences` | Zona horaria, tema claro u oscuro, formato de fecha y hora, en qué día empieza tu semana, y tu pantalla y proyecto por defecto al entrar. |
| Tus proyectos | Tabla `projects` | Nombre, color, ícono, descripción, y si están archivados o marcados como favoritos. |
| Tus secciones | Tabla `sections` | El nombre de las secciones dentro de cada proyecto. |
| Tus tareas | Tabla `tasks` | Título, descripción (con el formato que le des), prioridad, fecha y hora de vencimiento, duración estimada, fecha tope, si está completada y cuándo, y la regla de repetición si la tarea se repite. |
| Tus etiquetas | Tablas `labels` y `task_labels` | El nombre y color de cada etiqueta que creás, y qué tareas tienen cada una. |

No guardamos nada más que esto. Si en el futuro Trazio agrega funciones nuevas
que impliquen guardar otro tipo de dato —comentarios en las tareas,
recordatorios push, hábitos, conexión con Google Calendar— esta política
tiene que actualizarse antes de que esas funciones se activen, no después.

### Qué NO recogemos

Esto también vale la pena decirlo, porque en Trazio es bastante:

- **No hay analítica de comportamiento dentro de la app.** No medimos qué
  pantallas visitás, cuánto tiempo pasás en cada una, ni con qué frecuencia
  usás cada función.
- **No hay publicidad.** No mostramos avisos ni los preparamos para mostrar.
- **No hay perfilado.** No construimos un perfil tuyo para predecir tu
  comportamiento ni para ningún otro fin.
- **No vendemos tus datos.** A nadie, nunca.
- **No hay adjuntos.** El producto no permite subir archivos a una tarea ni a
  un comentario, así que no hay imágenes, documentos ni archivos tuyos
  guardados en ningún lado.

### Con quién compartimos datos, y para qué

Trazio no funciona solo: usa servicios de terceros para partes puntuales del
sistema. Ninguno de ellos usa tus datos para su propio beneficio comercial más
allá de prestarnos el servicio que contratamos.

| Servicio | Para qué lo usamos |
| --- | --- |
| **Supabase** | Aloja la base de datos donde vive todo lo de la tabla anterior, y gestiona el inicio de sesión (contraseñas y, si elegís esa opción, el login con Google). |
| **Resend** | Envía los correos de confirmación de cuenta y de recuperación de contraseña. No envía nada más. |
| **Vercel** | Aloja la aplicación web en sí — el código que se ejecuta cuando entrás a Trazio. |
| **Google** | Solo interviene si vos elegís entrar con tu cuenta de Google. Si no usás esa opción, Google no recibe ningún dato tuyo de parte de Trazio. |

**Dónde están tus datos.** La base de datos vive en un proyecto de Supabase
alojado en São Paulo, Brasil (región `sa-east-1`). Si estás en Argentina, esto
significa que tus datos cruzan la frontera para guardarse: es una
transferencia internacional de datos, y la política final tiene que decirlo
en esos términos.

### La analítica de la landing es otra cosa

La página pública de Trazio (la que ves antes de crear una cuenta) mide
cuatro cosas, y nada más: visitas a la página, clics en el botón principal,
interacciones con la demo del parser, y cuántos registros se completan. Esto
sirve para saber si la landing funciona, no para conocerte a vos. Es
información agregada de la página pública y no tiene relación con lo que
hacés dentro de la app una vez que tenés cuenta.

### Cuánto conservamos tus datos, y cómo se borran

Guardamos tus datos mientras tu cuenta exista. No hay un límite de tiempo
después del cual algo se borra solo.

El borrado es físico, no hay papelera ni "recuperar lo eliminado":

- **Borrar un proyecto** borra en cascada sus secciones y sus tareas. Es
  irreversible desde el momento en que lo confirmás.
- **Borrar una sección** no borra sus tareas: quedan sin sección, dentro del
  mismo proyecto.
- **Borrar una etiqueta** la quita de todas las tareas que la tenían.
- **Borrar tu cuenta** borra todo lo asociado a ella: perfil, preferencias,
  proyectos, secciones, tareas y etiquetas. No queda nada guardado del lado
  nuestro.

### Cada cuenta ve solo lo suyo

El aislamiento entre cuentas no depende únicamente de que la interfaz te
muestre solo tus cosas: está garantizado en la base de datos, con políticas
de seguridad a nivel de fila (row level security) que aplican en cada
consulta, sin excepción. Ni siquiera un error en la interfaz podría mostrarte
datos de otra cuenta, porque la base de datos misma los bloquea antes de que
lleguen.

---

### ⚠ Punto pendiente: derecho de acceso (Ley 25.326)

La Ley 25.326 de protección de datos personales de Argentina le reconoce a
cada titular el derecho de acceder a sus propios datos personales. Trazio
tomó la decisión de no incluir exportación de datos en ninguna versión (ver
`docs/decisions.md`, decisión D3) — y esa decisión se tomó **a pesar de** que
se recomendó lo contrario justamente por este motivo.

Hoy no existe ninguna forma automática de entregarle a una persona una copia
de sus datos. Si alguien lo pide, no hay un botón ni un proceso ya armado
para responder.

Este borrador no resuelve esta tensión ni promete algo que el producto no
hace. Queda marcado acá para que el dueño del proyecto decida cómo se
responde: si se arma un proceso manual para pedidos de acceso, si se
reconsidera la decisión D3, o si se asume el riesgo de forma consciente.

---

## Qué le falta decidir al dueño antes de publicar

Este documento no se publica tal cual. Antes de publicarlo hace falta que
alguien con criterio legal (el dueño del proyecto, o un abogado) resuelva lo
siguiente:

- **Derecho de acceso de la Ley 25.326** — ver el recuadro de arriba. Es el
  punto más urgente porque hoy no hay respuesta.
- **Si hace falta designar un responsable de datos** (o figura equivalente)
  ante la Agencia de Acceso a la Información Pública, y quién lo es.
- **Jurisdicción aplicable** en caso de conflicto — este borrador no fija
  ninguna.
- **Un correo de contacto para consultas de privacidad.** Hoy no existe
  ninguna dirección publicada para que alguien pregunte por sus datos, pida
  que se borren, o haga un reclamo. Hace falta crear una y ponerla acá antes
  de publicar.
