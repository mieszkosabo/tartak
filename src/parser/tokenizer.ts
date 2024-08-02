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
  [/^#/, "#"],
  [/^\?/, "?"],
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
  [/^\=>/, "=>"],
  [/^\->/, "->"],
  [/^\\/, "\\"],
  [/^`/, "`"],

  // ---
  // Keywords:
  [/^\blet\b/, "let"],
  [/^\bmatch\b/, "match"],
  [/^\binfer\b/, "infer"],
  [/^\bextends\b/, "extends"],
  [/^\bnumber\b/, "number"],
  [/^\bstring\b/, "string"],
  [/^\btype\b/, "type"],
  [/^\bif\b/, "if"],
  [/^\bthen\b/, "then"],
  [/^\belse\b/, "else"],
  [/^\bexport\b/, "export"],
  [/^\bimport\b/, "import"],
  [/^\bfrom\b/, "from"],
  [/^\bin\b/, "in"],
  [/^\bas\b/, "as"],

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
  // Assignment operators: =
  [/^=/, "="],

  // ---
  // logical
  [/^&&/, "LOGICAL_AND"],
  [/^\|\|/, "LOGICAL_OR"],
  [/^!/, "LOGICAL_NOT"],

  // Intersection and union
  // [/^&/, "INTERSECTION"],
  // [/^\|/, "UNION"],

  // ---
  // Math
  [/^[+\-]/, "ADDITIVE_OPERATOR"],
  [/^\*\*/, "MULTIPLICATIVE_OPERATOR"],
  [/^[*\/\|\&]/, "MULTIPLICATIVE_OPERATOR"],
  [/^%/, "MULTIPLICATIVE_OPERATOR"],

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

export type Position = {
  line: number;
  column: number;
};

export class Tokenizer {
  private text = "";
  private cursor = 0;

  private position = {
    line: 1,
    column: 1,
  };

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

  currentPosition(): Position {
    return {
      line: this.position.line,
      column: this.position.column,
    };
  }

  nextChar(): string {
    const char = this.text[this.cursor];
    this.cursor++;
    if (char === "\n") {
      this.position.line++;
      this.position.column = 1;
    } else {
      this.position.column++;
    }
    return char;
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

  // returns a copy of next n tokens ahead
  peek(n: number): Token[] {
    const tokens: Token[] = [];
    const cursor = this.cursor;
    const pos = {
      line: this.position.line,
      column: this.position.column,
    };

    for (let i = 0; i < n; i++) {
      try {
        const token = this.nextToken();
        if (token === null) {
          break;
        }
        tokens.push(token);
      } catch {
        break;
      }
    }

    // restore cursor & position
    this.cursor = cursor;
    this.position = pos;

    return tokens;
  }

  private match(regex: RegExp, str: string) {
    const matched = regex.exec(str);
    if (matched === null) {
      return null;
    }

    const matchedSubstr = this.text.slice(
      this.cursor,
      this.cursor + matched[0].length
    );

    this.cursor += matched[0].length;
    for (const char of matchedSubstr) {
      if (char === "\n") {
        this.position.line++;
        this.position.column = 1;
      } else {
        this.position.column++;
      }
    }

    return matched[0];
  }
}
