## 1. Correcciones de documentación y registro de decisiones

Bloque bloqueante: las decisiones cerradas por el dueño del proyecto cambian el resultado de casos del contrato del parser y el alcance del esquema. Se registran en `docs/decisions.md` y se corrige la documentación antes de escribir código.

- [x] 1.1 Registrar en `docs/decisions.md` las ocho decisiones ya cerradas por el dueño del proyecto, cada una con su razón: etiquetas adelantadas a fase 1 con su alcance acotado, "próxima semana" según `week_starts_on` y no un lunes fijo, asimetría al caer la fecha hoy entre día de la semana suelto y fin de semana, los tres casos nuevos del contrato del parser, las versiones confirmadas del stack, la paleta fija de colores, y que el texto de términos y privacidad lo provee el dueño
- [x] 1.2 Actualizar `docs/roadmap.md`: el criterio de aceptación del parser deja de decir "los 30 casos de prueba del spec" y apunta a `docs/parser-test-cases.md` con la cantidad real de casos
- [x] 1.3 Corregir la línea 6 de `docs/parser-test-cases.md`, que repite el número desactualizado de 30 casos
- [x] 1.4 Agregar en `docs/product-spec.md` §6 una referencia cruzada a `docs/parser-test-cases.md` como contrato canónico, sin duplicar la tabla
- [x] 1.5 Reformular el blockquote de la regla crítica de `docs/product-spec.md` §6, que hoy afirma que "esta mañana" no se interpreta cuando el caso 45 sí emite `due_date = hoy`
- [x] 1.6 Incorporar al contrato los tres casos nuevos: "Gimnasio cada lunes a las 8" (repetición con hora), entradas sin acentos o en mayúsculas, y texto parcial que no produce atributos; actualizar la cantidad total en los tres lugares donde aparece
- [x] 1.7 Registrar en `docs/parser-test-cases.md` las reglas nuevas R8 (preposiciones y artículos) y las precisiones sobre R5, R7, año de dos dígitos y hora ya pasada
- [x] 1.8 Registrar las siete reglas R1 a R7 y las nuevas como decisiones en `docs/decisions.md`, que es lo que el propio contrato manda y hoy no está hecho
- [x] 1.9 Reemplazar en `docs/landing.md` el bloque "Atajos de teclado — sin soltar las manos" de la grilla de Funcionalidades por "Sincronización al instante — abrís en la compu y en el teléfono, siempre igual", y mover los atajos a "Lo que viene"
- [x] 1.10 Agregar React Hook Form a la lista de librerías decididas de `AGENTS.md` y registrar la decisión **D13** en `docs/decisions.md` (junto con Zod, esquema único en `lib/validation/` compartido entre cliente y servidor)
- [x] 1.11 Corregir en `AGENTS.md` la ruta `app/(app)/inbox/` por `app/(app)/bandeja/`, y agregar `app/(app)/tarea/[id]/`
- [x] 1.12 Consultar la skill `ui-ux-pro-max` para definir estilo, paleta y tipografía del producto, y documentar la paleta fija de colores del proyecto, ya decidida, con los colores concretos definidos

## 2. Scaffolding e infraestructura

- [x] 2.1 Crear el proyecto Next.js 16 con App Router y TypeScript `strict`, verificando las versiones exactas contra el registro al momento de instalar
- [x] 2.2 Fijar Node 24 LTS en `.nvmrc` y en `engines` del `package.json`, y pnpm como gestor
- [x] 2.3 Configurar Tailwind v4 y verificar la instalación de shadcn/ui sobre v4 consultando `context7` o la skill `vercel:shadcn` antes de improvisar
- [x] 2.4 Instalar las librerías de fase 1: TanStack Query, dnd-kit, Tiptap, Zod, React Hook Form, date-fns, date-fns-tz, rrule, Vitest y Playwright
- [x] 2.5 Configurar los scripts de `AGENTS.md`: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:types`
- [x] 2.6 Crear la estructura de carpetas de `AGENTS.md` con las correcciones de 1.11
- [x] 2.7 Documentar las variables de entorno de la tabla A2 del design en un `.env.example`, con `SUPABASE_SERVICE_ROLE_KEY` marcada como exclusiva de servidor
- [x] 2.8 Mover `logo.png` a `public/` y generar los íconos 192, 512 y maskable
- [x] 2.9 Conectar el repositorio a Vercel y verificar que un deploy vacío levanta con entornos de preview por rama
- [x] 2.10 Configurar Vitest y Playwright, y dejar el gate `pnpm lint && pnpm typecheck && pnpm test` en verde sobre el proyecto vacío

## 3. Esquema de base de datos y RLS

Cada tabla va en su propia migración, con RLS y sus índices adentro. Después de cada migración, `pnpm db:types`.

- [x] 3.1 Levantar Supabase local y conectar el proyecto remoto
- [x] 3.2 Migración de `profiles` con RLS, las cuatro políticas con `(select auth.uid()) = user_id` y su índice
- [x] 3.3 Migración de `user_preferences` con RLS, políticas, defaults de B4 y check constraints de `date_format`, `default_view`, `theme`, `time_format` y `week_starts_on`
- [x] 3.4 Migración de `projects` con RLS, políticas, índice único parcial de un solo `is_inbox` por usuario, constraint de 3 niveles de anidamiento, constraint que impide que un proyecto sea su propio ancestro y check constraint de la paleta de colores
- [x] 3.5 Trigger que impide borrar la Bandeja de entrada, archivarla o quitarle el `is_inbox`
- [x] 3.6 Migración de `sections` con RLS, políticas, `project_id ON DELETE CASCADE` e índices
- [x] 3.7 Migración de `tasks` con RLS, políticas, constraint de exclusión entre `due_date` y `due_at`, `priority` default 4, `section_id ON DELETE SET NULL`, `project_id` y `parent_id` en cascada
- [x] 3.8 Índices de `tasks`: `(user_id, due_date)`, `(user_id, due_at)`, `(user_id, project_id, position)`, `(user_id, completed_at)` y `(parent_id)`
- [x] 3.9 Migración de `labels` con RLS, `name` único por usuario, `color` de la paleta fija y su índice
- [x] 3.10 Migración de `task_labels` con PK compuesta, ambas FK en cascada y `user_id` propio para RLS
- [x] 3.11 Trigger que valida que el proyecto y la sección destino pertenezcan al mismo usuario al mover una tarea
- [x] 3.12 Trigger de aprovisionamiento sobre `auth.users` que crea perfil, preferencias y Bandeja de entrada en una sola transacción, con los valores iniciales de B3
- [x] 3.13 Función de rebalanceo de `position` cuando la diferencia entre vecinos baja de 0,0001, con espaciado inicial de 1000
- [x] 3.14 Habilitar replicación de Realtime en `tasks`, `projects`, `sections`, `labels` y `task_labels`
- [x] 3.15 Generar los tipos con `pnpm db:types` y verificar que compilan
- [x] 3.16 Tests de RLS: con dos usuarios distintos, verificar que ninguno ve, edita ni borra filas del otro en las siete tablas

## 4. Autenticación de punta a punta

- [x] 4.1 Configurar los tres clientes de `@supabase/ssr`: servidor, navegador y el de middleware que refresca la sesión
- [x] 4.2 Middleware que protege `app/(app)/**` y redirige a login conservando el destino
- [x] 4.3 Esquemas de Zod de registro y login en `lib/validation/`, con la contraseña de 8 caracteres o más, compartidos entre cliente y servidor
- [x] 4.4 Configurar el mínimo de 8 caracteres también en Supabase Auth
- [x] 4.5 Pantalla de registro con nombre, correo y contraseña, usando React Hook Form + Zod
- [x] 4.6 Pantalla de inicio de sesión
- [x] 4.7 Registro e inicio de sesión con Google OAuth, con el callback y el redirect configurados
- [x] 4.8 Registrar `trazio.com.ar` en NIC Argentina (insumo del dueño del proyecto, no lo hace la implementación)
- [x] 4.9 Apuntar el dominio a Vercel y configurarlo como dominio de producción del proyecto
- [x] 4.10 Crear la cuenta de Resend y verificar el subdominio de envío `envios.trazio.com.ar` con sus registros SPF, DKIM, MX de return-path y DMARC
- [x] 4.11 Configurar el SMTP propio de Supabase Auth con las credenciales de Resend, para que la confirmación de cuenta y el reset salgan desde el dominio verificado y no por el SMTP compartido de Supabase, que está limitado a unos pocos envíos por hora y no es para producción
- [x] 4.12 Cargar `NEXT_PUBLIC_SITE_URL` por entorno en Vercel: el dominio propio en Production, y en Preview derivada de `VERCEL_URL`. Si se fija al dominio de producción, el login con Google y el link de reset se rompen en cada preview, que es justo donde se prueba
- [x] 4.13 Configurar las URLs de redirección en Supabase Auth: la Site URL en el dominio propio, y en Redirect URLs el dominio, el `www`, `localhost` y el comodín de los previews de Vercel. Sin el comodín, el login con Google y el link de reset fallan en cada rama nueva
- [x] 4.14 Integrar Resend y configurar las plantillas de confirmación de correo y de reset de contraseña
- [x] 4.15 Flujo de recuperación: pantalla para pedir el correo, envío del link, página de reset real que valida el token, cambio de contraseña y sesión iniciada
- [x] 4.16 Cerrar sesión limpiando todo lo local
- [x] 4.17 Mensajes de error de auth en tres partes (qué pasó, por qué, qué hacer), sin códigos técnicos y sin usar rojo de marca para el error
- [x] 4.18 Verificar que al primer login existen el perfil, las preferencias y la Bandeja de entrada

## 5. Layout de la app

- [x] 5.1 Definir el sistema visual con `ui-ux-pro-max` antes de escribir el primer componente: paleta, tipografía, espaciado y estados de interacción
- [x] 5.2 Instalar los componentes de shadcn/ui que hagan falta, de a uno
- [x] 5.3 Panel lateral de escritorio colapsable a íconos, con cuenta, accesos principales, favoritos, árbol de proyectos y pie
- [x] 5.4 Barra inferior de teléfono con tres accesos en fase 1 (Bandeja, Hoy y Agregar), dejando el cuarto lugar vacío a propósito hasta que exista Próximos
- [x] 5.5 Selector de tema claro, oscuro y sistema, con persistencia en preferencias
- [x] 5.6 Registro centralizado de toasts, con el formato de error de tres partes
- [x] 5.7 Verificar contraste AA y foco visible, y que el rojo `#EC1E2A` no se use para errores de formulario ni destructivos genéricos

## 6. Proyectos y secciones

- [x] 6.1 Consultas y mutaciones de proyectos con TanStack Query
- [x] 6.2 Crear, editar y eliminar proyectos, con nombre, color de la paleta fija, ícono emoji y descripción
- [x] 6.3 Anidamiento hasta 3 niveles en el árbol del panel lateral, con ramas colapsables y contador por proyecto
- [x] 6.4 Marcar favorito y archivar, con la sección de favoritos del panel lateral
- [x] 6.5 Diálogo de confirmación de borrado que muestra cuántas tareas se pierden, con el conteo real
- [x] 6.6 Reordenar y anidar proyectos con dnd-kit, **más** el camino equivalente por menú contextual o teclado
- [x] 6.7 La Bandeja de entrada no ofrece borrar ni archivar en la interfaz, además de estar protegida en la base
- [x] 6.8 Secciones: crear, renombrar, reordenar, colapsar y eliminar dentro de un proyecto
- [x] 6.9 Verificar que al eliminar una sección sus tareas quedan sin sección y no se borran
- [x] 6.10 Verificar que eliminar una etiqueta la quita de todas las tareas donde estaba asignada

## 7. Tareas

- [x] 7.1 Consultas y mutaciones de tareas con TanStack Query
- [x] 7.2 Crear y editar tareas con título en texto plano, prioridad, fecha de vencimiento con hora opcional, duración estimada y fecha límite
- [x] 7.3 Descripción con Tiptap, guardada como jsonb, con autoguardado
- [x] 7.4 Completar y descompletar con optimistic update, reversión y aviso si el servidor rechaza
- [x] 7.5 Subtareas anidadas sin límite de niveles
- [x] 7.6 Duplicar según F2: copia campos propios y subtareas recursivamente, nace pendiente, sin sufijo en el título, insertada justo después del original
- [x] 7.7 Mover una tarea entre proyectos y secciones, con optimistic update
- [x] 7.8 Reordenar con dnd-kit y su camino alternativo por teclado o menú contextual, con optimistic update
- [x] 7.9 Eliminar una tarea
- [x] 7.10 Panel lateral de detalle redimensionable que recuerda el ancho, y pantalla completa en teléfono
- [x] 7.11 Ruta `app/(app)/tarea/[id]` a pantalla completa con su propio `<title>`, y la acción de copiar enlace directo que apunta ahí
- [x] 7.12 Asignar y desasignar etiquetas desde el detalle de la tarea, reemplazando el conjunto completo en cada guardado

## 8. Vistas

- [x] 8.1 Bandeja de entrada: tareas sin proyecto, en modo lista
- [x] 8.2 Hoy: bloque de atrasadas destacado, tareas de hoy y completadas opcionales, con el botón de agregar precargando la fecha de hoy
- [x] 8.3 Contador de Hoy en el panel lateral contando solo tareas (F1)
- [x] 8.4 Proyecto: primero las tareas sin sección, después las secciones colapsables con su propio botón de agregar
- [x] 8.5 Completado: lista con contador y opción de volver a marcar pendiente
- [x] 8.6 Estados vacíos de las cuatro vistas, explicando qué va a aparecer y ofreciendo la acción, con el tono de `.claude/rules/copy.md`
- [x] 8.7 Formato de fechas en lenguaje natural cuando faltan menos de siete días, respetando las preferencias de formato y zona horaria

## 9. El parser de lenguaje natural

Los tests van con el primer commit del parser, escritos antes de la lógica. Los casos críticos primero.

- [x] 9.1 Escribir `lib/parser/casos.ts` reflejando 1 a 1 la tabla del contrato, más el test que afirma que la cantidad de casos coincide con el markdown
- [x] 9.2 Escribir `lib/parser/parser.test.ts` recorriendo los casos, con el reloj congelado y corriendo en `America/Argentina/Buenos_Aires` y `Pacific/Kiritimati`
- [x] 9.3 Definir la firma pura `parse(texto, { ahora, zonaHoraria, semanaEmpiezaEn, proyectos, etiquetas })` sin lectura de reloj ni de `Intl` del sistema
- [x] 9.4 Implementar los casos críticos 44 a 52 primero, incluido el par mínimo "de la mañana" contra "de mañana"
- [x] 9.5 Implementar el caso 53 completo, que es el de la demo de la landing
- [x] 9.6 Reconocedor de fechas relativas (casos 1 a 11)
- [x] 9.7 Reconocedor de fechas puntuales con R1 día primero, R2 próxima ocurrencia y año de dos dígitos como 20YY (casos 12 a 18)
- [x] 9.8 Reconocedor de día de la semana suelto, aplicando R4 (casos 19 a 21)
- [x] 9.9 Reconocedor de horas con R3, sin rollover cuando la hora ya pasó (casos 22 a 27)
- [x] 9.10 Reconocedor de duraciones (casos 28 a 30)
- [x] 9.11 Reconocedor de repetición que emite RRULE sin fecha ancla (casos 31 a 37)
- [x] 9.12 Caso mixto de repetición con hora ("Gimnasio cada lunes a las 8"): fija `due_at` en la próxima ocurrencia además de la `RRULE`, porque de lo contrario la hora reconocida se descartaría en silencio
- [x] 9.13 Reconocedor de símbolos `p1` a `p4`, `#` y `@`, con la tokenización de E7 y la comparación sin acentos ni mayúsculas (casos 38 a 43)
- [x] 9.14 Comparación sin acentos ni mayúsculas para entradas de fecha (por ejemplo "MIERCOLES" o "miercoles") y verificación de que un texto parcial sin coincidencias deja el título intacto sin atributos
- [x] 9.15 "Próxima semana" calculada a partir de `semanaEmpiezaEn` y no de un lunes fijo, con test que verifica el resultado para distintos valores de `week_starts_on`
- [x] 9.16 Asimetría al caer la fecha hoy: un día de la semana suelto como "lunes" dicho un lunes resuelve a hoy más 7 días, mientras que "este fin de semana" dicho un sábado o domingo resuelve a hoy
- [x] 9.17 Fase de resolución que aplica R4 y R5 con "primera en el texto", y recién después remueve los rangos ganadores del título
- [x] 9.18 Implementar R8: consumo de preposiciones y artículos solo cuando son parte léxica de la locución, con normalización de espacios y sin tocar los artículos huérfanos
- [x] 9.19 Borde que garantiza que el parser nunca tira una excepción: ante cualquier entrada, texto entero como título sin atributos
- [x] 9.20 Alta rápida: campo con resaltado en vivo, debounce de 120 ms, doble clic que desactiva un match y descarta su atributo, y remoción del token al confirmar
- [x] 9.21 Creación implícita de una etiqueta desde el alta rápida cuando el `#` no coincide, sin acentos ni mayúsculas, con ninguna etiqueta existente
- [x] 9.22 Verificar que un candidato descartado por R4 no queda resaltado (E9)
- [x] 9.23 Tests de componente del alta rápida que cubren R7, que es de interfaz y no tiene caso en la tabla
- [x] 9.24 Destino por defecto del alta rápida cuando no se usa `@`, según el proyecto por defecto de las preferencias (ver nota de interpretación en el reporte de esta tarea: usa el proyecto ambiente del campo, no `user_preferences.default_project_id` directamente — hoy son equivalentes en todas las superficies existentes)
- [x] 9.25 Verificar que la suite completa pasa en las dos zonas horarias

## 10. Realtime, optimistic updates y estado sin conexión

- [x] 10.1 Suscripción de Realtime por tabla filtrada por `user_id` sobre `tasks`, `projects` y `sections`
- [x] 10.2 Manejador que invalida la query correspondiente, sin mutar el caché a mano
- [x] 10.3 Implementar la regla D3: si hay mutaciones en vuelo sobre las claves afectadas, no invalidar y dejar que lo haga el `onSettled` de la mutación
- [x] 10.4 Test que dispara un evento de Realtime con una mutación en vuelo y verifica que la interfaz no parpadea
- [x] 10.5 Detección de estado sin conexión con las tres señales de D4, sin healthcheck periódico
- [x] 10.6 Cartel persistente, campos de escritura deshabilitados y botones inertes en estado offline
- [x] 10.7 Verificar que un cambio hecho en una pestaña aparece en otra en menos de dos segundos

## 11. Configuración

- [ ] 11.1 Pantalla de configuración con las secciones de fase 1
- [ ] 11.2 Perfil: nombre editable, correo no editable, cambiar contraseña
- [ ] 11.3 Tema claro, oscuro y sistema
- [ ] 11.4 Zona horaria con la lista IANA completa obtenida con `Intl`
- [ ] 11.5 Formato de fecha, formato de hora 12 o 24, día de inicio de semana y pantalla por defecto
- [ ] 11.6 Sección de instalación de la PWA, con las instrucciones para iPhone
- [ ] 11.7 Verificar que las preferencias afectan de verdad el formateo de fechas y horas en las cuatro vistas y en el parser

## 12. Landing

Va al final a propósito: necesita capturas del producto real.

- [ ] 12.1 Definir el diseño de la landing con `ui-ux-pro-max`, móvil primero
- [ ] 12.2 Hero con titular, subtítulo, un solo CTA, la línea "Gratis. Sin tarjeta." y la captura real de la vista Hoy
- [ ] 12.3 Demo del parser en vivo como única isla cliente, importando la función pura y con listas de proyectos y etiquetas vacías
- [ ] 12.4 Los cuatro ejemplos precargados, incluido el caso 53
- [ ] 12.5 Sección del problema, en tres o cuatro líneas y sin hablar de productividad como valor moral
- [ ] 12.6 Grilla de funcionalidades con seis bloques, ya con "Sincronización al instante" en lugar de los atajos, cada uno con su captura real
- [ ] 12.7 Sección "Lo que viene" con hábitos, filtros, recordatorios, Google Calendar y atajos de teclado, presentados como hoja de ruta
- [ ] 12.8 Cierre con el mismo CTA del hero, y pie con logo, año y links a términos y privacidad
- [ ] 12.9 Páginas de términos y privacidad, con el texto que provee el dueño del proyecto como insumo externo; sin ese texto, esta tarea bloquea la publicación de la landing
- [ ] 12.10 Metadatos completos con Open Graph, imagen y `lang="es-AR"`
- [ ] 12.11 Optimización de imágenes: formato moderno, dimensiones declaradas y prioridad de carga en la del hero
- [ ] 12.12 Vercel Analytics con las cuatro métricas, dos de ellas como eventos personalizados
- [ ] 12.13 Verificar que no hay ningún `'use client'` en la landing fuera de la demo del parser

## 13. PWA

- [x] 13.1 Manifest con `display: standalone`, íconos y color de tema
- [x] 13.2 Service worker mínimo, sin manejador de `fetch` y sin caché, con un comentario que explica por qué existe y que en fase 2 suma push
- [x] 13.3 Verificar la instalación desde el navegador y la apertura a pantalla completa

## 14. Verificación de los criterios de aceptación

Cada tarea de este bloque corresponde a un criterio literal del roadmap. La fase no se cierra con ninguno pendiente.

- [ ] 14.1 E2E: una persona se registra, confirma el correo, olvida la contraseña, la recupera y vuelve a entrar, sin intervención manual
- [ ] 14.2 El parser pasa todos los casos de `docs/parser-test-cases.md`, incluido "la mañana" distinto de "mañana"
- [ ] 14.3 Verificar específicamente que el parser resuelve los casos nuevos: "Gimnasio cada lunes a las 8" con `due_at` en la próxima ocurrencia, entradas sin acentos o en mayúsculas, texto parcial sin atributos, "próxima semana" según `week_starts_on`, y la asimetría al caer la fecha hoy entre día de la semana suelto y fin de semana
- [ ] 14.4 Completar una tarea se ve instantáneo, y si el servidor falla se revierte y se avisa
- [ ] 14.5 Un cambio en una pestaña aparece en otra en menos de dos segundos
- [ ] 14.6 Sin internet, la app avisa y no permite escribir
- [ ] 14.7 Eliminar un proyecto pide confirmación mostrando cuántas tareas se pierden
- [ ] 14.8 Lighthouse en la landing por encima de 90 en rendimiento y accesibilidad, verificado en CI sobre el preview
- [ ] 14.9 La app se instala desde el navegador y abre a pantalla completa
- [ ] 14.10 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 14.11 E2E del flujo completo: registrarse, crear proyecto, crear tarea con lenguaje natural y completarla
- [ ] 14.12 Usar Trazio un día entero con tareas reales antes de dar la fase por cerrada
