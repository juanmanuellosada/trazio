## Why

`profiles.avatar_url` existe desde la fase 1 y **nunca se llenó**. El trigger
de alta de cuenta inserta `id` y `full_name`, y deja el avatar en nulo — aunque
Google manda la foto en los metadatos de la cuenta, junto al nombre que sí se
copia.

Así que la columna está, el dato llega, y la interfaz muestra iniciales para
todo el mundo. Es una función a medio construir desde el primer día, no una
idea nueva.

## What Changes

- El alta de cuenta SHALL copiar la foto de perfil desde los metadatos de la
  cuenta, con el mismo criterio con que ya copia el nombre.
- Las cuentas que ya existen SHALL recibir su foto por backfill, en la misma
  migración.
- La foto SHALL refrescarse al iniciar sesión: una foto de Google cambia, y
  copiarla una sola vez al registrarse la deja vieja para siempre.
- La foto SHALL mostrarse donde hoy se muestra la cuenta: el panel lateral, el
  menú de cuenta y la sección de perfil de Configuración.
- Quien no tenga foto —alta con correo y contraseña— SHALL seguir viendo sus
  iniciales. El respaldo NUNCA SHALL desaparecer.

## Capabilities

### Modified Capabilities

- `autenticacion`: el trigger de aprovisionamiento copia también la foto, y se
  refresca al iniciar sesión.
- `sistema-de-componentes`: el avatar de cuenta muestra la foto cuando existe,
  con las iniciales como respaldo.

## Impact

**Base de datos** — el trigger `handle_new_user()` suma una columna al
`insert`, y una migración hace el backfill desde los metadatos de las cuentas
existentes. Sin tablas nuevas: la columna ya está.

**Interfaz** — `components/layout/account-menu.tsx`,
`components/layout/app-sidebar.tsx` y `components/settings/account-section.tsx`.
El layout ya consulta `profiles`, así que sumar la columna al `select` es una
palabra.

**Configuración** — la foto vive en `lh3.googleusercontent.com`, un host
externo. Hay que decidir cómo se carga (ver el diseño).

**Fuera de alcance** — subir una foto propia, recortarla, o cualquier forma de
editar el avatar: la foto viene de la cuenta de Google y no se administra en
Trazio.
