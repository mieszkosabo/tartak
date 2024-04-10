// list of tokens in Tartak with regular expressions to recognize them
const spec = [
  // Whitespace
  [/^\s+/, null],

  // ---
  // Comments

  // single line comments
  [/^\/\/.*/, null],

  // multi-line comments
  [/^\/\*[\s\S]*?\*\//, null],

  // ---
  // Symbols, delimiters
  [/^;/, ";"],
  [/^:/, ":"],
  [/^{/, "{"],
  [/^}/, "}"],
  [/^\(/, "("],
  [/^\)/, ")"],
  [/^\[/, "["],
  [/^\]/, "]"],
  [/^\,/, ","],
  [/^\./, "."],

  // ---
  // Keywords:
  [/^\blet\b/, "let"],
  [/^\bnumber\b/, "number"],
  [/^\bstring\b/, "string"],
  [/^\btype\b/, "type"],
  [/^\bif\b/, "if"],
  [/^\bthen\b/, "then"],
  [/^\belse\b/, "else"],

  // ---
  // Numbers
  [/^\d+/, "NUMBER"],

  // ---
  // Identifiers
  [/^\w+/, "IDENTIFIER"],

  // --
  // Equality operators: ==, !=
  [/^[=!]=/, "EQUALITY_OPERATOR"],

  // ---
  // Assignment operators: =, +=, -=, *=, /=
  [/^=/, "SIMPLE_ASSIGN"],
  [/^[\*\/\+\-]=/, "COMPLEX_ASSIGN"],

  // ---
  // logical
  [/^&&/, "LOGICAL_AND"],
  [/^\|\|/, "LOGICAL_OR"],
  [/^!/, "LOGICAL_NOT"],

  // ---
  // Math
  [/^[+\-]/, "ADDITIVE_OPERATOR"],
  [/^[*\/\|\&]/, "MULTIPLICATIVE_OPERATOR"],

  [/^[><]=?/, "RELATIONAL_OPERATOR"],

  // ---
  // Strings
  [/^"[^"]*"/, "STRING"],
  [/^'[^']*'/, "STRING"],
] as const;

export type Token = {
  type: NonNullable<(typeof spec)[number][1]>;
  value: string;
};

export class Tokenizer {
  private text = "";
  private cursor = 0;

  init(text: string) {
    this.text = text;
    this.cursor = 0;
  }

  isEOF() {
    return this.cursor >= this.text.length;
  }

  hasMoreTokens() {
    return this.cursor < this.text.length;
  }

  nextToken(): Token | null {
    if (!this.hasMoreTokens()) {
      return null;
    }

    const tail = this.text.slice(this.cursor);

    for (const [regex, tokenType] of spec) {
      const tokenValue = this.match(regex, tail);
      if (tokenValue === null) {
        continue;
      }

      // Skip whitespace
      if (tokenType === null) {
        return this.nextToken();
      }

      return {
        type: tokenType,
        value: tokenValue,
      };
    }

    throw new SyntaxError(`Unexpected token: ${tail[0]}`);
  }

  private match(regex: RegExp, str: string) {
    const matched = regex.exec(str);
    if (matched === null) {
      return null;
    }

    this.cursor += matched[0].length;
    return matched[0];
  }
}
