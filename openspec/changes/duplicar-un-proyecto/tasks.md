## 1. Copia

- [x] 1.1 Módulo que orquesta la copia: proyecto, secciones, y una llamada a `duplicateTaskTree` por tarea raíz. NO reescribir la copia de tareas, que ya está probada.
- [x] 1.2 Aplicar la tabla de D-B: qué se copia y qué no. Los recordatorios son el caso que hace daño si se copian.
- [x] 1.3 Filtrar las completadas antes de copiar, no después.
- [x] 1.4 Mapear las secciones viejas a las nuevas para que cada tarea caiga en la que le corresponde.
- [x] 1.5 Posición de la copia junto al original.
- [x] 1.6 Tests de la copia con secciones, subtareas anidadas, etiquetas, completadas y recordatorios.

## 2. Interfaz

- [x] 2.1 "Duplicar" en el menú del proyecto, en el encabezado y en el árbol del panel lateral. Nunca en la Bandeja.
- [x] 2.2 Indicador de que está trabajando: no puede ser optimista, los ids los asigna el servidor (D-D).
- [x] 2.3 Abrir la copia al terminar.
- [x] 2.4 Decidir y aplicar qué pasa si falla a mitad de camino (D-D): dejar el proyecto a medias con un aviso, o limpiar. Que quede escrito.

## 3. Cierre

- [x] 3.1 Actualizar `docs/product-spec.md` en las acciones de un proyecto.
- [x] 3.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 3.3 Verificar en el navegador con un proyecto grande, y medir cuánto tarda. **Pendiente**: `.env.local` apunta al Supabase de producción, así que esta verificación necesita datos reales y no se puede hacer desde acá sin tocarlos. Queda para quien pueda probar contra un entorno propio.
