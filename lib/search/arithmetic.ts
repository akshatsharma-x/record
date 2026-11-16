/**
 * Typed arithmetic for Search (DESIGN.md §6.3): "12*7" shows 84. A small recursive-descent
 * parser, never eval. It knows + − × ÷ * / x ^, parentheses, unary minus and decimals, and
 * only answers when there's at least one operator, so "2026" stays a search.
 *
 *   expression := term (("+" | "-") term)*
 *   term       := power (("*" | "/") power)*
 *   power      := unary ("^" power)?
 *   unary      := ("-" | "+") unary | primary
 *   primary    := number | "(" expression ")"
 */
export interface Calculation {
  value: number;
  /** The expression as typeset: "12 × 7". */
  expression: string;
}

const MAX_LENGTH = 80;
const MAX_DEPTH = 24;

type Token = { kind: "number"; value: number } | { kind: "op"; value: string };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  const text = input.replace(/\s+/g, "");
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const number = /^(\d+(\.\d*)?|\.\d+)/.exec(text.slice(i));
    if (number) {
      tokens.push({ kind: "number", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    if (char === "×" || char === "*") tokens.push({ kind: "op", value: "*" });
    else if (char === "÷" || char === "/") tokens.push({ kind: "op", value: "/" });
    else if (char === "−" || char === "-") tokens.push({ kind: "op", value: "-" });
    // "x" multiplies only between numbers or parentheses: "12x7".
    else if (char === "x" && tokens.length > 0 && /[\d.)]/.test(text[i - 1] ?? "") && /[\d.(]/.test(text[i + 1] ?? "")) {
      tokens.push({ kind: "op", value: "*" });
    } else if ("+^()".includes(char)) tokens.push({ kind: "op", value: char });
    else return null;
    i += 1;
  }
  return tokens;
}

export function calculate(input: string): Calculation | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH) return null;
  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length < 3) return null;
  let position = 0;
  let binary = 0;

  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const isOp = (value: string) => peek()?.kind === "op" && peek()?.value === value;

  function expression(depth: number): number {
    if (depth > MAX_DEPTH) throw new Error("too deep");
    let value = term(depth);
    while (isOp("+") || isOp("-")) {
      const op = take().value;
      binary += 1;
      const right = term(depth);
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  function term(depth: number): number {
    let value = power(depth);
    while (isOp("*") || isOp("/")) {
      const op = take().value;
      binary += 1;
      const right = power(depth);
      if (op === "/" && right === 0) throw new Error("divide by zero");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }

  function power(depth: number): number {
    const base = unary(depth);
    if (isOp("^")) {
      take();
      binary += 1;
      return base ** power(depth + 1);
    }
    return base;
  }

  function unary(depth: number): number {
    if (isOp("-")) {
      take();
      return -unary(depth + 1);
    }
    if (isOp("+")) {
      take();
      return unary(depth + 1);
    }
    return primary(depth);
  }

  function primary(depth: number): number {
    const token = take();
    if (!token) throw new Error("unexpected end");
    if (token.kind === "number") return token.value;
    if (token.value === "(") {
      const value = expression(depth + 1);
      if (!isOp(")")) throw new Error("missing )");
      take();
      return value;
    }
    throw new Error(`unexpected ${token.value}`);
  }

  try {
    const value = expression(0);
    if (position !== tokens.length || binary === 0 || !Number.isFinite(value)) return null;
    return { value: Number(value.toPrecision(12)), expression: typeset(tokens) };
  } catch {
    return null;
  }
}

function typeset(tokens: Token[]): string {
  const symbols: Record<string, string> = { "*": "×", "/": "÷", "-": "−" };
  let text = "";
  tokens.forEach((token, index) => {
    if (token.kind === "number") {
      text += String(token.value);
      return;
    }
    const op = token.value;
    const previous = tokens[index - 1];
    const unary = op === "-" && (!previous || (previous.kind === "op" && previous.value !== ")"));
    if (op === "(" || op === ")" || op === "^" || unary) text += symbols[op] ?? op;
    else text += ` ${symbols[op] ?? op} `;
  });
  return text;
}

/** The value as Search shows it: grouped digits, at most ten decimals. */
export function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }).format(value);
}
