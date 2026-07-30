import type { AstNode } from "./ast";

/**
 * Recorre el AST y junta todos los valores de un campo de lista (`label` o
 * `project`), sin importar cuánto anidamiento de `and`/`or`/`not` haya
 * encima. Lo usa la página de resultados de un filtro (bloque 2.17) para
 * avisar si la consulta guardada referencia una etiqueta o un proyecto que
 * ya no existe, en vez de dejar que la página se rompa o muestre una lista
 * vacía sin explicación.
 */
export function collectFieldValues(ast: AstNode, field: "label" | "project"): string[] {
  if (ast.type === "field") {
    return ast.field === field ? ast.values : [];
  }
  if (ast.type === "not") return collectFieldValues(ast.expr, field);
  return [...collectFieldValues(ast.left, field), ...collectFieldValues(ast.right, field)];
}
