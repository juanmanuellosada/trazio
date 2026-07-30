import { QueryLanguageError } from "./errors";

export type TokenType =
  | "LPAREN"
  | "RPAREN"
  | "AMP"
  | "PIPE"
  | "BANG"
  | "COLON"
  | "COMMA"
  | "WORD"
  | "STRING"
  | "EOF";

/** `start`/`end` son índices de carácter en la consulta original: lo que necesita cada error para señalar la posición exacta. */
export type Token = {
  type: TokenType;
  value: string;
  start: number;
  end: number;
};

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
  "(": "LPAREN",
  ")": "RPAREN",
  "&": "AMP",
  "|": "PIPE",
  "!": "BANG",
  ":": "COLON",
  ",": "COMMA",
};

/** Caracteres que terminan una palabra sin comillas (bloque 2.1, D-A: "el nombre termina en el primer espacio, coma o paréntesis"). */
const WORD_BOUNDARY = new Set([...Object.keys(SINGLE_CHAR_TOKENS), '"']);

/**
 * Tokenizador del lenguaje de consulta (bloque 2.1): campos, valores,
 * comillas dobles, comas, operadores y paréntesis, cada uno con su posición
 * y longitud. Nunca corrige nada: una comilla sin cerrar es un error de
 * inmediato, con la posición de la comilla de apertura.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const n = input.length;
  let i = 0;

  while (i < n) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '"') {
      const start = i;
      i++;
      let value = "";
      while (i < n && input[i] !== '"') {
        value += input[i];
        i++;
      }
      if (i >= n) {
        throw new QueryLanguageError("Falta la comilla de cierre.", start, 1);
      }
      i++; // comilla de cierre
      tokens.push({ type: "STRING", value, start, end: i });
      continue;
    }

    const single = SINGLE_CHAR_TOKENS[ch];
    if (single) {
      tokens.push({ type: single, value: ch, start: i, end: i + 1 });
      i++;
      continue;
    }

    const start = i;
    while (i < n && !/\s/.test(input[i]) && !WORD_BOUNDARY.has(input[i])) {
      i++;
    }
    tokens.push({ type: "WORD", value: input.slice(start, i), start, end: i });
  }

  tokens.push({ type: "EOF", value: "", start: n, end: n });
  return tokens;
}
