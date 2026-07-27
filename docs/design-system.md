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

Token `max-w-content` (`--container-content: 72rem` / 1152px, mapeado en
`@theme inline` de `app/globals.css`). Historia corta: la fase 1 fijó acá
48rem/768px (`max-w-3xl`, pensado para texto de prosa de 65-75 caracteres) para
resolver que, en pantallas anchas, la fecha de una fila de tarea quedaba a
1200px de su título, con un espacio muerto enorme entre los dos. Funcionó
para eso, pero generó el problema contrario: en escritorio la app se veía con
ancho de teléfono, desperdiciando la pantalla — la queja concreta fue "todo
está hecho para celular".

**El diagnóstico original estaba mal.** Las dos observaciones son ciertas a
la vez, y eso es la pista: el problema nunca fue el ancho de la columna, era
**la distancia entre el título de una tarea y su metadata** (fecha,
prioridad, etiquetas). Un tope de columna chico es una forma tosca de
acortar esa distancia — funciona, pero paga con toda la pantalla, porque
ancho de columna y distancia título-metadata son dos variables distintas que
el límite fijo trataba como una sola. El bloque 3 de `interfaz-propia`
(`openspec/changes/interfaz-propia/`) separa las dos: la columna crece, la
distancia se resuelve aparte, en el componente de fila.

**El tope crece a 72rem/1152px** (dominio `ux` de la skill `ui-ux-pro-max`,
categoría *Layout & Responsive*: "Consistent max-width on desktop (`max-w-6xl`
/ `max-w-7xl`)" — el valor documentado para contenido denso de aplicación,
distinto del `max-w-prose`/`max-w-3xl` de texto corrido que fijó el tope
anterior). 1152px es bastante mayor que 768px sin llegar a ocupar el
viewport completo en un monitor ancho (1440px+), que es exactamente lo que la
misma categoría de la skill pide evitar. Se aplica al encabezado y al
contenido de las vistas de lista (Hoy, Bandeja de entrada, Proyecto,
Completado) y al detalle de tarea en su ruta suelta (`app/(app)/tarea/[id]`)
— no al panel lateral de detalle (`task-detail-panel.tsx`), que ya tiene su
propio ancho acotado (320-720px, redimensionable), ni al panel lateral de
navegación.

**La metadata acompaña al título en vez de irse al borde derecho** — la parte
que de verdad resuelve el problema que el ancho fijo chico venía a tapar. Si
solo se agrandara el tope de arriba sin tocar la fila, el título de
`TaskRow` (`components/tasks/task-row.tsx`) seguía teniendo `flex-1`
(crece para llenar todo el ancho restante de la fila), así que agrandar la
columna reintroducía exactamente la distancia de 1200px que el ancho fijo
había tapado, solo que a un número más alto.

La solución no es (a) achicar la columna de nuevo ni (b) darle a la
metadata su propia columna de ancho fijo a la derecha: es sacar la metadata
de ser *hermana* del título en el layout de flexbox y ponerla *dentro* del
mismo elemento clickeable, inmediatamente después del texto truncado:

```tsx
<button className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden ...">
  <span className="min-w-0 max-w-lg truncate ...">{task.title}</span>
  {task.labels.map((label) => <LabelChipView key={label.id} label={label} />)}
  {due && <span className="shrink-0 text-xs text-text-secondary">{due}</span>}
</button>
```

El botón entero sigue siendo `flex-1` — mantiene el área de clic amplia
(Fitts's law) que ya tenía antes, cómoda para abrir el detalle tocando
cualquier punto de la fila. Pero adentro, el título ya no crece: tiene su
propio tope (`max-w-lg`, 32rem/512px — el rango de 60-75 caracteres para
texto de escritorio que la skill documenta en *Typography & Color*,
`line-length-control`) y las etiquetas/fecha van justo después, con
`shrink-0`. El resultado: el conjunto título+metadata se agrupa a la
izquierda del botón, y el espacio que sobra hasta el tope de 1152px queda
vacío pero sigue siendo parte del área clickeable — no hay una zona muerta
visible, porque no hay nada dibujado ahí para empezar. Solo un título
extremadamente largo (más de 512px de texto) trunca contra el tope, que es
el único caso donde la metadata queda a una distancia notoria del final del
texto, y es deliberado: preferible a dejar crecer el título sin límite.

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

Si en el futuro alguien vuelve a ver la metadata lejos del título en una
pantalla ancha, la corrección es revisar el `flex-1`/`max-w-lg` de
`TaskRow`, no volver a achicar `--container-content` — eso repetiría el
mismo diagnóstico equivocado que esta sección documenta.

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

---

## 9. Primitivas de capa superpuesta (`components/primitives/`)

Bloque 2 del cambio `interfaz-propia`. Base de todo diálogo, menú, selector y
confirmación de la app (design.md sección A2). Cada primitiva se construye
**sobre** un componente de `components/ui/` (shadcn/ui, ya instalado o
agregado en este bloque) — el manejo de foco, teclado y anuncio a lectores de
pantalla se delega siempre a esa base; la primitiva agrega solo la capa de
identidad de Trazio y el contrato compartido. Ninguna primitiva reimplementa
trampa de foco, cierre con `Escape` ni navegación con flechas: eso ya lo
resuelve `@base-ui/react` (la librería detrás de `components.json`, estilo
`base-nova`).

| Primitiva | Archivo | Se construye sobre | Reemplaza / usa cuándo |
| --- | --- | --- | --- |
| Capa superpuesta | `overlay.ts` | — (contrato, no componente) | Lo importan todas las demás |
| Diálogo | `dialog.tsx` (`AppDialog`) | `ui/dialog.tsx` | Formularios y contenido dentro de un modal (detalle de tarea, proyecto, configuración — bloques 6, 8, 9) |
| Confirmación | `confirm-dialog.tsx` (`ConfirmDialog`) | `ui/alert-dialog.tsx` | Reemplaza `window.confirm`. Ya en uso: borrado de proyecto (`delete-project-dialog.tsx`, bloque 2.7) |
| Menú contextual | `context-menu.tsx` (`AppContextMenu`) | `ui/context-menu.tsx` (instalado en este bloque, no existía) | Acciones por clic derecho o tecla de menú. Sin consumidor todavía — lo usa el menú del editor (bloque 7) |
| Selector desplegable | `select-field.tsx` (`SelectField`) | `ui/popover.tsx` + `ui/command.tsx` | Elegir un valor de una lista buscable. Base de los selectores de fecha, prioridad, proyecto y color (bloques 4 y 8) |

### 9.1 El contrato de capa superpuesta (`overlay.ts`)

Toda superposición de Trazio se monta como capa **modal** de Base UI, que es
quien resuelve con eso el montaje por encima del resto del contenido y el
bloqueo del scroll de fondo mientras está abierta — no hay una capa propia
que reimplemente portal o scroll-lock. `Dialog` y `Menu` (de donde salen
`DropdownMenu` y `ContextMenu`) ya son modales por defecto en shadcn/ui.
`Popover`, en cambio, es **no modal por defecto** — así es como
`timezone-combobox.tsx` hoy no bloquea el scroll de fondo al abrirse.
`overlay.ts` exporta `OVERLAY_MODAL = true`, que `AppDialog` y `SelectField`
pasan explícitamente a su `Popover`/`Dialog` de base en vez de heredar el
valor por defecto en silencio.

`AlertDialog` y `ContextMenu` no exponen `modal` como prop configurable —
ya son modales siempre por diseño de Base UI — así que no hay nada que fijar
ahí con esta constante; queda documentado en el comentario de cada archivo.

### 9.2 `AppDialog` — diálogo propio

Envuelve `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/
`DialogDescription`/`DialogFooter` de `ui/dialog.tsx`. Convenciones que
agrega sobre la base:

- **Título siempre presente** (prop obligatoria): un diálogo sin título es
  mudo para un lector de pantalla, así que no es opcional en la API.
- **Ancho como variante** (`size: "default" | "lg"`) en vez de una clase
  suelta repetida en cada consumidor.
- Foco atrapado, devuelto al cerrar, cierre con `Escape` y asociación de rol
  y título: los resuelve `@base-ui/react/dialog`, verificado en
  `dialog.test.tsx`.

Radio (`rounded-xl`, 12px — el `--radius-lg` de la sección 5), borde en vez
de sombra decorativa (`ring-1 ring-foreground/10`, no `box-shadow`) y
transición de apertura (`duration-100`, fade + zoom) ya vienen del
`components.json` de shadcn/ui y son consistentes con Flat Design (sección
1.4 de este documento y del reporte de `ui-ux-pro-max`: "no shadows/
gradients, clean transitions 150–200ms"): no hicieron falta cambios para
alinearlos.

### 9.3 `ConfirmDialog` — confirmación propia

Reemplaza `window.confirm` en toda la app. Se construye sobre
`ui/alert-dialog.tsx`, no sobre `AppDialog`: es la primitiva con el rol de
accesibilidad correcto para una decisión que hay que tomar antes de seguir
(`role="alertdialog"`), algo que el `role="dialog"` genérico de `AppDialog`
no comunica. Comparte la misma identidad visual (mismo radio, mismo borde,
mismo pie con fondo diferenciado) porque los dos parten del mismo
`components.json`.

Props: `title`, `description`, `confirmLabel`/`cancelLabel`, `destructive`
(botón de confirmar en `--error`, nunca el rojo de marca — sección 1), y
`confirmDisabled` para bloquear la confirmación mientras se está calculando
la consecuencia de la acción (caso de uso real: contar las tareas que se
van a perder antes de habilitar "Eliminar de forma permanente").

Verificado a mano en el navegador sobre la confirmación de borrado de
proyecto: título y descripción correctos, botón destructivo en carmine
(`--error`, no rojo de marca), `Escape` cierra sin borrar y devuelve el
foco —con anillo visible— al botón "…" que abrió el menú, `Tab` recorre
Cancelar → Eliminar con foco visible, y confirmar borra de verdad.

### 9.4 `AppContextMenu` — menú contextual propio

Se construye sobre `ui/context-menu.tsx`, agregado en este bloque (no
existía ningún menú de clic derecho en la app hasta ahora). Recibe un
`trigger` y una lista de `items` (`{ label, onSelect, icon?, destructive?,
disabled? }` o `{ type: "separator" }`) en vez de exponer las piezas
compuestas sueltas: abre con clic derecho o la tecla de menú, navega con
flechas y activa con `Enter` — todo resuelto por `@base-ui/react/menu`,
verificado en `context-menu.test.tsx`. Sin consumidor todavía: lo usa el
menú del editor de descripción (bloque 7).

### 9.5 `SelectField` — selector desplegable propio

Se construye sobre `ui/popover.tsx` + `ui/command.tsx`, el mismo patrón que
ya usa `timezone-combobox.tsx` pero con la capa de identidad que a ese
componente le falta: `modal` explícito (`overlay.ts`), así que a diferencia
del combobox de zona horaria, bloquea el scroll de fondo al abrirse. El
trigger es un botón nativo (`Enter`/`Espacio` ya lo abren sin código
propio) y la lista de opciones es un `Command` (`cmdk`, que ya resuelve
navegar con flechas y elegir con `Enter`) — nada de eso se reimplementa,
verificado en `select-field.test.tsx`.

Es la base de los selectores de fecha, fecha límite, prioridad (bloque 4) y
color/proyecto padre (bloque 8) — todavía no tiene consumidor dentro de
este bloque.
