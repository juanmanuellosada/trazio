## REMOVED Requirements

### Requirement: La página propia por etiqueta y las etiquetas favoritas quedan fuera de esta capacidad

**Reason**: La página propia por etiqueta y el marcado de una etiqueta como
favorita se implementan en esta fase.
**Migration**: Pasan a estar cubiertas por la capacidad
`navegacion-por-etiqueta`, que define la ruta `/etiquetas/<id>`, el marcado y
desmarcado de `labels.is_favorite`, y su acceso desde el panel lateral.
