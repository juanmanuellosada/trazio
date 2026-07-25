# CLAUDE.md — Trazio

Reglas específicas de Claude Code para este proyecto. Complementa el
`~/.claude/CLAUDE.md` global (orquestador + delegación a `executor` + OpenSpec).

El stack, la estructura y los comandos están en @AGENTS.md. No los repito acá.

---

## Cómo se trabaja acá

Este proyecto sigue el flujo global: **orquestador que delega**. Nada cambia.
Lo que sí es específico:

- **Cada fase del roadmap es una propuesta de OpenSpec.** No implementar una fase
  entera sin pasar por `/opsx:propose` primero. Las fases están en `docs/roadmap.md`.
- **El spec funcional es la fuente de verdad del producto.** Antes de proponer un
  cambio, leer la sección relevante de `docs/product-spec.md`. Si el spec y el
  código no coinciden, gana el spec — o se actualiza el spec de forma explícita.
- **Las decisiones cerradas están en `docs/decisions.md`.** Si algo parece una mala
  decisión, decirlo, pero no cambiarla por cuenta propia.

## Skills

`ui-ux-pro-max` está instalada globalmente y **se activa primero** en cualquier
trabajo de interfaz: antes de escribir una pantalla, un componente visual o la
landing, consultarla para definir estilo, paleta y tipografía. No improvisar
diseño pantalla por pantalla.

Las demás skills relevantes al stack se instalan con `find-skills` (ver el prompt
de arranque). Recordar el límite de 15.000 caracteres para descripciones de skills
en el system prompt: no instalar de más.

## Reglas por área

Están en `.claude/rules/` con frontmatter `paths:`, así que se cargan solas cuando
tocás archivos de esa área:

- `.claude/rules/frontend.md` — componentes, Server vs Client, estado, formularios
- `.claude/rules/database.md` — migraciones, RLS, tipos, queries
- `.claude/rules/copy.md` — cómo se escriben los textos de la interfaz

## Lo que este proyecto no hace

Antes de proponer nada, chequear que no esté en esta lista. Todas son decisiones
tomadas, no omisiones:

- Modo offline, caché de datos, cola de mutaciones.
- Traducciones o soporte de idiomas más allá del español.
- Exportar o importar datos.
- Equipos, compartir, invitar, asignar tareas a otra persona.
- Markdown en el título de las tareas.
- Recordatorios por email (los recordatorios son push, y solo push).

## Verificación antes de cerrar

Ninguna tarea se considera terminada sin:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Y si tocaste el esquema: la migración aplicada, los tipos regenerados con
`pnpm db:types`, y la política de RLS escrita en la misma migración que creó la tabla.
