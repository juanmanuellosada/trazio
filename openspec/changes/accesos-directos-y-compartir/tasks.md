## 1. Accesos directos

- [x] 1.1 Declarar `shortcuts` en `app/manifest.ts` con "Nueva tarea" y "Hoy", apuntando a rutas existentes. A lo sumo cuatro (D-C).
- [x] 1.2 Si el alta rápida no se puede abrir por URL, resolverlo con un parámetro sobre una pantalla que ya exista, sin inventar una pantalla nueva.
- [ ] 1.3 Verificar en un Android con la PWA instalada que el menú del ícono los muestra y que cada uno llega a su pantalla. **Sin verificar: requiere un dispositivo Android real.**

## 2. Destino de compartir

- [x] 2.1 Declarar `share_target` con `method: "GET"` y los campos `title`, `text` y `url` (D-B). NO declarar recepción de archivos.
- [x] 2.2 Ruta que recibe el `GET`, combina los tres campos de forma tolerante —cada app los reparte distinto— y redirige al alta rápida con el texto precargado.
- [x] 2.3 Un enlace con título deja el título como texto y el enlace en la descripción.
- [x] 2.4 Confirmar que NO se crea nada sin confirmación (D-A): se abre el alta con el texto y el foco puesto.
- [x] 2.5 Tests de la ruta: solo `text`, solo `title`, `title` + `url`, los tres, y ninguno.

## 3. Cierre

- [x] 3.1 Mirar cómo se ve un texto compartido muy largo y decidir si el título se corta y el resto va a la descripción.
- [x] 3.2 Actualizar `docs/product-spec.md` en la parte de instalación.
- [ ] 3.3 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 3.4 Probar el flujo completo desde un teléfono real: compartir un artículo del navegador y confirmar que llega al alta con el título puesto. **Sin verificar: requiere un dispositivo real.**
