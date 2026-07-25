# Trazio — Landing page

Especificación de la página pública. Entra en la fase 1.

---

## Qué encontré antes de escribir esto

Revisé las prácticas actuales de landings de SaaS y de productos de productividad.
Lo que sostiene la evidencia:

- La estructura de las que convierten es notablemente consistente: **titular
  orientado al resultado, CTA arriba del pliegue, prueba social, features
  escaneables, y cierre con CTA**. Cada sección responde una pregunta del visitante,
  en el orden en que se la hace.
- **Un solo CTA principal.** Las páginas con un CTA convierten alrededor de 13,5%
  frente a 10,5% de las que tienen cinco o más. Las opciones secundarias aparecen
  más abajo, cuando el visitante ya tiene contexto.
- **Mostrar el producto, no describirlo.** Una captura anotada de la interfaz real,
  arriba del pliegue, reduce fricción más que cualquier párrafo.
- El visitante decide en unos cinco segundos si sigue leyendo.
- **Cerca del 79% del tráfico a landings de SaaS llega desde el teléfono**, aunque
  el escritorio convierta mejor. La experiencia móvil define si esa persona vuelve.
- Cuando el producto entrega valor en menos de diez minutos, el CTA principal debe
  ser registrarse, no pedir una demo. Trazio entrega valor en dos minutos.

Un ajuste propio: casi toda la literatura asume que existe prueba social. Trazio
todavía no tiene usuarios. La solución no es inventar testimonios sino **reemplazar
esa sección por prueba de producto** — capturas reales y una demo del parser en vivo.

---

## Objetivo

Una sola conversión: **crear una cuenta**. Sin newsletter, sin "hablá con ventas",
sin descarga de nada.

## Público

Alguien en Argentina que ya usa (o abandonó) un gestor de tareas y siente que las
opciones existentes son o demasiado pesadas o demasiado pobres. Habla español, y le
molesta que las apps que usa piensen en inglés.

## Posicionamiento

**Tu día completo en una sola pantalla.**

Lo que hay que hacer, lo que querés sostener y lo que ya está agendado, juntos. No
"otra lista de tareas".

Los dos diferenciales que se comunican:

1. **Escribís como hablás.** El alta rápida entiende español de verdad — "reunión
   con Ana el próximo martes a las 3pm por 45min" se convierte en una tarea con
   fecha, hora y duración, sin tocar un solo campo.
2. **Tareas, hábitos y calendario en la misma línea de tiempo.** No tres apps
   pegadas con cinta.

> Nota interna: el segundo diferencial recién existe en la fase 3-4. En la landing
> de la fase 1, comunicarlo como lo que viene, no como lo que hay. No prometer lo
> que la app todavía no hace.

---

## Estructura

Una sola página, con estas secciones en este orden.

### 1. Hero

Cuatro elementos, ni uno más:

- **Titular** — el resultado, no la funcionalidad. Propuesta:
  *"Tu día entero, en una sola pantalla."*
- **Subtítulo** — un detalle de soporte, una línea. Propuesta:
  *"Escribí lo que tenés que hacer como se lo dirías a alguien. Trazio entiende la
  fecha, la hora y la prioridad solo."*
- **CTA principal** — "Crear mi cuenta gratis". Un solo botón. Sin "ver demo" al lado.
- **Visual del producto** — captura real de la vista Hoy, no una ilustración
  genérica ni un mockup de laptop flotando.

Debajo del botón, una línea de fricción cero: *"Gratis. Sin tarjeta."*

Sin menú de navegación con links que se lleven al visitante afuera. Como mucho, el
logo a la izquierda y un "Iniciar sesión" discreto a la derecha.

### 2. Demo del parser (reemplaza a la prueba social)

La sección diferencial, y la que más trabajo de producto merece.

Un campo de texto real donde el visitante escribe y **ve el parseo en vivo**: las
palabras reconocidas se resaltan y aparece la tarjeta de tarea resultante con fecha,
hora, prioridad y etiqueta ya cargadas. Sin registrarse.

Tres ejemplos pre-cargados que se pueden tocar para probar:

- `Llamar al contador mañana a las 10`
- `Pagar el alquiler cada mes p1`
- `Gimnasio cada lunes, miércoles y viernes por 1h`

Esto convierte porque es el producto funcionando, no una promesa sobre el producto.
Y es honesto: el parser es lo mejor que tiene la app.

### 3. El problema

Corta, tres o cuatro líneas. El costo de no tener un sistema: cosas que se olvidan,
la cabeza ocupada recordando, la sensación de fin de semana sin saber qué se hizo.

Sin dramatizar y sin hablar de "productividad" como valor moral.

### 4. Funcionalidades

Formato bento o grilla de tres columnas. Escaneable: cada bloque con un ícono, un
título de tres palabras y una línea de descripción. Máximo seis.

Para la fase 1:

- Bandeja de entrada — sacá todo de la cabeza
- Hoy — lo de hoy y lo atrasado, sin ruido
- Proyectos y secciones — tu estructura, no la nuestra
- Prioridades y fechas — lo importante primero
- Subtareas — dividí lo grande
- Atajos de teclado — sin soltar las manos

Cada bloque acompañado de una captura chica y real de esa parte de la interfaz.

### 5. Lo que viene

Sección honesta y breve: hábitos con rachas, filtros guardados, recordatorios,
Google Calendar. Presentado como hoja de ruta, no como si ya existiera.

Esto genera confianza en vez de romperla, y le da al visitante una razón para
volver.

### 6. Cierre

Repetición del CTA con el mismo texto del hero. Un titular corto, el botón, y nada
más.

### 7. Pie

Mínimo: logo, año, y links a términos y privacidad. Sin mapa del sitio, sin redes
sociales que todavía no existen.

---

## Precio

**Gratis, sin plan pago, en toda la fase 1.** No hay sección de precios en la
landing. Cuando exista un modelo, se agrega entre "Funcionalidades" y "Cierre".

No poner "gratis durante el beta" ni nada que insinúe un cobro futuro sin tenerlo
definido: genera preguntas que no podés responder.

---

## Requisitos técnicos

- **Server Components enteramente.** La única isla cliente es la demo del parser.
- **LCP por debajo de 2,5 segundos.** Imágenes en formato moderno, con dimensiones
  declaradas, y la del hero con prioridad de carga.
- **Móvil primero.** Diseñar la versión de teléfono antes que la de escritorio.
  El CTA tiene que ser alcanzable con el pulgar y quedar visible al hacer scroll.
- **Metadatos completos**: título, descripción, Open Graph con imagen, y
  `lang="es-AR"`.
- **Sin animaciones que compitan** con el CTA. Micro-transiciones al hacer scroll,
  nada más.
- **Accesibilidad AA**: contraste, foco visible, navegación por teclado.

## Analítica

Registrar únicamente: visitas, clics en el CTA, interacciones con la demo del
parser, y registros completados. Con eso se calcula la conversión y se ve si la demo
tracciona. No instalar un stack de analítica pesado para cuatro métricas.

---

## Lo que esta landing no lleva

- Testimonios inventados o logos de empresas que no son clientes.
- Contadores de usuarios falsos.
- Chat de soporte.
- Popup de newsletter.
- Comparativas contra productos con nombre y apellido.
- Más de un CTA principal.
