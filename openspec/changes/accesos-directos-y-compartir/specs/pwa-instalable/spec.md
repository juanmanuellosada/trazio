## ADDED Requirements

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
