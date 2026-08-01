> **Es una sola tanda y es chica.** Lo delicado no es sacar la lista: es sacarla sin
> llevarse puesta la de filtros, que vive en el mismo archivo y se queda.
>
> **El gate en verde no prueba esto.** Se verifica abriendo el panel lateral.

## 1. Sacar la lista plegable de etiquetas

- [ ] 1.1 `components/layout/sidebar-content.tsx`: dejar de montar `LabelsCollapsibleList`
- [ ] 1.2 `components/layout/label-filter-lists.tsx`: sacar `LabelsCollapsibleList`. **Mirar qué era compartido con `FiltersCollapsibleList` antes de borrar**: viven en el mismo archivo y la de filtros se queda intacta
- [ ] 1.3 Revisar si quedó código huérfano —consultas, tipos, importaciones— y limpiarlo. Sacar un componente suele dejar cosas colgando
- [ ] 1.4 Que las etiquetas favoritas sigan apareciendo en Favoritos, con su enlace a la página de cada una. Eso no se toca
- [ ] 1.5 Actualizar la descripción del panel lateral en `docs/product-spec.md`, que enumera la lista plegable
- [ ] 1.6 Reapuntar los tests de cero etiquetas y de todas favoritas: esos casos siguen importando, pero ahora los garantiza el acceso principal. **No borrarlos**
- [ ] 1.7 Comprobar que no quedó ningún camino roto: quién enlazaba a `/etiquetas/<id>` desde el panel lateral y qué pasa ahora

## 2. Verificación

- [ ] 2.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 2.2 El acceso "Etiquetas" sigue entre Próximos y Hábitos, con su indicador de atajo, y `G E` sigue llevando ahí
- [ ] 2.3 **La lista plegable de Filtros sigue funcionando igual**: es lo que este cambio puede romper sin querer
- [ ] 2.4 Las etiquetas favoritas siguen en Favoritos y llevan a su página
- [ ] 2.5 Con cero etiquetas el panel lateral no se rompe ni deja un hueco raro donde estaba la lista
- [ ] 2.6 Recorrido en escritorio y en 390px
