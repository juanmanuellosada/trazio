# Configurar Google Calendar — paso a paso

Necesario **solo para la fase 4**. No hace falta tocar nada de esto antes.

Este documento existe porque las credenciales de Google no se pueden generar por
código: hay que crearlas a mano en la consola de Google Cloud. El agente guía, la
persona hace clic.

> Las pantallas de Google Cloud cambian seguido. Si algo no está donde dice acá,
> buscar por el nombre de la sección en el buscador de la consola. Los conceptos
> —proyecto, API habilitada, pantalla de consentimiento, credenciales OAuth— no
> cambian.

---

## Qué vamos a obtener

Tres valores de la consola de Google que terminan en variables de entorno:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

Más una cuarta variable que no sale de Google: la clave con la que se cifra el
refresh token antes de guardarlo. Se genera en la propia máquina — ver el paso 5.

---

## Paso 1 — Crear el proyecto

1. Entrar a https://console.cloud.google.com
2. Arriba a la izquierda, en el selector de proyectos, elegir **Proyecto nuevo**.
3. Nombre: `Trazio`. Sin organización.
4. Crear y esperar unos segundos a que quede seleccionado.

**Verificación:** el selector de arriba dice "Trazio".

---

## Paso 2 — Habilitar la API de Google Calendar

1. Menú lateral → **APIs y servicios** → **Biblioteca**.
2. Buscar "Google Calendar API".
3. Entrar y presionar **Habilitar**.

**Verificación:** el botón ahora dice "Administrar" en vez de "Habilitar".

---

## Paso 3 — Pantalla de consentimiento

Es lo que ve el usuario cuando le pedimos permiso.

1. **APIs y servicios** → **Pantalla de consentimiento de OAuth**.
2. Tipo de usuario: **Externo**. (Interno solo sirve con Google Workspace.)
3. Completar:
   - Nombre de la aplicación: `Trazio`
   - Correo de asistencia: tu correo
   - Logo: opcional, se puede dejar vacío por ahora
   - Dominio de la aplicación: la URL de Vercel
   - Correo de contacto del desarrollador: tu correo
4. Guardar y continuar.

### Permisos (scopes)

En la pantalla de permisos, agregar exactamente este:

```
https://www.googleapis.com/auth/calendar
```

Es el scope de acceso total a Google Calendar: leer y escribir eventos, y también
crear, renombrar, recolorear y eliminar calendarios enteros.

**Esto es a propósito, no un descuido.** La fase 4 implementa el ABM completo de
calendarios, y eso no lo permiten los scopes acotados (`calendar.events` para
eventos, `calendar.calendarlist.readonly` para solo listar) — ninguno de los dos
alcanza para crear o borrar un calendario. Pedir el scope amplio es la decisión
correcta para lo que hace falta, con un costo conocido: la revisión de Google es
más pesada que con permisos acotados y puede llevar semanas en vez de días. Ver
"Publicar la app" al final de este documento para cómo se gestiona ese costo.

### Usuarios de prueba

Mientras la app esté en modo "Prueba", solo pueden conectarse las cuentas que
figuren acá. Agregar tu propio correo de Google.

**Verificación:** tu correo aparece en la lista de usuarios de prueba.

---

## Paso 4 — Crear las credenciales

1. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de
   cliente de OAuth**.
2. Tipo de aplicación: **Aplicación web**.
3. Nombre: `Trazio Web`.
4. **Orígenes autorizados de JavaScript:**
   ```
   http://localhost:3000
   https://TU-APP.vercel.app
   ```
5. **URIs de redireccionamiento autorizados:**
   ```
   http://localhost:3000/api/auth/google/callback
   https://TU-APP.vercel.app/api/auth/google/callback
   ```
6. Crear.

Google muestra el **ID de cliente** y el **secreto de cliente**. El secreto se puede
volver a ver después, pero conviene copiarlo ahora.

**Verificación:** tenés dos cadenas, una terminada en
`.apps.googleusercontent.com` y otra que empieza con `GOCSPX-`.

---

## Paso 5 — Cargar las variables

Además de las tres de Google, hace falta la clave de cifrado del refresh token
(decisión D-A de `openspec/changes/fase-4-calendario/design.md`). Se genera una
vez, con 32 bytes al azar en base64:

```
openssl rand -base64 32
```

En `.env.local` para desarrollo:

```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY=xxxxx
```

En Vercel → Settings → Environment Variables, las mismas cuatro, con la URL de
producción en el redirect. La clave de cifrado puede generarse una vez por
entorno (desarrollo y producción no comparten conexiones guardadas).

> El secreto de cliente y la clave de cifrado **nunca** van en una variable
> `NEXT_PUBLIC_*`. Se usan solo del lado servidor. Si la clave de cifrado se
> pierde, no hay forma de recuperar los refresh tokens ya guardados: cada usuario
> tiene que reconectar su calendario.

---

## Paso 6 — Probar

1. `pnpm dev`
2. Ir a Configuración → Calendarios → Conectar Google Calendar.
3. Debería abrirse la pantalla de Google pidiendo permiso, mostrando el nombre
   "Trazio" y el permiso de acceso total a Google Calendar.
4. Aceptar. Vuelve a la app con la conexión activa.

### Si algo falla

| Error | Causa habitual |
| --- | --- |
| `redirect_uri_mismatch` | La URI del código y la de la consola no coinciden **exactamente**. Revisar barra final, http vs https, puerto. |
| `access_blocked` | Tu correo no está en usuarios de prueba, o la app está en producción sin verificar. |
| `invalid_client` | El ID o el secreto están mal copiados, o falta cargar la variable. |
| Token vencido a los 7 días | Normal en modo "Prueba": Google caduca los refresh tokens a los siete días. Se resuelve publicando la app. |

---

## Notas para la implementación

- Pedir `access_type=offline` y `prompt=consent` en la primera autorización, o
  Google no devuelve refresh token.
- El **refresh token se guarda cifrado** en `calendar_connections`, del lado
  servidor. Nunca llega al navegador.
- Cuando el refresh falla, marcar la conexión como `needs_reauth` y mostrar el aviso
  de reconectar en la interfaz.
- Los eventos no se guardan en la base: se leen de la API con caché en memoria de
  corta duración.

## Publicar la app

Mientras esté en "Prueba", solo funciona con los usuarios de prueba y los refresh
tokens caducan a los siete días. Para uso real hay que pasarla a "En producción" en
la pantalla de consentimiento.

Con el scope de acceso total elegido acá, Google casi con seguridad va a pedir
verificación: un formulario detallado sobre el uso que se le da al permiso, y
puede pedir un video mostrando el flujo dentro de la app. Es un trámite que lleva
semanas, más que con un scope acotado. Es el costo conocido de haber elegido
acceso total para poder crear y borrar calendarios — no hay forma de evitarlo sin
resignar esa funcionalidad.

Por eso **conviene iniciar la verificación apenas la fase 4 esté funcionando en
desarrollo**, no cuando ya quieras lanzar: el trámite corre en paralelo al resto
del trabajo, y llegar al lanzamiento esperando semanas por Google es evitable si
se arranca temprano.
