## 0. Gobernanza

- [x] 0.1 Anotar D60 en `docs/decisions.md`: se acota D3, copiar un proyecto como markdown al portapapeles no es exportar.
- [x] 0.2 Actualizar `docs/product-spec.md`: §13 "Fuera de alcance" (nota de acotamiento a D60) y §3 "Proyecto" (la acción en el menú).
- [x] 0.3 Esta propuesta de OpenSpec (`proposal.md`, `design.md`, `tasks.md`, spec delta).

## 1. Fundamentos: texto, portapapeles y árbol genérico

- [x] 1.1 `lib/markdown/text.ts`: escapar los caracteres de markdown en un texto plano (título de tarea, nombre de proyecto, sección o etiqueta) (D-B) + test.
- [x] 1.2 `lib/clipboard/copy-text.ts`: escribir al portapapeles con `ClipboardItem` y `Promise<Blob>` diferida, llamado sincrónicamente dentro del gesto de usuario, con respaldo a `writeText` donde `ClipboardItem` no exista (D-D) + test.
- [x] 1.3 Generalizar `lib/public-project/build-tree.ts` a `TaskNode<T>`, preservando el alias `SharedTaskNode = TaskNode<SharedTask>` para no tocar sus consumidores actuales.
- [x] 1.4 Ampliar `lib/public-project/build-tree.test.ts` para cubrir el caso genérico.
- [x] 1.5 `lib/projects/task-descriptions.ts`: consulta puntual de descripciones por proyecto, con `.order("position")` aunque se consuma como mapa (D-E).

## 2. Conversión de Tiptap a markdown

- [x] 2.1 `lib/markdown/tiptap-to-markdown.ts`: convertir el jsonb de una descripción a markdown (listas, listas de tareas, tablas sin `colspan`/`rowspan` (D-G), notas al pie con prefijo por tarea (D-F)) + test.

## 3. Armado del documento del proyecto

- [x] 3.1 `lib/projects/project-to-markdown.ts`: nombre y descripción del proyecto, secciones por `position`, tareas y subtareas anidadas por `position` (sin sección primero), descripción de cada tarea como continuación indentada (D-C), metadatos en la misma línea (D-A), fecha de vencimiento, prioridad si no es la default, duración estimada con `formatDuration` de `lib/landing/format-parse-result.ts` (D-H), etiquetas, estado `- [ ]`/`- [x]` + test.

## 4. Cableado en la interfaz

- [x] 4.1 `lib/projects/copy-project-markdown.ts`: orquesta traer descripciones, armar el documento y copiarlo, distinguiendo el error de datos del error de portapapeles + test.
- [x] 4.2 Ítem "Copiar como markdown" en el menú "…" de `components/projects/project-header.tsx`, ausente en la Bandeja de entrada, con prefetch de descripciones al abrir el menú (defensa en profundidad de D-D).
- [x] 4.3 Test de componente para el ítem de menú — el patrón sí tenía precedente (`components/layout/account-menu.test.tsx` ya abre este mismo `components/ui/dropdown-menu.tsx` con `userEvent.click` + `screen.findByRole`), así que se hizo: `components/projects/project-header.test.tsx`.

## 5. Cierre

- [x] 5.1 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 5.2 Verificar en el navegador: copiar un proyecto y pegar en Obsidian, GitHub y Notion.
- [ ] 5.3 Chequear en Safari o la PWA de iOS, con caché frío (sin el prefetch ya resuelto), que el portapapeles igual recibe el contenido.
