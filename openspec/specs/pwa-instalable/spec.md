# pwa-instalable Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Manifest de la PWA

El manifest de la aplicación SHALL declarar `display: standalone`, íconos en 192px,
512px y una variante `maskable`, todos derivados de `public/logo.png`, y
`theme_color` igual al azul de marca `#283B56`. Su `start_url` SHALL resolver a la
aplicación misma, nunca a la landing pública de marketing.

#### Scenario: El manifest declara modo standalone y el color de marca

- **WHEN** se inspecciona el archivo de manifest servido por la aplicación
- **THEN** su propiedad `display` es `standalone`
- **AND** su propiedad `theme_color` es `#283B56`

#### Scenario: Los íconos existen en los tamaños requeridos

- **WHEN** se inspeccionan los íconos declarados en el manifest
- **THEN** existe un ícono de 192x192, uno de 512x512 y uno marcado como `purpose: maskable`
- **AND** los tres derivan visualmente de `public/logo.png`

#### Scenario: Abrir la app instalada entra a la aplicación, no a la landing

- **WHEN** una persona abre la aplicación instalada desde el ícono de su pantalla de inicio
- **THEN** llega a la aplicación (su Bandeja de entrada, Hoy, o el login si no tiene sesión)
- **AND** no ve la landing pública de marketing ("Creá tu cuenta gratis")

### Requirement: Instalación desde el navegador y apertura a pantalla completa

La aplicación SHALL poder instalarse desde el navegador (mediante el prompt nativo
de instalación o el menú del navegador) y, una vez instalada, SHALL abrir en modo
pantalla completa (`standalone`), sin la barra de direcciones ni los controles del
navegador.

#### Scenario: La app se instala y abre a pantalla completa

- **WHEN** una persona instala la aplicación desde el navegador y la abre
- **THEN** la aplicación se abre sin la barra de direcciones ni los controles de navegación del navegador

### Requirement: Service worker mínimo, sin fetch y sin caché

SHALL existir un service worker registrado por la aplicación, porque los
navegadores basados en Chromium exigen uno para ofrecer el prompt de instalación
(criterio de aceptación de esta fase). Ese service worker MUST NOT implementar un
manejador de `fetch` y MUST NOT cachear ningún recurso, para no contradecir la
decisión de que Trazio es 100% online y no tiene modo offline ni caché de datos.
El código del service worker SHALL dejar escrito, en un comentario, por qué existe
sin cachear nada. En fase 2 ese mismo archivo sumará el manejador de push, sin
agregar manejo de `fetch` ni caché en esta fase.

#### Scenario: El service worker se registra

- **WHEN** se carga la aplicación en un navegador compatible
- **THEN** un service worker queda registrado para el origen de la aplicación

#### Scenario: El service worker no intercepta peticiones de red

- **WHEN** se inspecciona el código fuente del service worker
- **THEN** no existe ningún listener para el evento `fetch`

#### Scenario: El service worker no usa la Cache API

- **WHEN** se inspecciona el código fuente del service worker
- **THEN** no hay ninguna llamada a `caches.open`, `caches.match` ni a ningún otro método de la Cache API

#### Scenario: El prompt de instalación se ofrece en navegadores Chromium

- **WHEN** se visita la aplicación con un navegador basado en Chromium que cumple los demás requisitos de instalabilidad (manifest válido, HTTPS, service worker registrado)
- **THEN** el navegador ofrece la instalación de la aplicación

### Requirement: El manifest declara accesos directos

El manifest SHALL declarar accesos directos que el sistema ofrece al mantener apretado el ícono de la aplicación instalada: al menos "Nueva tarea" y "Hoy", apuntando a rutas que ya existen.

SHALL declararse a lo sumo cuatro: algunos sistemas recortan la lista sin avisar, y un menú largo en el ícono es ruido.

#### Scenario: El ícono instalado ofrece acciones

- **WHEN** se mantiene apretado el ícono de Trazio instalado en un sistema que soporta accesos directos
- **THEN** SHALL ofrecerse al menos "Nueva tarea" y "Hoy"

#### Scenario: Un acceso directo lleva a su pantalla

- **WHEN** se elige el acceso directo "Hoy"
- **THEN** la aplicación SHALL abrirse en la pantalla Hoy

### Requirement: Trazio recibe texto compartido desde el sistema

El manifest SHALL declarar un destino de compartir con método `GET`, de modo que Trazio aparezca en el menú de compartir del sistema y reciba título, texto y enlace.

Lo compartido SHALL abrir el **alta rápida** con el texto precargado y pasar por el parser de lenguaje natural, igual que un alta escrita a mano. NUNCA SHALL crearse una tarea sin confirmación: lo que llega es texto crudo de otra aplicación y casi nunca es el título que la persona querría.

La ruta que recibe lo compartido SHALL combinar los campos de forma tolerante: cada aplicación reparte el contenido entre `title`, `text` y `url` de manera distinta, y NUNCA SHALL asumirse cuál viene.

NUNCA SHALL declararse la recepción de archivos ni imágenes: Trazio no tiene adjuntos.

#### Scenario: Trazio aparece en el menú de compartir

- **WHEN** se comparte un texto desde otra aplicación en un sistema con Trazio instalado y soporte de destino de compartir
- **THEN** Trazio SHALL figurar entre los destinos

#### Scenario: Lo compartido abre el alta rápida con el texto puesto

- **WHEN** se comparte el texto "comprar café mañana 9am" a Trazio
- **THEN** SHALL abrirse el alta rápida con ese texto precargado
- **AND** el parser SHALL resaltar la fecha y la hora reconocidas
- **AND** NUNCA SHALL crearse la tarea sin confirmación

#### Scenario: Compartir un enlace con título

- **WHEN** se comparte un enlace que trae título y URL
- **THEN** el título SHALL quedar como texto del alta
- **AND** el enlace SHALL quedar en la descripción

#### Scenario: No se declara recepción de archivos

- **WHEN** se comparte una imagen o un archivo desde el sistema
- **THEN** Trazio NUNCA SHALL figurar como destino posible

