import type { AstNode } from "./ast";
import { isQueryField, type QueryField } from "./ast";
import { QueryLanguageError, toQueryParseError, type QueryParseError } from "./errors";
import { tokenize, type Token } from "./tokenize";
import { isDueKeyword, isValidBooleanValue, isValidIsoDate, isValidPriorityValue } from "./validate-values";

export type QueryParseResult = { ok: true; ast: AstNode } | { ok: false; error: QueryParseError };

/**
 * Parser de descenso recursivo del lenguaje de consulta (bloque 2.2, D-A de
 * design.md). Gramática, con precedencia fija `!` > `&` > `|`:
 *
 * ```
 * or    := and ("|" and)*
 * and   := not ("&" not)*
 * not   := "!" not | atom
 * atom  := "(" or ")" | field
 * field := WORD ":" valor-del-campo
 * ```
 *
 * Nunca tira una excepción hacia afuera: `parseQuery` (la única función
 * pública) atrapa cualquier `QueryLanguageError` interno y lo convierte en
 * el resultado `{ ok: false, error }` con posición y longitud, tal como pide
 * el requirement "Errores de sintaxis en español que señalan la posición".
 */
class Parser {
  private readonly tokens: Token[];
  private readonly raw: string;
  private pos = 0;

  constructor(tokens: Token[], raw: string) {
    this.tokens = tokens;
    this.raw = raw;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.peek().type === "PIPE") {
      this.advance();
      const right = this.parseAnd();
      left = { type: "or", left, right };
    }
    return left;
  }

  private parseAnd(): AstNode {
    let left = this.parseNot();
    while (this.peek().type === "AMP") {
      this.advance();
      const right = this.parseNot();
      left = { type: "and", left, right };
    }
    return left;
  }

  private parseNot(): AstNode {
    if (this.peek().type === "BANG") {
      this.advance();
      const expr = this.parseNot();
      return { type: "not", expr };
    }
    return this.parseAtom();
  }

  private parseAtom(): AstNode {
    const token = this.peek();

    if (token.type === "LPAREN") {
      this.advance();
      const inner = this.parseOr();
      if (this.peek().type !== "RPAREN") {
        // El paréntesis abierto no cerró en ningún punto de la consulta:
        // la posición señalada es el final de la consulta (requirement
        // "Paréntesis sin cerrar").
        throw new QueryLanguageError("Falta un paréntesis de cierre.", this.raw.length, 0);
      }
      this.advance();
      return inner;
    }

    if (token.type === "WORD") {
      return this.parseField();
    }

    if (token.type === "EOF") {
      throw new QueryLanguageError("La consulta terminó antes de lo esperado: falta un campo.", token.start, 0);
    }

    throw new QueryLanguageError(`Símbolo inesperado: "${token.value}".`, token.start, Math.max(token.value.length, 1));
  }

  private expectColon(fieldToken: Token): void {
    if (this.peek().type !== "COLON") {
      throw new QueryLanguageError(`Falta ":" después del campo "${fieldToken.value}".`, this.peek().start, 0);
    }
    this.advance();
  }

  private parseValueToken(): Token {
    const token = this.peek();
    if (token.type === "WORD" || token.type === "STRING") {
      return this.advance();
    }
    throw new QueryLanguageError("Falta un valor.", token.start, 0);
  }

  private parseField(): AstNode {
    const fieldToken = this.advance();
    const fieldName = fieldToken.value;

    if (!isQueryField(fieldName)) {
      throw new QueryLanguageError(
        `Campo desconocido: "${fieldName}". Los campos disponibles son priority, due, label, project, completed, search, recurring, subtask, created y no_project.`,
        fieldToken.start,
        fieldToken.value.length,
      );
    }

    this.expectColon(fieldToken);
    return this.parseFieldValue(fieldName);
  }

  private parseFieldValue(field: QueryField): AstNode {
    switch (field) {
      case "priority":
        return this.parsePriorityField();
      case "label":
        return this.parseNameListField("label");
      case "project":
        return this.parseNameListField("project");
      case "completed":
        return this.parseBooleanField("completed");
      case "recurring":
        return this.parseBooleanField("recurring");
      case "subtask":
        return this.parseBooleanField("subtask");
      case "no_project":
        return this.parseBooleanField("no_project");
      case "search":
        return this.parseSearchField();
      case "due":
        return this.parseDueField();
      case "created":
        return this.parseCreatedField();
    }
  }

  private parsePriorityField(): AstNode {
    const values: number[] = [];
    for (;;) {
      const token = this.parseValueToken();
      if (!isValidPriorityValue(token.value)) {
        throw new QueryLanguageError(
          "La prioridad tiene que ser un valor entre 1 y 4.",
          token.start,
          Math.max(token.value.length, 1),
        );
      }
      values.push(Number(token.value));
      if (this.peek().type !== "COMMA") break;
      this.advance();
    }
    return { type: "field", field: "priority", values };
  }

  private parseNameListField(field: "label" | "project"): AstNode {
    const values: string[] = [];
    for (;;) {
      const token = this.parseValueToken();
      values.push(token.value);
      if (this.peek().type !== "COMMA") break;
      this.advance();
    }
    return { type: "field", field, values } as AstNode;
  }

  private parseBooleanField(field: "completed" | "recurring" | "subtask" | "no_project"): AstNode {
    const token = this.parseValueToken();
    if (!isValidBooleanValue(token.value)) {
      throw new QueryLanguageError(
        `El campo "${field}" solo acepta "true" o "false".`,
        token.start,
        Math.max(token.value.length, 1),
      );
    }
    return { type: "field", field, value: token.value === "true" } as AstNode;
  }

  private parseSearchField(): AstNode {
    const token = this.parseValueToken();
    return { type: "field", field: "search", value: token.value };
  }

  private parseDateToken(): string {
    const token = this.parseValueToken();
    if (!isValidIsoDate(token.value)) {
      throw new QueryLanguageError(
        "La fecha tiene que tener el formato AAAA-MM-DD.",
        token.start,
        Math.max(token.value.length, 1),
      );
    }
    return token.value;
  }

  private parseDueField(): AstNode {
    const first = this.peek();

    if (first.type === "WORD" && isDueKeyword(first.value)) {
      this.advance();
      return {
        type: "field",
        field: "due",
        condition: { kind: first.value as "today" | "tomorrow" | "overdue" | "nodate" | "next7days" | "next30days" },
      };
    }

    if (first.type === "WORD" && (first.value === "before" || first.value === "after")) {
      this.advance();
      this.expectColon(first);
      const date = this.parseDateToken();
      return { type: "field", field: "due", condition: { kind: first.value, date } };
    }

    if (first.type === "WORD" && isValidIsoDate(first.value)) {
      this.advance();
      return { type: "field", field: "due", condition: { kind: "exact", date: first.value } };
    }

    const token = this.parseValueToken();
    throw new QueryLanguageError(
      `Valor inválido para "due": "${token.value}".`,
      token.start,
      Math.max(token.value.length, 1),
    );
  }

  private parseCreatedField(): AstNode {
    const first = this.peek();

    if (first.type === "WORD" && (first.value === "before" || first.value === "after")) {
      this.advance();
      this.expectColon(first);
      const date = this.parseDateToken();
      return { type: "field", field: "created", condition: { kind: first.value, date } };
    }

    if (first.type === "WORD" && isValidIsoDate(first.value)) {
      this.advance();
      return { type: "field", field: "created", condition: { kind: "exact", date: first.value } };
    }

    const token = this.parseValueToken();
    throw new QueryLanguageError(
      `Valor inválido para "created": "${token.value}".`,
      token.start,
      Math.max(token.value.length, 1),
    );
  }

  /** El nivel superior tiene que consumir toda la consulta: lo que sobre después de un `parseOr()` completo es un símbolo suelto (por ejemplo, `label:en espera` sin comillas). */
  expectEnd(): void {
    const token = this.peek();
    if (token.type !== "EOF") {
      throw new QueryLanguageError(
        `Símbolo inesperado: "${token.value}".`,
        token.start,
        Math.max(token.value.length, 1),
      );
    }
  }
}

/**
 * Punto de entrada público del lenguaje de consulta (bloque 2.2). Nunca
 * tira: ante cualquier error de sintaxis o de valor devuelve
 * `{ ok: false, error }` con mensaje en español, posición y longitud del
 * fragmento problemático.
 */
export function parseQuery(input: string): QueryParseResult {
  try {
    if (input.trim().length === 0) {
      return { ok: false, error: { message: "La consulta está vacía.", position: 0, length: 0 } };
    }
    const tokens = tokenize(input);
    const parser = new Parser(tokens, input);
    const ast = parser.parseOr();
    parser.expectEnd();
    return { ok: true, ast };
  } catch (error) {
    if (error instanceof QueryLanguageError) {
      return { ok: false, error: toQueryParseError(error) };
    }
    return { ok: false, error: { message: "No se pudo interpretar la consulta.", position: 0, length: 0 } };
  }
}
