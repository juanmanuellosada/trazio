## 1. Decisiones y documentación

Bloque bloqueante: los choques con `docs/product-spec.md` y `docs/decisions.md` (design.md, sección B) y las dependencias nuevas fuera de la lista cerrada de `AGENTS.md` (design.md, sección D1) se registran antes de tocar código.

- [x] 1.1 Registrar en `docs/decisions.md` (D28) el cambio del detalle de tarea de panel lateral a modal centrado, incluido que el ancho ya no se guarda en `localStorage`
- [x] 1.2 Registrar en `docs/decisions.md` (D29) la excepción de color personalizado en proyectos: convive con la paleta fija de D19 sin reemplazarla, y exige validación de contraste AA contra los fondos de los dos temas antes de guardarse
- [x] 1.3 Registrar en `docs/decisions.md` (D30) la exclusión de la fórmula matemática del editor de descripción (OQ1 de `design.md`), por el costo de la dependencia frente a un uso marginal
- [x] 1.4 Registrar en `docs/decisions.md` (D31) las dependencias nuevas fuera de la lista cerrada de `AGENTS.md`: las extensiones de Tiptap que cubren lo pedido (títulos, tachado, resaltado, código, listas de tareas, tabla, nota al pie, regla horizontal, destacado) y la fuente de datos de emojis categorizada; sumarlas a la tabla de librerías de `AGENTS.md`
- [x] 1.5 Actualizar `docs/product-spec.md` §3, sección "Detalle de tarea": reemplazar "Panel lateral redimensionable (recuerda el ancho elegido)" por el detalle como modal centrado por encima de la pantalla, manteniendo pantalla completa en teléfono

## 2. Primitivas

Base de todo lo demás (design.md, sección A2): capas, diálogos, menús contextuales, selectores desplegables y confirmaciones.

- [x] 2.1 Consultar la skill `ui-ux-pro-max` para la identidad visual de las primitivas (diálogos, menús, popovers, confirmaciones) antes de construir la primera
- [x] 2.2 Primitiva de capa superpuesta compartida: monta sobre el resto del contenido y bloquea el scroll del fondo mientras está abierta
- [x] 2.3 Primitiva de diálogo propio sobre el `Dialog` de shadcn/ui: atrapa el foco, lo devuelve al elemento que lo abrió al cerrarse, cierra con `Escape`, y se anuncia a lectores de pantalla con rol y título
- [x] 2.4 Primitiva de menú contextual propio: abre con clic derecho o la tecla de menú, navega con las flechas, activa con `Enter`, cierra con `Escape` o clic afuera
- [x] 2.5 Primitiva de selector desplegable propio sobre `Popover`/`Command` de shadcn/ui: abre con `Enter` o `Espacio` estando enfocado, navega con flechas, anuncia la opción seleccionada
- [x] 2.6 Primitiva de confirmación propia sobre la primitiva de diálogo, para reemplazar `window.confirm`, `window.alert` y `window.prompt` en toda la app
- [x] 2.7 Reemplazar la confirmación de borrado de proyecto (hoy `window.confirm`, auditoría A1) por la confirmación propia, mostrando la acción y su consecuencia
- [x] 2.8 Verificar accesibilidad AA de las primitivas: cada control alcanzable solo con teclado, y foco visible en todas ellas

## 3. Ancho adaptativo

Barato y cambia la percepción de todo lo que se prueba después (design.md, sección E).

- [x] 3.1 Consultar la skill `ui-ux-pro-max` para definir el tope máximo del ancho de contenido y el comportamiento intermedio (design.md, sección C1)
- [x] 3.2 Reemplazar el ancho fijo de 768px por el ancho adaptativo definido, en las vistas de lista (Bandeja de entrada, Hoy, Proyecto, Completado)
- [x] 3.3 Ajustar la metadata de una tarea (fecha, prioridad, etc.) para que acompañe al título en vez de pegarse al borde derecho en pantallas anchas
- [x] 3.4 Verificar visualmente en escritorio ancho, escritorio angosto y teléfono que el ancho de columna y la distancia título–metadata se comportan según lo especificado

## 4. Selectores de atributos

Consumen las primitivas; los consume el componente de alta.

- [x] 4.1 Consultar la skill `ui-ux-pro-max` para el estilo de los selectores de fecha, fecha límite y prioridad
- [x] 4.2 Selector de fecha: campo de texto en lenguaje natural que delega en `lib/parser/`, sin implementar una segunda interpretación propia
- [x] 4.3 Selector de fecha: accesos rápidos (hoy, mañana, este fin de semana, próxima semana), mostrando junto a cada uno el día concreto al que corresponde
- [x] 4.4 Selector de fecha: calendario mensual navegable hacia meses anteriores y siguientes
- [x] 4.5 Selector de fecha: agregar hora (mueve el valor a `due_at` y deja `due_date` sin valor) y duración estimada (`duration_minutes`)
- [x] 4.6 Selector de fecha límite: mismo campo de texto, accesos rápidos y calendario, aplicados sobre `deadline`, con etiqueta y ubicación propias que lo distingan del selector de fecha
- [x] 4.7 Selector de prioridad: las cuatro prioridades con su color y su nombre, usando el rojo de marca `#EC1E2A` solo para Urgente
- [x] 4.8 Verificar que ninguno de los tres selectores renderiza `<input type="date">`, `<input type="time">` ni `<select>` nativo
- [x] 4.9 Tests: el selector de fecha resuelve lo mismo que el parser para los casos cubiertos por `docs/parser-test-cases.md`

## 5. Componente de alta de tareas

Usa los selectores (design.md, sección E).

- [ ] 5.1 Consultar la skill `ui-ux-pro-max` para el diseño del componente de alta rico
- [ ] 5.2 Construir el componente de alta con título, descripción, y accesos a fecha, prioridad, fecha límite y proyecto destino, usando los selectores de `selectores-de-atributos`
- [ ] 5.3 Conservar el reconocimiento de lenguaje natural del parser en el campo de título (resaltado en vivo mientras se escribe, doble clic desactiva un token) sin degradarlo
- [ ] 5.4 Mostrar el proyecto o la sección de destino antes de confirmar la creación
- [ ] 5.5 Acciones de confirmar y cancelar: cancelar no crea ninguna tarea ni persiste nada
- [ ] 5.6 Reservar en la composición un lugar para recordatorios y para etiquetas, sin mostrar ningún control de esos dos atributos, ni siquiera deshabilitado
- [ ] 5.7 Verificar que no existe ningún control de adjuntar archivos, ni implementado ni deshabilitado
- [ ] 5.8 Reemplazar el alta de solo título por este componente en las vistas Bandeja de entrada, Hoy y Proyecto
- [ ] 5.9 Reemplazar el alta de solo título por este componente dentro de cada sección de un proyecto, preconfigurado con esa sección como destino
- [ ] 5.10 Reemplazar el alta de solo título por este componente al crear una subtarea desde el detalle de una tarea existente, preconfigurado con esa tarea como padre
- [ ] 5.11 Verificar que ninguna de esas superficies conserva su propia implementación de alta
- [ ] 5.12 Tests: el contrato del parser sigue pasando desde el nuevo componente de alta en cada una de sus superficies

## 6. Detalle de tarea como modal

Usa el alta y los selectores (design.md, sección E). **BREAKING** respecto de `docs/product-spec.md` §3 ya actualizado en 1.5.

- [ ] 6.1 Consultar la skill `ui-ux-pro-max` para el diseño del modal de detalle centrado
- [ ] 6.2 Migrar el detalle de tarea de panel lateral a modal centrado por encima de la pantalla, sin ningún control para redimensionarlo
- [ ] 6.3 Mantener pantalla completa en teléfono
- [ ] 6.4 Quitar la persistencia del ancho del panel en `localStorage`, que deja de tener sentido con el modal
- [ ] 6.5 Reemplazar los tres campos nativos del detalle (`type="date"` en fecha de vencimiento y en fecha límite, `type="datetime-local"` en la hora) por los selectores propios de `selectores-de-atributos`
- [ ] 6.6 Verificar que el título y la descripción se siguen autoguardando sin ninguna acción explícita de guardado
- [ ] 6.7 Verificar que la ruta `app/(app)/tarea/[id]` y "abrir en ventana aparte" siguen funcionando igual que antes del cambio

## 7. Editor de descripción

Vive dentro del detalle (design.md, sección E).

- [ ] 7.1 Consultar la skill `ui-ux-pro-max` para el estilo de la zona de edición y la barra de herramientas
- [ ] 7.2 Instalar las extensiones de Tiptap registradas en la decisión D31 (1.4), acotadas a lo pedido
- [ ] 7.3 Delimitar visualmente la zona de edición (borde, fondo o superficie propia) del resto del detalle
- [ ] 7.4 Barra de herramientas: títulos, negrita, cursiva, tachado, resaltado, código en línea, listas con viñetas, listas numeradas, listas de tareas, cita
- [ ] 7.5 Autodetección de sintaxis de markdown en la entrada (por ejemplo, `# ` produce un título), verificando que lo guardado sigue siendo el documento jsonb de Tiptap sin marcas de markdown almacenadas
- [ ] 7.6 Menú contextual propio con opciones de formato, párrafo, insertar y portapapeles —incluida "pegar sin formato"—, reemplazando el menú nativo del navegador
- [ ] 7.7 Menú de insertar: tabla, nota al pie, bloque de código, regla horizontal, destacado
- [ ] 7.8 Diálogo propio del editor para insertar y editar enlaces, reemplazando el `window.prompt` de la auditoría A1
- [ ] 7.9 Verificar que no existe ninguna opción de fórmula matemática en la barra, el menú de insertar ni el menú contextual
- [ ] 7.10 Verificar que el autoguardado no pisa una edición en curso cuando llega una actualización remota (Realtime) mientras se está escribiendo
- [ ] 7.11 Tests: el autoguardado persiste el último contenido escrito, nunca una versión intermedia que descarte pulsaciones recientes

## 8. Modal de proyecto

Con emojis y color (design.md, sección E). Incluye la migración de esquema que este escalón necesita.

- [ ] 8.1 Consultar la skill `ui-ux-pro-max` para el diseño del selector de color y del selector de emojis
- [ ] 8.2 Migración: ampliar el check constraint de `projects.color` para admitir un color personalizado válido, además de los diez identificadores de la paleta
- [ ] 8.3 Regenerar los tipos con `pnpm db:types` tras la migración
- [ ] 8.4 Instalar la fuente de datos de emojis categorizada registrada en la decisión D31 (1.4)
- [ ] 8.5 Selector de color: lista desplegable con nombre y muestra de los diez colores de la paleta como camino principal y primera opción, con el color personalizado al final de la lista
- [ ] 8.6 Validar por contraste el color personalizado contra el fondo de superficie de los dos temas antes de guardar, rechazando el que no alcance el mínimo AA en cualquiera de los dos
- [ ] 8.7 Selector de emojis: todos los emojis, categorizados y buscables, cargado recién al abrirse el selector, no con el arranque de la aplicación
- [ ] 8.8 Elegir proyecto padre al crear, con "sin padre" por defecto, respetando el máximo de tres niveles ya impuesto en base de datos
- [ ] 8.9 Marcar favorito desde la misma alta de proyecto
- [ ] 8.10 Verificar que un color inválido (ni de la paleta ni personalizado con formato válido) se rechaza tanto en la validación de Zod como en el check constraint

## 9. Configuración como modal

- [ ] 9.1 Consultar la skill `ui-ux-pro-max` para el diseño del modal de configuración con secciones navegables
- [ ] 9.2 Migrar la configuración de pantalla propia a modal por encima de la vista actual, con secciones navegables
- [ ] 9.3 Verificar que en fase 1 solo aparecen las secciones Cuenta, General, Tema e Instalación, sin Notificaciones ni Calendarios
- [ ] 9.4 Sección Cuenta: mostrar si el acceso se hizo con Google ofreciendo desvincularlo, sin ofrecer ningún flujo para vincular Google a una cuenta creada con correo y contraseña
- [ ] 9.5 Verificar que ninguna sección se muestra deshabilitada, en gris, ni con aviso de "próximamente"

## 10. Panel lateral

- [ ] 10.1 Consultar la skill `ui-ux-pro-max` para el botón de agregar tarea y el menú de cuenta agrupado
- [ ] 10.2 Agregar el botón de agregar tarea al panel lateral, abriendo el componente de alta de `alta-de-tareas`
- [ ] 10.3 Agrupar cambiar tema, Configuración y cerrar sesión en un menú de cuenta al pie del panel, en vez de mostrarlos sueltos
- [ ] 10.4 Verificar que el control de colapsar sigue siendo distinguible del resto de los accesos

## 11. Verificación final

- [ ] 11.1 Auditar que no queda ningún `<input type="date">`, `<input type="time">`, `<input type="datetime-local">` ni `<input type="color">`, y ningún `window.confirm`, `window.alert` ni `window.prompt`, en toda la aplicación
- [ ] 11.2 Verificar que el parser y su resaltado en vivo siguen funcionando dentro del componente de alta nuevo, en cada una de sus superficies
- [ ] 11.3 Verificar que el autoguardado del editor de descripción no pisa lo que se está escribiendo ante una actualización remota concurrente
- [ ] 11.4 Correr `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 11.5 Correr las pruebas de punta a punta (`pnpm test:e2e`) en verde, actualizando las que referenciaban el panel lateral de detalle para que apunten al modal
- [ ] 11.6 Recorrer manualmente en escritorio y en teléfono los nueve escalones de este cambio, en el orden fijado por `design.md` sección E
