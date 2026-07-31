# Trazio — Roadmap

Cuatro fases. Cada una es **una propuesta de OpenSpec** (`/opsx:propose`), no una
tanda de tareas sueltas.

Una fase no se da por terminada hasta que cumple todos sus criterios de aceptación.
No se empieza la siguiente con la anterior a medias.

---

## Fase 1 — Base usable

**Objetivo:** que puedas usar Trazio todos los días para tus tareas reales, y que
alguien más pueda registrarse y hacer lo mismo.

### Alcance

**Infraestructura**
- Proyecto Next.js con TypeScript, Tailwind y shadcn/ui.
- Supabase conectado: esquema, migraciones, RLS, tipos generados.
- Deploy en Vercel desde GitHub, con entornos de preview.
- Manifest de PWA e íconos. Instalable.

**Autenticación**
- Registro con nombre, correo y contraseña.
- Registro e inicio de sesión con Google.
- Confirmación de correo vía Resend.
- **Recuperación de contraseña funcionando de punta a punta**, con página de reset real.
- Middleware que protege las rutas privadas.
- Al registrarse se crean automáticamente el perfil, las preferencias y la Bandeja
  de entrada.

**Landing** — según `docs/landing.md`, incluida la demo del parser.

**Producto**
- Proyectos: crear, editar, anidar hasta 3 niveles, favoritos, archivar, eliminar
  con confirmación, reordenar.
- Secciones: crear, renombrar, reordenar, colapsar, eliminar.
- Tareas: crear, editar, completar, descompletar, duplicar, mover, reordenar,
  eliminar, copiar enlace.
- Subtareas anidadas.
- Prioridades, fecha de vencimiento con hora opcional, duración estimada, fecha límite.
- Descripción con Tiptap.
- Vistas: Bandeja de entrada, Hoy, Proyecto, Completado.
- Modo lista (el panel y el calendario quedan para después).
- Alta rápida con parseo de lenguaje natural en español.
- Etiquetas: crear por `#` desde el alta rápida, asignar, mostrar el chip,
  agregar o quitar desde el detalle de la tarea, y administración completa desde
  una pantalla propia (implementada en el refinamiento de interfaz, capacidad
  `administracion-de-etiquetas`). La página propia por etiqueta y las favoritas
  quedan para la fase 2.
- Configuración: perfil, tema, zona horaria, formatos, día de inicio de semana.
- Realtime entre pestañas y dispositivos.
- Optimistic updates en completar, editar, mover y reordenar.

### Criterios de aceptación

- [ ] Una persona se registra, confirma el correo, olvida la contraseña, la
      recupera y vuelve a entrar. Sin intervención manual.
- [ ] El parser reconoce correctamente todos los casos de prueba de
      `docs/parser-test-cases.md`, incluido "la mañana" ≠ "mañana".
- [ ] Completar una tarea se ve instantáneo. Si el servidor falla, se revierte y
      se avisa.
- [ ] Un cambio en una pestaña aparece en otra en menos de dos segundos.
- [ ] Sin internet, la app avisa y no permite escribir. No pierde nada porque no
      promete nada.
- [ ] Eliminar un proyecto pide confirmación mostrando cuántas tareas se pierden.
- [ ] Lighthouse en la landing: rendimiento y accesibilidad por encima de 90.
- [ ] La app se instala desde el navegador y abre a pantalla completa.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] Tests e2e del flujo completo: registrarse → crear proyecto → crear tarea con
      lenguaje natural → completarla.

---

## Fase 2 — Potencia

**Objetivo:** que deje de ser una lista y pase a ser un sistema.

### Alcance

- Etiquetas: página propia por etiqueta y favoritas. La administración completa
  ya se implementó en la fase 1.
- Filtros: lenguaje de consulta, parser, errores en español, vista previa de
  coincidencias, favoritos.
- Vista Próximos, en lista y en panel.
- Modo panel en Bandeja y Proyecto.
- Buscador con full-text en español.
- Comentarios.
- Recordatorios push: suscripción, edge function con cron, entrega única, badge con
  el conteo del día.
- Atajos de teclado completos.
- Selección múltiple con acciones en lote.
- Deshacer: ya existe el toast con opción de deshacer al eliminar una tarea
  (`lib/tasks/mutations.ts`, con snapshot del subárbol en `lib/tasks/subtree.ts`
  y restauración en `lib/tasks/restore.ts`). Falta el atajo `Ctrl/Cmd+Z`, la
  pila de acciones, extenderlo al resto de las acciones destructivas, y que la
  restauración incluya las etiquetas (`task_labels`), que hoy no restaura.
- Barra de opciones de vista, con memoria por pantalla.
- Tareas recurrentes con RRULE. Las columnas `recurrence_rule`,
  `recurrence_ends_at` y `recurrence_count` ya existen en `tasks`, y el parser
  ya arma un RRULE válido y lo guarda. Falta interpretarlo (nada lo lee
  todavía; la dependencia `rrule` está instalada pero sin usar) y la interfaz
  para editar la recurrencia.

### Criterios de aceptación

- [x] `(priority:1,2 & due:next7days) & !label:espera` devuelve exactamente lo
      esperado, y un error de sintaxis se explica en español señalando la posición.
- [ ] Un recordatorio programado llega una vez, a horario, en todos los
      dispositivos suscritos. No llega dos veces. (Solo se verificó localmente
      que `claim_due_reminders()` entrega una sola vez ante ejecuciones
      solapadas del cron; la entrega real por push queda pendiente de una
      prueba en producción con un dispositivo real.)
- [x] Completar una tarea recurrente genera la siguiente con todos los atributos
      heredados.
- [x] Eliminar una tarea y hacer `Ctrl+Z` la restaura completa: subtareas,
      etiquetas, comentarios.
- [x] Todos los atajos funcionan y ninguno se dispara escribiendo en un campo de
      texto (salvo deshacer).
- [x] La búsqueda encuentra "reunión" buscando "reunion".

---

## Fase 3 — Hábitos

**Objetivo:** lo que querés sostener, no solo lo que tenés que hacer.

### Alcance

- CRUD de hábitos con los tres tipos de frecuencia.
- Marcado desde Hoy y desde la pantalla de Hábitos.
- Cálculo de racha actual y mejor racha, por tipo.
- Mini-mapa de los últimos 14 días.
- Estadísticas del encabezado.
- Archivar y desarchivar, con historial intacto.
- Reprogramación por día puntual.
- Hábitos integrados en la vista Hoy y en el contador de pendientes.

### Criterios de aceptación

- [ ] Las rachas son correctas en los tres tipos, incluidos los bordes: cambio de
      semana, día en curso con margen de gracia, hábito creado a mitad de semana.
- [ ] Un hábito no aparece en fechas anteriores a su creación.
- [ ] Archivar conserva el historial completo; desarchivar lo devuelve intacto.
- [ ] Las rachas se calculan, no se guardan denormalizadas.

---

## Fase 4 — Calendario

**Objetivo:** todo junto en una línea de tiempo.

Antes de escribir código, seguir `docs/setup-google-calendar.md` para crear las
credenciales.

### Alcance

- OAuth con Google, con refresh token cifrado del lado servidor.
- Selección de calendarios a mostrar.
- Lectura de eventos con caché corta.
- Crear, editar, mover y eliminar eventos desde Trazio.
- Crear, renombrar, recolorear y eliminar calendarios.
- Vista de calendario: día, cuatro días, semana y mes.
- Arrastrar y redimensionar tareas, hábitos y eventos, con ajuste a 15 minutos.
- Crear arrastrando sobre espacio vacío, preguntando si es evento o tarea.
- Chips de hábitos sin horario, programables por arrastre.
- Vista previa de repeticiones futuras.
- Aviso de reconexión cuando el token se vence.

### Criterios de aceptación

- [ ] Se conecta una cuenta de Google y los eventos aparecen con su color.
- [ ] Un evento editado en Trazio se refleja en Google Calendar, y al revés tras
      refrescar.
- [ ] Mover un bloque en el calendario ajusta a 15 minutos y persiste.
- [ ] Al vencer el token aparece el aviso de reconexión y reconectar funciona.
- [ ] Las tareas de Trazio **no** se publican en Google.

---

## Orden y dependencias

```
Fase 1 ──> Fase 2 ──> Fase 3 ──> Fase 4
             │                      ▲
             └── RRULE ─────────────┘
```

RRULE se implementa en la fase 2 para las tareas recurrentes, y en la fase 4 se
reutiliza para los eventos. Por eso no se usa un formato propio.

## Lo que no está en ninguna fase

Ver la sección "Fuera de alcance" de `docs/product-spec.md`. Si algo aparece como
idea nueva, primero se discute y se anota en `docs/decisions.md`; no se cuela en una
fase existente.
