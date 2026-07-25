# Arranque

Este archivo es para vos, no para el agente. Contiene el prompt de arranque y el
orden de las cosas. Se puede borrar una vez que el proyecto está andando.

---

## Antes de abrir Claude Code

1. Crear el directorio y dejar los archivos:

```
/home/juanmanuellosada/Documentos/Proyectos/trazio/
├── AGENTS.md
├── CLAUDE.md
├── KICKOFF.md
├── .claude/
│   └── rules/
│       ├── frontend.md
│       ├── database.md
│       └── copy.md
└── docs/
    ├── product-spec.md
    ├── data-model.md
    ├── landing.md
    ├── roadmap.md
    ├── decisions.md
    └── setup-google-calendar.md
```

2. `git init` y primer commit con la documentación. Que el historial arranque con
   el plan, no con código.

3. Crear el repo en GitHub (vacío) y agregarlo como remoto.

4. Crear el proyecto en Supabase y anotar la URL y las claves. Todavía no hace falta
   crear tablas.

5. Verificar que la skill esté donde decís:
   `ls ~/.claude/skills/ui-ux-pro-max/`

---

## Prompt de arranque

Abrir Claude Code en el directorio del proyecto y pegar esto:

---

Arrancamos un proyecto nuevo: **Trazio**, un gestor de tareas personal en español
para Argentina. El directorio está vacío salvo por la documentación, que ya está
escrita y es la fuente de verdad.

**Antes de proponer nada, leé en este orden:**

1. `AGENTS.md` — stack, estructura, comandos y restricciones no negociables
2. `CLAUDE.md` — cómo se trabaja en este proyecto
3. `docs/product-spec.md` — el funcional completo
4. `docs/data-model.md` — el modelo de datos
5. `docs/roadmap.md` — las cuatro fases
6. `docs/decisions.md` — decisiones ya tomadas, con su razón
7. `docs/landing.md` — la landing de la fase 1

Delegá esa lectura a `Explore` en vez de leer los archivos vos mismo, y volvé con
un resumen corto de lo que entendiste.

**Después, en este orden:**

**Primero, las skills.** Instalá con `find-skills` las que correspondan al stack.
Buscá y presentame las opciones para: Next.js App Router, Supabase con Postgres y
RLS, Tailwind con shadcn, y autenticación con Supabase en Next.js. No instales nada
sin mostrarme antes qué encontraste y cuántas instalaciones tiene cada una. Tené en
cuenta el límite de 15.000 caracteres para descripciones de skills en el system
prompt: si hay que elegir, priorizá Supabase y Next.js.

`ui-ux-pro-max` ya está instalada en `~/.claude/skills/ui-ux-pro-max/` y es la que
manda en cualquier decisión visual. No la reinstales.

**Segundo, OpenSpec.** Verificá que esté inicializado en el proyecto. Si no lo está,
corré `openspec init --tools claude` y avisame para reiniciar y que se registren los
slash commands.

**Tercero, la fase 1.** Cuando lo anterior esté listo, corré `/opsx:propose` para la
fase 1 tal como está definida en `docs/roadmap.md`. Revisamos la propuesta juntos
antes de que se escriba una sola línea de código.

**Cosas que quiero que tengas presentes desde el arranque:**

- No hay modo offline. Es una decisión tomada, no un pendiente.
- La app es solo en español. No montes i18n.
- El título de las tareas es texto plano.
- Toda tabla nace con RLS habilitado en la misma migración que la crea.
- El parser de lenguaje natural en español es la pieza diferencial del producto.
  Va con tests desde el primer commit, y el caso "la mañana" ≠ "mañana" tiene que
  estar cubierto.

No escribas código todavía. Empezá por la lectura y contame qué entendiste.

---

## Después de la propuesta de la fase 1

El flujo sigue tu patrón habitual:

1. Revisás `proposal.md`, `design.md` y `tasks.md` con el agente.
2. Ajustás lo que no te cierre. **Ahora es barato**; después de escrito, no.
3. Delegás la implementación a `executor` por tandas de tareas.
4. Delegás una verificación al final.
5. `/opsx:archive` cuando esté cerrada.

## Orden sugerido dentro de la fase 1

Aunque OpenSpec arme su propio desglose, este orden evita retrabajo:

1. Scaffolding, Tailwind, shadcn, deploy vacío a Vercel funcionando.
2. Esquema de base de datos completo con RLS y tipos generados.
3. Auth de punta a punta, incluido el reset de contraseña.
4. Layout de la app: panel lateral, navegación, tema.
5. Proyectos y secciones.
6. Tareas: CRUD, subtareas, completar, con optimistic updates.
7. Vistas Bandeja, Hoy, Proyecto, Completado.
8. El parser de lenguaje natural, con su batería de tests.
9. Realtime.
10. Configuración.
11. La landing, ya con la app funcionando para poder sacar capturas reales.
12. PWA: manifest, íconos, instalable.

La landing va al final a propósito: necesita capturas del producto real, y hacerlas
antes obliga a rehacerlas.

## Lo primero que conviene probar vos

Apenas el punto 8 esté listo, usá Trazio un día entero con tus tareas de verdad.
Vas a encontrar en dos horas de uso más cosas que en dos semanas de revisión.
