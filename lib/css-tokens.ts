/**
 * Reads custom properties out of styles/tokens.css, so the kitchen can show the declared
 * value of every token and the tests can check the file itself rather than a copy.
 * A small parser for flat CSS: rules, comma-separated selector lists and nested at-rules.
 *
 * Runs under plain Node: no path aliases.
 */

export interface CssRule {
  /** The rule's selector list, or "" for declarations directly inside an at-rule (@theme). */
  selector: string;
  /** Enclosing at-rules, outermost first, e.g. ["@layer base"] or ["@media (width >= 735px)"]. */
  atRules: string[];
  /** Custom properties declared in the rule, in order. */
  tokens: [name: string, value: string][];
}

export function parseCss(css: string): CssRule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];

  const walk = (start: number, selector: string, atRules: string[]): number => {
    const tokens: [string, string][] = [];
    let buffer = "";
    const flush = () => {
      const declaration = buffer.trim();
      buffer = "";
      const colon = declaration.indexOf(":");
      if (declaration.startsWith("--") && colon > 0) {
        tokens.push([declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]);
      }
    };
    let i = start;
    while (i < text.length) {
      const char = text[i];
      if (char === "{") {
        const head = buffer.trim();
        buffer = "";
        i = head.startsWith("@") ? walk(i + 1, "", [...atRules, head]) : walk(i + 1, head, atRules);
        continue;
      }
      if (char === "}") {
        flush();
        if (tokens.length > 0) rules.push({ selector, atRules, tokens });
        return i + 1;
      }
      if (char === ";") flush();
      else buffer += char;
      i += 1;
    }
    flush();
    if (tokens.length > 0) rules.push({ selector, atRules, tokens });
    return i;
  };

  walk(0, "", []);
  return rules;
}

/** The selectors in a rule's list, trimmed. */
export function selectorsOf(rule: CssRule): string[] {
  return rule.selector
    .split(",")
    .map((selector) => selector.trim())
    .filter(Boolean);
}

/** Tokens declared unconditionally on :root (plus the @theme block), later declarations winning. */
export function rootTokens(rules: CssRule[]): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const rule of rules) {
    const conditional = rule.atRules.some((at) => !at.startsWith("@layer") && !at.startsWith("@theme"));
    const onRoot = rule.selector === "" ? rule.atRules.some((at) => at.startsWith("@theme")) : selectorsOf(rule).includes(":root");
    if (!conditional && onRoot) for (const [name, value] of rule.tokens) tokens.set(name, value);
  }
  return tokens;
}

/** Replaces var(--x) references with their values from `tokens`, recursively. */
export function resolveVars(value: string, tokens: Map<string, string>, depth = 0): string {
  if (depth > 10) return value;
  return value.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (_, name: string, fallback?: string) => {
    const resolved = tokens.get(name) ?? fallback;
    return resolved === undefined ? `var(${name})` : resolveVars(resolved, tokens, depth + 1);
  });
}
