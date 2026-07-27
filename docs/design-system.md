# Trazio — Sistema visual

Fuente de verdad de estilo, paleta, tipografía y tokens. Sale de consultar la
skill `ui-ux-pro-max` (design system + dominios `typography` y `color`) contra el
tipo de producto de Trazio — gestor de tareas personal, productividad, escritorio
y móvil — no de la improvisación. Complementa `docs/product-spec.md` §12
(paleta de marca, ya fijada) y resuelve lo que el spec dejaba abierto:
`docs/decisions.md` D5 (conflicto del rojo) y D19 (paleta de proyectos/etiquetas).

Estilo base recomendado por la skill: **Flat Design** — 2D, sin sombras
decorativas, formas simples, tipografía como jerarquía principal. Encaja con un
producto de productividad que se usa muchas veces por día: cuanto menos ruido
visual, más rápido se lee una lista de tareas.

---

## 1. Paleta de marca y el conflicto del rojo

| Rol | Hex |
| --- | --- |
| Azul de marca | `#283B56` |
| Rojo de marca / Urgente | `#EC1E2A` |
| Naranja / Alta | `#F58220` |
| Gris / Baja | `#8A94A0` |

Decisión D5 (ya tomada): `#EC1E2A` es a la vez rojo de marca y color de
prioridad Urgente. Consecuencia: **ningún otro significado puede usar rojo**,
porque el selector de prioridad es un campo de la propia interfaz — si el error
de un formulario también fuera rojo, un campo con prioridad Urgente y un campo
que rechazó el guardado se leerían igual.

**Resolución — qué reemplaza al rojo:**

- **Error de formulario y acción destructiva:** `#BE123C` en modo claro
  (contraste 6.29:1 sobre blanco), `#FB7185` en modo oscuro (6.63:1 sobre fondo
  oscuro). Es un rosa/carmín, no una variante del rojo de marca — hue distinto,
  no solo más oscuro. Se llama `error` en los tokens, nunca `red`.
- **Urgente y marca siguen siendo `#EC1E2A`**, exclusivo de esos dos roles: el
  punto y chip de prioridad, y el ícono de la app.

**Contraste verificado — motivo por el que `.claude/rules/frontend.md` pide
variantes:** los cuatro colores de marca fallan AA como texto en al menos un
tema. Cada uno necesita una variante para uso como texto/label, y usa el valor
de marca sin modificar solo para puntos, chips e íconos (ahí el mínimo es 3:1,
no 4.5:1 — WCAG 1.4.11, contraste no textual).

| Color | Uso como punto/ícono | Contraste | Uso como texto | Contraste |
| --- | --- | --- | --- | --- |
| Urgente (claro) | `#EC1E2A` sobre blanco | 4.39:1 (ok para ícono, no para texto) | `#A61B23` sobre blanco | 7.49:1 |
| Urgente (oscuro) | `#EC1E2A` sobre fondo oscuro | 4.07:1 (ok para ícono, no para texto) | `#FF6B6B` sobre fondo oscuro | 6.43:1 |
| Alta (claro) | `#F58220` sobre blanco | 2.59:1 — **falla incluso como ícono** | `#B34F00` sobre blanco | 5.20:1 |
| Alta (oscuro) | `#F58220` sobre fondo oscuro | 6.88:1 (sirve también como texto) | `#F58220` (mismo valor) | 6.88:1 |
| Media (claro) | `#283B56` sobre blanco | 11.35:1 (sirve también como texto) | `#283B56` (mismo valor) | 11.35:1 |
| Media (oscuro) | `#283B56` sobre fondo oscuro | 1.57:1 — **falla, casi invisible** | `#8CA3C9` sobre fondo oscuro | 6.97:1 |
| Baja (claro) | `#8A94A0` sobre blanco | 3.08:1 (ok para ícono, no para texto) | `#5C6675` sobre blanco | 5.81:1 |
| Baja (oscuro) | `#8A94A0` sobre fondo oscuro | 5.80:1 (sirve también como texto) | `#8A94A0` (mismo valor) | 5.80:1 |

Hallazgo no cubierto por `frontend.md`: el naranja de Alta también incumple AA
sobre blanco, y peor que el rojo (2.59:1). El azul de marca, que en claro es el
mejor de los cuatro (11.35:1), es el que peor se porta en oscuro (1.57:1) — un
botón o texto azul de marca sobre fondo oscuro casi no se distingue. Ninguno de
los cuatro colores de marca se usa "tal cual" como texto en los dos temas a la
vez; siempre hay que elegir la columna correcta según el tema activo.

`#14181F` (texto primario claro, 17.79:1 sobre blanco) y `#F1F4F8` (texto
primario oscuro, 16.18:1 sobre fondo oscuro) no tienen este problema: son casi
neutros, se definen una sola vez por tema (sección 7).

---

## 2. Paleta de proyectos y etiquetas (decisión D19)

Diez colores con nombre, no color libre. Es la lista que impone el check
constraint de Postgres en `projects.color` y `labels.color`, y que
`lib/validation/` comparte como enum de Zod para las dos tablas. El
identificador es el valor que vive en la base — estable, en minúsculas, sin
acentos. El nombre visible es el que ve el usuario (sentence case, según
`.claude/rules/copy.md`).

Ninguno reutiliza los cuatro hex de marca/prioridad: si un proyecto pudiera ser
literalmente `#EC1E2A`, un punto de proyecto y un punto de prioridad Urgente
serían indistinguibles en el árbol del panel lateral.

Uso: punto de color junto al nombre del proyecto/etiqueta, o fondo de chip. No
son colores de texto de párrafo — por eso el mínimo verificado es 3:1 (no
textual), y varios superan también 4.5:1 sin proponérselo.

| Identificador | Nombre visible | Claro | Contraste (vs. blanco) | Oscuro | Contraste (vs. fondo oscuro) |
| --- | --- | --- | --- | --- | --- |
| `amarillo` | Amarillo | `#B45309` | 5.02:1 | `#FBBF24` | 10.69:1 |
| `lima` | Lima | `#65A30D` | 3.09:1 | `#A3E635` | 11.84:1 |
| `verde` | Verde | `#059669` | 3.77:1 | `#34D399` | 9.29:1 |
| `turquesa` | Turquesa | `#0D9488` | 3.74:1 | `#2DD4BF` | 9.59:1 |
| `celeste` | Celeste | `#0284C7` | 4.10:1 | `#38BDF8` | 8.33:1 |
| `indigo` | Índigo | `#4F46E5` | 6.29:1 | `#818CF8` | 5.98:1 |
| `violeta` | Violeta | `#7C3AED` | 5.70:1 | `#A78BFA` | 6.56:1 |
| `purpura` | Púrpura | `#9333EA` | 5.38:1 | `#C084FC` | 6.76:1 |
| `magenta` | Magenta | `#C026D3` | 4.71:1 | `#E879F9` | 7.25:1 |
| `marron` | Marrón | `#78350F` | 9.07:1 | `#B08968` | 5.63:1 |

Todos superan 3:1 en los dos temas; ninguno se usa como texto corrido. `marron`
se probó primero con un tono más anaranjado (`#D97706`) y se descartó: en modo
oscuro se confundía con la prioridad Alta. `#B08968` es un marrón desaturado,
sin ambigüedad con el naranja de marca.

### 2.1 Reutilización en la landing: color por tipo de token

El rediseño "El editor" de `docs/landing.md` usa siete de estos diez colores
para otra cosa: no proyectos de un usuario, sino **tipos de token del
parser** — fecha, hora, duración, prioridad, etiqueta, proyecto y
repetición, cada uno fijo a un color en toda la página (hero, demo, leyenda
y galería). Es una asignación propia de la landing, expuesta como variables
CSS aparte (`--token-date`, `--token-hour`, …, en `app/globals.css`, con su
propio bloque `:root`/`.dark`) — no reemplaza ni se lee desde
`lib/validation/colors.ts`, que sigue siendo la única fuente de verdad para
`projects.color`/`labels.color`. Los tres colores sin usar en esta
asignación son `lima`, `purpura` y `marron`.

| Tipo de token | Color | Claro | Oscuro |
| --- | --- | --- | --- |
| Fecha (relativa y puntual) | `celeste` | `#0284C7` | `#38BDF8` |
| Hora | `indigo` | `#4F46E5` | `#818CF8` |
| Duración | `turquesa` | `#0D9488` | `#2DD4BF` |
| Prioridad | `magenta` | `#C026D3` | `#E879F9` |
| Etiqueta | `amarillo` | `#B45309` | `#FBBF24` |
| Proyecto | `violeta` | `#7C3AED` | `#A78BFA` |
| Repetición | `verde` | `#059669` | `#34D399` |

El chip de prioridad de la demo (Urgente/Alta/Media/Baja) es la única
excepción: sigue usando el color semántico de prioridad de la sección 3, no
`--token-priority`, porque ahí lo que importa es el nivel, no el tipo de
dato.

---

## 3. Colores de prioridad

| Prioridad | Color | Punto/ícono | Texto claro | Texto oscuro |
| --- | --- | --- | --- | --- |
| 1 — Urgente | Rojo de marca | `#EC1E2A` | `#A61B23` | `#FF6B6B` |
| 2 — Alta | Naranja | `#F58220` | `#B34F00` | `#F58220` |
| 3 — Media | Azul de marca | `#283B56` | `#283B56` | `#8CA3C9` |
| 4 — Baja | Gris | `#8A94A0` | `#5C6675` | `#8A94A0` |

El punto/ícono de prioridad usa siempre el valor de marca de la sección 1,
igual en los dos temas — es el que aparece en el selector de prioridad y en los
chips. Cuando la prioridad se lee como texto (por ejemplo la palabra "Urgente"
en la vista Hoy, o una tarea atrasada resaltada en rojo), se usa la columna de
texto que corresponda al tema activo.

---

## 4. Tipografía

**Interfaz y landing: Inter**, una sola familia. Motivo:

- Es la recomendación de la skill para el tipo de producto (dashboards, apps de
  productividad, paneles) — geométrica, neutra, sin personalidad que compita
  con el contenido de una lista de tareas.
- Es variable font: un solo archivo cubre de 400 a 700 sin cargar cortes
  separados por peso, lo que ayuda directo al objetivo de LCP < 2.5 s y
  Lighthouse > 90 de la landing (criterio de G5 en el design de fase 1).
- Cubre el alfabeto latino con tildes y eñe sin fallback — necesario porque la
  app es 100% en español.
- Se sirve con `next/font/google`, self-hosted por Next (sin round-trip a
  Google Fonts en producción), subset `latin`, `display: swap`. No hace falta
  una fuente aparte para la landing: mismo archivo, mismo peso de carga, una
  sola decisión que mantener.

No hay una segunda familia para títulos: con variable weight alcanza para
diferenciar jerarquía (sección siguiente), y sumar una segunda familia es peso
extra sin necesidad — el estilo Flat Design pide tipografía como jerarquía, no
mezcla de personalidades.

**Escala** (`rem`, base 16px):

| Token | Tamaño | Uso |
| --- | --- | --- |
| `text-xs` | 12px | Metadatos, timestamps, contadores |
| `text-sm` | 14px | Texto secundario, labels de formulario |
| `text-base` | 16px | Cuerpo, inputs — nunca menos en móvil (evita el auto-zoom de iOS) |
| `text-lg` | 18px | Título de tarea en el detalle |
| `text-xl` | 20px | Encabezado de sección/vista |
| `text-2xl` | 24px | Título de página |
| `text-3xl` | 32px | Sin uso fijo — disponible para jerarquías puntuales |
| `text-4xl` | 40px | Sin uso fijo — disponible para jerarquías puntuales |

**Pesos:** 400 (cuerpo), 500 (labels, botones), 600 (títulos de sección, valor
activo en toggles), 700 (titulares). No se usa 300 ni 800: menos pesos
cargados, menos peso de archivo.

### 4.1 Escala tipográfica exclusiva de la landing

Dos escalones más, solo para `app/(marketing)/`: la escala de arriba topa en
40px y esa es justo la causa medible de que el rediseño "El editor"
(`docs/landing.md`) diagnosticó como problema — un titular de landing contra
16px de cuerpo da una relación de 2,5×, y Linear, Raycast y Craft corren
4×-5×. Arreglarlo sin tocar la escala de la app (usada también en el resto
del sitio, donde 40px sería desproporcionado) significa una escala aparte,
no un escalón más en la de arriba.

| Token | Tamaño | Relación vs. cuerpo | Uso |
| --- | --- | --- | --- |
| `text-landing-hero` | `clamp(2.75rem, 2.05rem + 3.25vw, 4.75rem)` — 44px a 76px | 2,75× a 4,75× | El `<h1>` del hero, único uso |
| `text-landing-section` | `clamp(1.875rem, 1.6rem + 1.3vw, 2.5rem)` — 30px a 40px | — | Encabezados `<h2>` de cada sección de la landing |

Fluida con `clamp()` en vez de saltos por breakpoint (`sm:`, `lg:`): un solo
valor que escala con el viewport, sin pasos bruscos ni CSS repetido por
tamaño de pantalla. Los tokens viven en `app/globals.css` (`@theme inline`,
junto a los del resto de la escala) y generan las utilidades de Tailwind
`text-landing-hero` / `text-landing-section` — no hace falta ninguna clase
`sm:`/`lg:` adicional para el titular del hero.

---

## 5. Espaciado y radios

Escala de espaciado: la de Tailwind v4 sin modificar, base 4px (`p-1` = 4px,
`p-2` = 8px, ...). No se define una escala propia — 4px es ya el ritmo que
recomienda la skill para densidad táctil, y divergir de la escala por defecto
de Tailwind es complejidad sin beneficio.

### 5.1 Ancho de columna de contenido

Token `max-w-content` (`--container-content: 48rem` / 768px, mapeado en
`@theme inline` de `app/globals.css`). Recomendación de la skill `ui-ux-pro-max`
(dominio `ux`, categoría *Layout → Container Width*): limitar el ancho de una
columna de contenido a 65-75 caracteres (`max-w-prose` / `max-w-3xl`) en vez de
dejarla ocupar todo el viewport — 48rem es exactamente el valor de `max-w-3xl`
de Tailwind, con nombre semántico propio para no repetirlo como número mágico
en cada componente.

Corrige un bug real: sin este límite, una fila de tarea en una pantalla ancha
(1440px+) deja el título a la izquierda y la fecha pegada al borde derecho,
con un espacio muerto enorme entre los dos. Se aplica al encabezado y al
contenido de las vistas de lista (Hoy, Bandeja de entrada, Proyecto,
Completado) y al detalle de tarea en su ruta suelta (`app/(app)/tarea/[id]`)
— no al panel lateral de detalle (`task-detail-panel.tsx`), que ya tiene su
propio ancho acotado (320-720px, redimensionable), ni al panel lateral de
navegación.

La columna va alineada a la izquierda (con el padding existente como margen),
no centrada con `mx-auto` en el espacio restante. El panel lateral
(`AppSidebar`) queda fijo contra el borde izquierdo del viewport; centrar la
columna de contenido en el espacio que le queda a la derecha la separa
visualmente del panel y la deja "flotando" en el medio de la pantalla, con
una zona muerta todavía más grande del lado derecho — el mismo problema de
espacio muerto que el límite de ancho ya venía a resolver, solo que
desplazado. La skill `ui-ux-pro-max` no tiene una regla puntual para esta
composición (panel fijo + columna con ancho máximo), pero sí para evitar
zonas muertas y mantener una estructura predecible (dominio `ux`, categoría
*Layout*); alinear a la izquierda, pegado al panel, es además el tratamiento
estándar en apps de productividad con panel lateral fijo (Todoist, Linear,
Notion). En mobile no hay diferencia visible: el panel lateral no está
presente (`hidden md:flex`) y el viewport ya es más angosto que
`max-w-content`.

Radios, sobre la variable `--radius` que consume shadcn/ui:

| Token | Valor | Uso |
| --- | --- | --- |
| `--radius-sm` | 4px | Checkbox, inputs chicos |
| `--radius` | 8px | Botones, inputs, tarjetas chicas — el default de shadcn |
| `--radius-lg` | 12px | Tarjetas, diálogos, panel de detalle |
| `--radius-full` | 9999px | Chips de prioridad/etiqueta, avatar |

---

## 6. Estados de interacción

| Estado | Tratamiento |
| --- | --- |
| Reposo | Color de superficie/borde por defecto (sección 7). |
| Hover | Solo en escritorio (`hover-vs-tap`: no depender de hover para nada esencial). Tinte de fondo con `--accent`, sin cambiar tamaño ni posición. |
| Foco | Anillo de 2px visible con `--ring`, offset 2px. Nunca se quita el `outline` sin reemplazarlo — obligatorio para teclado, y el detalle de tarea y los diálogos atrapan el foco (`frontend.md`). |
| Activo/presionado | Ligera reducción de opacidad o un tono más oscuro de `--accent`. Sin desplazamientos de layout. |
| Deshabilitado | Opacidad 45%, `cursor: not-allowed`, sin manejador de click. **Caso particular de Trazio:** sin conexión, todos los campos de escritura y botones de acción quedan deshabilitados (D4 del design de fase 1). Ese estado no se explica solo con opacidad — va acompañado del cartel persistente de "sin conexión" que ya define `.claude/rules/copy.md`, porque un campo apagado sin motivo visible parece un bug, no una regla. |
| Cargando | Botón: spinner + deshabilitado, mismo ancho que en reposo (no saltar layout). Contenido: skeleton en vez de spinner solo si la carga supera 300ms. |

---

## 7. Tokens semánticos

Variables CSS, una definición por tema. Cubren fondo, superficie, borde, texto
y los cuatro estados (éxito, error, advertencia, información) pedidos en la
tarea. Los diez colores de proyecto/etiqueta de la sección 2 **no** se vuelcan acá
como variables CSS — son demasiados y ya viven, tipados, en `lib/validation/`
junto al enum de Zod (ver sección 8). Repetirlos en CSS sería una segunda
fuente de verdad para el mismo dato.

```css
:root {
  /* Fondo y superficie */
  --background: #FFFFFF;
  --surface: #F7F8FA;
  --border: #E2E5EA;
  --input: #E2E5EA;

  /* Texto */
  --text-primary: #14181F;
  --text-secondary: #5C6675;

  /* Marca / acción primaria */
  --primary: #283B56;
  --primary-foreground: #FFFFFF;
  --ring: #283B56;

  /* Estado */
  --success: #15803D;
  --success-foreground: #FFFFFF;
  --warning: #B45309;
  --warning-foreground: #FFFFFF;
  --error: #BE123C;
  --error-foreground: #FFFFFF;
  --info: #0369A1;
  --info-foreground: #FFFFFF;

  /* Prioridad — punto/ícono (marca) y texto (variante por tema) */
  --priority-urgent: #EC1E2A;
  --priority-urgent-text: #A61B23;
  --priority-high: #F58220;
  --priority-high-text: #B34F00;
  --priority-medium: #283B56;
  --priority-medium-text: #283B56;
  --priority-low: #8A94A0;
  --priority-low-text: #5C6675;

  --radius: 0.5rem;
}

.dark {
  --background: #0F172A;
  --surface: #1A2436;
  --border: #2A3547;
  --input: #2A3547;

  --text-primary: #F1F4F8;
  --text-secondary: #94A3B8;

  --primary: #8CA3C9;
  --primary-foreground: #0F172A;
  --ring: #8CA3C9;

  --success: #4ADE80;
  --success-foreground: #0F172A;
  --warning: #FBBF24;
  --warning-foreground: #0F172A;
  --error: #FB7185;
  --error-foreground: #0F172A;
  --info: #38BDF8;
  --info-foreground: #0F172A;

  --priority-urgent: #EC1E2A;
  --priority-urgent-text: #FF6B6B;
  --priority-high: #F58220;
  --priority-high-text: #F58220;
  --priority-medium: #283B56;
  --priority-medium-text: #8CA3C9;
  --priority-low: #8A94A0;
  --priority-low-text: #8A94A0;
}
```

`--primary` cambia de valor entre temas (no solo de superficie): en oscuro, el
azul de marca sin modificar da 1.57:1 contra el fondo — prácticamente invisible
(sección 1). La variante clara del azul (`#8CA3C9`) es la que funciona ahí,
con texto oscuro encima en vez de blanco.

---

## 8. Aplicación a shadcn/ui en Tailwind v4

Tailwind v4 configura por CSS, no por `tailwind.config.js` (ya decidido en A1
del design de fase 1). Los tokens de la sección 7 viven en `app/globals.css`:
el bloque `:root` / `.dark` de arriba, más un `@theme inline` que mapea cada
variable a un nombre de utilidad de Tailwind (`--color-background`,
`--color-primary`, etc.), que es lo que permite escribir `bg-background` o
`text-primary` en los componentes en vez de hex sueltos.

- `components.json` de shadcn con `"cssVariables": true` y `"baseColor":
  "neutral"` como punto de partida — se pisa con el bloque de arriba, no se
  generan los tokens de shadcn por defecto y se dejan sin tocar.
- El cambio de tema (claro/oscuro/sistema, preferencia de
  `user_preferences.theme`) se resuelve agregando o quitando la clase `.dark`
  en `<html>` — el patrón estándar de shadcn con `next-themes` — nunca con
  `prefers-color-scheme` solo, porque "sistema" es una opción explícita del
  usuario, no la única fuente.
- Los diez colores de proyecto/etiqueta de la sección 2 se acceden desde
  código como un mapa TypeScript (`{ amarillo: { light: '#B45309', dark:
  '#FBBF24' }, ... }`) en `lib/validation/colors.ts`, importado tanto por el
  esquema de Zod como por los componentes que pintan el punto de color. No son
  clases de Tailwind ni variables `:root` — son datos de la aplicación, y
  Tailwind v4 los consume vía valor arbitrario (`bg-[var(--project-color)]`
  con la variable seteada inline) donde haga falta.
- Las prioridades sí son variables CSS (`--priority-*` arriba) porque son
  cuatro, fijas, y ya determinadas por la marca — no ameritan una tabla en
  runtime.
