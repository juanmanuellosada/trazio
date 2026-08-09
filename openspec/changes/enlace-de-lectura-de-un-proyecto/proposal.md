## Why

Trazio decidió no tener equipos, ni invitar, ni asignar. Esa decisión sigue en
pie y esto no la revierte: **nadie más puede editar nada, y quien mira ni
siquiera tiene cuenta.**

Lo que falta es más chico y más común: organizás un proyecto y querés
mostrárselo a alguien. Hoy la única salida es una captura de pantalla.

Y es barato precisamente porque quien mira no tiene cuenta. No es otra persona
autenticada leyendo tus filas a través de RLS —eso obligaría a reescribir 76
políticas sobre 19 tablas— sino una lectura pública y anónima de un solo
proyecto, resuelta por un token.

## What Changes

- Un proyecto SHALL poder generar un **enlace de lectura**. Quien lo tenga ve
  el proyecto sin registrarse y sin poder cambiar nada.
- El enlace SHALL poder **regenerarse** —el anterior deja de servir— y
  **desactivarse**.
- La vista pública SHALL mostrar el proyecto, sus secciones y sus tareas con
  título, descripción, fecha, prioridad, estado y subtareas.
- La vista pública NUNCA SHALL mostrar comentarios, recordatorios, etiquetas,
  ni ningún dato de la cuenta más allá del nombre del proyecto.
- La vista pública NUNCA SHALL ser indexable por buscadores.
- **BREAKING** respecto del spec vigente: "Fuera de alcance" dice sin
  compartir. Se acota esa decisión: sigue sin haber cuentas invitadas, edición
  ajena ni asignación; se agrega publicar una vista de solo lectura.

## Capabilities

### New Capabilities

- `enlace-de-lectura`: cómo se genera, se revoca y se consume el enlace, qué
  muestra la vista pública, y las garantías de seguridad que la sostienen.

### Modified Capabilities

- `esquema-datos`: `projects` suma el token y aparece la función de lectura
  pública.
- `proyectos-secciones`: el menú del proyecto suma compartir.

## Impact

**Base de datos** — columna de token en `projects` con índice único, y una
función `security definer` que recibe el token y devuelve el proyecto armado.
Es la única función del proyecto que se otorga al rol anónimo, así que es la
superficie más sensible que se agregó nunca. **Necesita `supabase db push`.**

**Ruta pública** — fuera de `app/(app)/`, sin el layout de la aplicación: la
vista no puede arrastrar el panel lateral con los demás proyectos.

**Seguridad** — cuatro frentes, detallados en el diseño: entropía del token,
lista explícita de columnas, fuga por `Referer`, e indexación.

**Fuera de alcance** — editar desde el enlace, comentar, contraseña o
vencimiento del enlace, compartir una etiqueta o un filtro, y cualquier forma
de cuenta invitada.
