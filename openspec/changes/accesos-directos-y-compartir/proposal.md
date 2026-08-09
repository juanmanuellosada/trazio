## Why

Trazio decidió no tener aplicación en tiendas: se instala desde el navegador y
listo. Esa decisión está bien, pero deja dos huecos que la propia plataforma
web ya sabe llenar y que el manifest hoy no declara.

Uno: mantener apretado el ícono instalado no ofrece nada. En cualquier app de
tareas eso abre "Nueva tarea" sin pasar por la pantalla principal.

Dos, y más grande: **Trazio no aparece en el menú de compartir del teléfono**.
Leés algo, querés convertirlo en tarea, y tenés que abrir la app, tocar
agregar y pegar a mano. Todoist y TickTick reciben eso desde hace años.

Los dos se resuelven con campos del manifest, sin lógica nueva.

## What Changes

- El manifest SHALL declarar **accesos directos**: al menos "Nueva tarea" y
  "Hoy", disponibles al mantener apretado el ícono instalado.
- El manifest SHALL declarar un **destino de compartir**, de modo que Trazio
  aparezca en el menú de compartir del sistema y reciba texto, links y
  títulos.
- Lo compartido SHALL entrar por el **alta rápida**, con el texto precargado,
  pasando por el parser de lenguaje natural como cualquier alta escrita a
  mano. Compartir un link con título deja el título como texto y el link en la
  descripción.
- Lo compartido NUNCA SHALL crearse sin confirmación: se abre el alta con el
  texto puesto, no se guarda solo.

## Capabilities

### Modified Capabilities

- `pwa-instalable`: el manifest suma accesos directos y destino de compartir.

## Impact

**Manifest** — `app/manifest.ts` suma `shortcuts` y `share_target`. Hoy no
tiene ninguno de los dos, verificado.

**Ruta nueva** — el destino de compartir necesita una ruta que reciba el
`GET` con los parámetros y redirija al alta rápida con el texto precargado.

**Íconos** — cada acceso directo puede llevar su ícono; si no se hace uno,
usan el de la app.

**Fuera de alcance** — recibir archivos o imágenes compartidas (Trazio no
tiene adjuntos, es una decisión tomada), y el protocolo de manejo de enlaces.
