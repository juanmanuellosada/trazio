## REMOVED Requirements

### Requirement: Fuera de alcance en fase 1

**Reason**: La página propia por etiqueta, las etiquetas favoritas y el
acceso "Etiquetas" del panel lateral se implementan en esta fase.
**Migration**: Pasan a estar cubiertas por la capacidad
`navegacion-por-etiqueta`, que ya define la ruta `/etiquetas/<id>`, el marcado
de favoritas sobre `labels.is_favorite` y el acceso del panel lateral.
