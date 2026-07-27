# Plantillas de correo de Auth

`confirmation.html` y `recovery.html` son las plantillas de confirmación de
cuenta y recuperación de contraseña, con identidad de marca de Trazio. Referen­
ciadas desde `supabase/config.toml` (`[auth.email.template.confirmation]` y
`[auth.email.template.recovery]`).

**El envío ya sale por Resend** (SMTP propio configurado en Supabase Auth,
tarea 4.11). Esto no cambia el mecanismo de envío ni agrega ningún servicio:
solo reemplaza el HTML pelado por defecto de Supabase por uno con marca.

## Importante: esto solo aplica al proyecto local

`content_path` en `config.toml` es una configuración de **Supabase local**
(`supabase start`, Docker). El proyecto remoto (el que corre en producción y
en preview) **no lee este archivo ni esta carpeta**. Hay que pegar el HTML a
mano en el dashboard del proyecto remoto:

1. Entrar a `https://supabase.com/dashboard/project/<project-ref>/auth/templates`.
2. En la plantilla **Confirm signup**:
   - Subject: `Confirmá tu cuenta de Trazio`
   - Message body: pegar el contenido completo de `confirmation.html`.
3. En la plantilla **Reset Password**:
   - Subject: `Restablecé tu contraseña de Trazio`
   - Message body: pegar el contenido completo de `recovery.html`.
4. Guardar cada plantilla por separado.
5. Enviar un correo de prueba real (registrar un usuario de prueba o pedir un
   reset) y revisar que llegue desde `hola@envios.trazio.com.ar` con el HTML
   completo, no como texto plano ni con el link roto.

Si se vuelve a tocar el HTML de estos archivos, hay que repetir el paso 2-4 a
mano: no hay sincronización automática entre el repo y el dashboard remoto.

## Verificado en local

Probado contra `pnpm supabase start` con Mailpit (`http://127.0.0.1:54324`):
ambas plantillas renderizan con el asunto, el copy y el botón correctos, y
`{{ .ConfirmationURL }}` se resuelve a la URL real de verificación
(`/auth/v1/verify?token=...&type=recovery|signup&redirect_to=...`), no queda
como placeholder literal.

## Variable que no se toca

`{{ .ConfirmationURL }}` arma el enlace con el código de un solo uso. Pasa por
`/auth/v1/verify`, que lo canjea por sesión y recién ahí redirige al callback
de la app (`/auth/callback` → pantalla de contraseña nueva, en el caso del
reset). Reemplazarla por una URL fija rompe los dos flujos.

## Sin versión de texto plano

`config.toml` solo admite `subject` y `content_path` (HTML) por plantilla —
Supabase/GoTrue no tiene un campo separado para el cuerpo en texto plano, ni
en local ni en el dashboard remoto. Por eso ambas plantillas incluyen el
enlace como texto visible además del botón: es el único texto plano que un
cliente de correo puede mostrar si el HTML no renderiza.

## Restricciones del HTML (por qué está escrito así)

- Layout con tablas (`<table>`), no flexbox/grid: Outlook de escritorio usa el
  motor de renderizado de Word y no soporta CSS moderno de layout.
- Estilos en línea (`style="..."`) en cada elemento, no una hoja de estilo:
  Gmail descarta el `<style>` del `<head>` en varios contextos (por eso el
  único `<style>` del archivo es una mejora progresiva para modo oscuro, no la
  base — todo lo esencial está también inline).
- Ancho fijo de 600px, centrado con una tabla contenedora al 100%.
- Logo por URL absoluta `https://trazio.com.ar/logo.png` (se sirve desde
  `public/logo.png`), con `width`, `height` y `alt="Trazio"` — nada de base64,
  que dispara filtros de spam.
- El correo se entiende sin cargar imágenes: el asunto, el título, el párrafo
  y el enlace de texto ya explican la acción sin depender del logo.
- El botón es una tabla de una celda con `bgcolor` y `background-color`
  duplicados (atributo HTML + CSS inline), no un `<button>` ni un `<a>` con
  padding suelto — es la única forma que se ve igual en Outlook, Gmail y
  Apple Mail.
- Azul de marca `#283B56` para el botón y el enlace, nunca el rojo `#EC1E2A`
  (decisión D5: el rojo es marca y prioridad Urgente a la vez, no se usa para
  ninguna acción).
- Modo oscuro: fondo del cuerpo y de la tarjeta con `bgcolor` explícito (no
  blanco puro) y texto que no es negro puro, para no disparar la inversión
  automática que aplican Gmail/Outlook cuando detectan colores "por defecto".
  El bloque `@media (prefers-color-scheme: dark)` es una mejora adicional para
  los clientes que sí lo respetan (Apple Mail); si se descarta, la combinación
  de colores de base ya funciona en los dos modos.
