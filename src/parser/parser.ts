import { P, match } from "ts-pattern";
import { Tokenizer, type Token } from "./tokenizer";
import type {
  Definition,
  Expression,
  MappedType,
  MatchArm,
  ObjectProperty,
  Param,
  Statement,
  TartakAST,
  TemplateStringPart,
} from "./types";

export class Parser {
  private code = "";
  private tokenizer = new Tokenizer();
  private lookahead: Token | null = null;

  // returns AST
  parse(code: string) {
    this.code = code;
    this.tokenizer.init(this.code);

    this.lookahead = this.tokenizer.nextToken();

    return this.Program();
  }

  // Program: DefinitionList;
  //
  // In Tartak, a "program" is simply a list of type definitions.
  private Program() {
    return {
      position: this.tokenizer.currentPosition(),
      type: "Program",
      body: this.TopLevelElementsList(),
    } as const;
  }

  // TopLevelElementsList: Definition | Section | ImportStatement | DefinitionOrSectionList ...;
  //
  // Since we use a recursive descent parser, we can't do left recursion,
  // so the above rule (and everywhere else) will be implemented with a loop.
  private TopLevelElementsList(stopToken: Token["type"] | null = null) {
    const definitions = [this.TopLevelElement()];

    while (this.lookahead !== null && this.lookahead.type !== stopToken) {
      definitions.push(this.TopLevelElement());
    }

    return definitions;
  }

  /**
   *  TopLevelElement
   *  : Definition | Section | ImportStatement;
   */
  private TopLevelElement() {
    if (this.lookahead?.type === "type" || this.lookahead?.type === "export") {
      return this.Definition();
    } else if (this.lookahead?.type === "#") {
      return this.Section();
    } else if (this.lookahead?.type === "import") {
      return this.ImportStatement();
    }

    throw new SyntaxError(
      `Unexpected token: "${this.lookahead?.type}". Should be a definition or section.`
    );
  }

  /**
   * ImportStatement
   * : 'import' '{' ImportList '}' 'from' STRING OptSemicolon
   */
  private ImportStatement(): Extract<TartakAST, { type: "ImportStatement" }> {
    const position = this.tokenizer.currentPosition();
    this.eat("import");
    this.eat("{");
    const imports = this.ImportList();
    this.eat("}");
    this.eat("from");
    const source = this.StringLiteral() as Extract<
      Expression,
      { type: "StringLiteral" }
    >;
    if (this.lookahead?.type === ";") {
      this.eat(";");
    }

    return {
      position,
      type: "ImportStatement",
      imports: imports.map((i) => i.name),
      source: source.value,
    };
  }

  /**
   * ImportList
   *  : Identifier
   *  | ImportList ',' Identifier
   */
  private ImportList() {
    const imports = [this.Identifier()];

    while (this.lookahead?.type === ",") {
      this.eat(",");
      imports.push(this.Identifier());
    }

    return imports;
  }

  /**
   * Section
   *  : '#' '[' Identifier ']' BlockExpression
   */
  private Section() {
    const position = this.tokenizer.currentPosition();
    this.eat("#");
    this.eat("[");
    const name = this.Identifier();
    this.eat("]");
    const body = this.BlockExpression() as Extract<
      Expression,
      { type: "BlockExpression" }
    >;

    return {
      position,
      type: "Section",
      name: name.name,
      body: body.body,
    } as const;
  }

  // Definition: OptExport "type" Identifier "=" Type ";";
  private Definition() {
    const position = this.tokenizer.currentPosition();
    const isExported =
      this.lookahead?.type === "export" ? !!this.eat("export") : false;

    this.eat("type");

    const name = this.Identifier().name;

    const params = this.lookahead?.type === "(" ? this.ParameterList() : [];

    this.eat("=");

    const body = this.Type();

    if (this.lookahead?.type === ";") {
      this.eat(";");
    }

    return {
      type: "Definition",
      isExported,
      position,
      params,
      name,
      body,
    } as const satisfies Definition;
  }

  /**
   * ParameterList
   *  : Param
   *  | ParameterList ',' Identifier
   */
  ParameterList() {
    this.eat("(");
    const params = [this.Param()];
    while (this.lookahead?.type === ",") {
      this.eat(",");
      params.push(this.Param());
    }

    this.eat(")");

    return params;
  }

  /**
   * Param
   *  : Identifier
   *  | IdentifierWithType
   */
  Param(): Param {
    const position = this.tokenizer.currentPosition();
    const ident = this.Identifier();
    const paramType =
      this.lookahead?.type === ":" && this.eat(":") ? this.Expression() : null;

    return {
      position,
      type: "Param",
      name: ident.name,
      paramType,
    };
  }

  /**
   * StatementList
   *  : Statement
   *  | StatementList Statement
   *  ;
   */
  private StatementList(stopToken: Token["type"] | null = null) {
    const statements = [this.Statement()];

    while (this.lookahead !== null && this.lookahead.type !== stopToken) {
      statements.push(this.Statement());
    }

    return statements;
  }

  /**
   * Statement
   *  | VariableDeclaration
   *  | ExpressionStatement
   *  ;
   */
  private Statement(): Statement {
    switch (this.lookahead?.value) {
      case "AssertEqual":
        return this.AssertEqual();
    }

    switch (this.lookahead?.type) {
      case "let":
        return this.VariableDeclaration();
      default:
        return this.ExpressionStatement();
    }
  }

  /**
   * AssertEqual
   *  : 'AssertEqual' '(' Expression ',' Expression ')'
   */
  private AssertEqual() {
    const position = this.tokenizer.currentPosition();
    const id = this.eat("IDENTIFIER");
    if (id.value !== "AssertEqual") {
      throw new SyntaxError(`Expected AssertEqual, got ${id}`);
    }

    this.eat("(");
    const left = this.Expression();
    this.eat(",");
    const right = this.Expression();
    this.eat(")");

    if (this.lookahead?.type === ";") {
      this.eat(";");
    }

    return {
      position,
      type: "AssertEqual",
      left,
      right,
    } as const;
  }

  /**
   * ExpressionStatement
   *  : Expression
   *  ;
   */
  private ExpressionStatement(): Statement {
    const position = this.tokenizer.currentPosition();
    const expr = this.Expression();

    return {
      position,
      type: "ExpressionStatement",
      expression: expr,
    };
  }

  /**
   * VariableDeclaration
   *  : 'let' IDENTIFIER '=' Expression OptionalSemicolon
   *  ;
   */
  private VariableDeclaration() {
    const position = this.tokenizer.currentPosition();
    this.eat("let");
    let id = this.Identifier();
    this.eat("=");
    let expr = this.Expression();
    this.lookahead?.type === ";" ? this.eat(";") : null;

    return {
      position,
      type: "VariableDeclaration",
      name: id.name,
      expr,
    } as const;
  }

  // Type: Expression;
  private Type() {
    return this.Expression();
  }

  /**
   * Expression
   *  : AssignmentExpression
   *  ;
   */
  private Expression(): Expression {
    return this.AssignmentExpression();
  }

  /**
   * AssignmentExpression
   *  : RelationalExpression
   *  | LeftHandSideExpression AssignmentOperator AssignmentExpression
   *  ;
   */

  private AssignmentExpression(): Expression {
    const position = this.tokenizer.currentPosition();
    const left = this.LogicalORExpression(); // always start with the lowest precedence

    if (this.lookahead?.type !== "=") {
      return left;
    }

    return {
      position,
      type: "AssignmentExpression",
      operator: "=",
      left: this._checkValidAssignmentTarget(left),
      right: this.AssignmentExpression(),
    };
  }

  /**
   * EQUALITY_OPERATOR: '==', '!='
   *
   * EqualityExpression
   *  : RelationalExpression EQUALITY_OPERATOR EqualityExpression
   *  | RelationalExpression
   *  ;
   */
  private EqualityExpression(): Expression {
    return this._BinaryExpression("RelationalExpression", "EQUALITY_OPERATOR");
  }

  /**
   * RELATIONAL_OPERATOR: >, >=, <, <=
   *
   *  RelationalExpression
   *  : AdditiveExpression
   *  | AdditiveExpression RELATIONAL_OPERATOR RelationalExpression
   */

  private RelationalExpression(): Expression {
    return this._BinaryExpression("AdditiveExpression", "RELATIONAL_OPERATOR");
  }

  private _checkValidAssignmentTarget(node: any) {
    if (node.type === "Identifier" || node.type === "MemberExpression") {
      return node;
    }

    throw new SyntaxError(`Invalid left-hand side in assignment expression`);
  }

  /**
   * Logical OR expression
   *
   * LogicalORExpression
   *  : LogicalANDExpression LOGICAL_OR LogicalORExpression
   *  | LogicalORExpression
   *  ;
   */
  private LogicalORExpression(): Expression {
    return this._LogicalExpression("LogicalANDExpression", "LOGICAL_OR");
  }

  /**
   * Logical AND expression
   *
   * LogicalANDExpression
   *  : EqualityExpression LOGICAL_AND LogicalANDExpression
   *  | EqualityExpression
   *  ;
   */
  private LogicalANDExpression(): Expression {
    return this._LogicalExpression("EqualityExpression", "LOGICAL_AND");
  }

  private _LogicalExpression(
    builderName: "EqualityExpression" | "LogicalANDExpression",
    operatorToken: "LOGICAL_AND" | "LOGICAL_OR"
  ): Expression {
    const position = this.tokenizer.currentPosition();
    let left = this[builderName]();

    while (this.lookahead?.type === operatorToken) {
      const operator = this.eat(operatorToken).value as "&&" | "||";
      const right = this[builderName]();

      left = {
        position,
        type: "LogicalExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * AdditiveExpression
   *  : MultiplicativeExpression
   *  | AdditiveExpression ADDITIVE_OPERATOR MultiplicativeExpression
   *  ;
   */
  private AdditiveExpression(): Expression {
    return this._BinaryExpression(
      "MultiplicativeExpression",
      "ADDITIVE_OPERATOR"
    );
  }

  /**
   * MultiplicativeExpression
   *  : UnaryExpression
   *  | MultiplicativeExpression MULTIPLICATIVE_OPERATOR UnaryExpression
   *  ;
   */
  private MultiplicativeExpression(): Expression {
    return this._BinaryExpression("UnaryExpression", "MULTIPLICATIVE_OPERATOR");
  }

  /**
   * Generic binary expression
   */
  private _BinaryExpression(
    builderName:
      | "MultiplicativeExpression"
      | "PrimaryExpression"
      | "AdditiveExpression"
      | "RelationalExpression"
      | "UnaryExpression",
    operatorToken: Token["type"]
  ): Expression {
    const position = this.tokenizer.currentPosition();
    let left = this[builderName]();

    while (this.lookahead?.type === operatorToken) {
      const operator = this.eat(operatorToken).value;
      const right = this[builderName]();

      left = {
        position,
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * UnaryExpression
   *  : LeftHandSideExpression
   *  | ADDITIVE_OPERATOR UnaryExpression
   *  | LOGICAL_NOT UnaryExpression
   *  ;
   */
  private UnaryExpression(): Expression {
    const position = this.tokenizer.currentPosition();
    let operator: "!" | "-" | null = null;
    switch (this.lookahead?.type) {
      case "ADDITIVE_OPERATOR":
        operator = this.eat("ADDITIVE_OPERATOR").value as "-";
        break;
      case "LOGICAL_NOT":
        operator = this.eat("LOGICAL_NOT").value as "!";
        break;
    }
    if (operator !== null) {
      return {
        position,
        type: "UnaryExpression",
        operator,
        argument: this.UnaryExpression(),
      };
    }

    return this.LeftHandSideExpression();
  }

  /**
   * LeftHandSideExpression
   * : CallMemberExpression
   */
  private LeftHandSideExpression(): Expression {
    return this.CallMemberExpression();
  }

  /**
   * CallMemberExpression
   * : MemberExpression
   * | CallExpression
   */
  private CallMemberExpression(): Expression {
    const member = this.MemberExpression(); // might be part of a call

    if (this.lookahead?.type === "(") {
      return this._CallExpression(member);
    }

    return member;
  }

  /**
   * CallExpression
   *  : Callee Arguments
   *
   *  Callee
   *  : MemberExpression
   *  | CallExpression
   */
  private _CallExpression(callee: Expression): Expression {
    let callExpr = {
      type: "CallExpression",
      callee,
      arguments: this.Arguments(),
    } as Extract<Expression, { type: "CallExpression" }>;

    if (this.lookahead?.type === "(") {
      return this._CallExpression(callExpr);
    }

    return callExpr;
  }

  /**
   * Arguments
   *  : '(' OptArgumentList ')'
   *  ;
   */
  private Arguments() {
    this.eat("(");
    const args = this.lookahead?.type !== ")" ? this.ArgumentList() : [];
    this.eat(")");
    return args;
  }

  /**
   * ArgumentList
   *  : AssignmentExpression
   *  | ArgumentList ',' AssignmentExpression
   */
  private ArgumentList() {
    const args = [this.AssignmentExpression()];

    while (this.lookahead?.type === ",") {
      this.eat(",");
      args.push(this.AssignmentExpression());
    }

    return args;
  }

  /**
   * MemberExpression
   *  : PrimaryExpression
   *  | MemberExpression '.' Identifier
   *  | MemberExpression '[' Expression ']'
   *  ;
   */
  private MemberExpression(): Expression {
    const position = this.tokenizer.currentPosition();
    let object = this.PrimaryExpression();

    while (
      this.lookahead?.type === "." ||
      this.lookahead?.type === "[" ||
      this.lookahead?.type === "("
    ) {
      if (this.lookahead?.type === ".") {
        this.eat(".");
        const property = this.Identifier();
        object = {
          position,
          type: "MemberExpression",
          computed: false,
          object,
          property,
        };
      }

      if (this.lookahead?.type === "[") {
        this.eat("[");
        const property = this.Expression();
        this.eat("]");
        object = {
          position,
          type: "MemberExpression",
          computed: true,
          object,
          property,
        };
      }

      if (this.lookahead?.type === "(") {
        object = this._CallExpression(object);
      }
    }

    return object;
  }

  private isLambda(): boolean {
    const nextTokens = [this.lookahead as Token, ...this.tokenizer.peek(3)].map(
      (t) => t.type
    );

    // this is to handle the JS syntax:
    // a => 42
    // () => 42
    // (a) => 42
    // (a: number) => 42
    // (a, b) => 42
    return match(nextTokens)
      .with(["IDENTIFIER", "=>", P._, P._], () => true)
      .with(["(", ")", "=>", P._], () => true)
      .with(["(", "IDENTIFIER", ")", "=>"], () => true)
      .with(["(", "IDENTIFIER", ":", P._], () => true)
      .with(["(", "IDENTIFIER", ",", P._], () => true)
      .otherwise(() => false);
  }

  /**
   * PrimaryExpression
   *  : Literal
   *  | ParenthesizedExpression
   *  | BlockExpression
   *  | ConditionalExpression
   *  | Identifier
   *  ;
   */
  private PrimaryExpression(): Expression {
    if (this.lookahead?.type === "`") {
      return this.TemplateString();
    }

    if (this.isLambda()) {
      return this.Lambda();
    }

    if (this._isLiteral(this.lookahead?.type)) {
      return this.Literal();
    }
    switch (this.lookahead?.type) {
      case "(":
        return this.ParenthesizedExpression();
      case ":":
        return this.BlockExpression();
      case "IDENTIFIER":
        return this.Identifier();
      case "if":
        return this.ConditionalExpression();
      case "match":
        return this.MatchExpression();
      default:
        return this.LeftHandSideExpression();
    }
  }

  private TemplateString(): Expression {
    // this implementation is a little cheeky, not gonna lie.
    const position = this.tokenizer.currentPosition();

    let c = this.tokenizer.nextChar();
    let currentText = "";
    let parts: TemplateStringPart[] = [];

    while (c !== "`") {
      if (c === "$") {
        c = this.tokenizer.nextChar();
        if (c === "{") {
          parts.push({ variant: "string", value: currentText });
          currentText = "";

          // advance to next token
          this.lookahead = this.tokenizer.nextToken();

          let expr = this.Expression();
          parts.push({ variant: "expression", value: expr });
        } else if (c === "`") {
          currentText += "$";
          break;
        } else {
          currentText += "$" + c;
        }
      } else {
        currentText += c;
      }

      c = this.tokenizer.nextChar();
    }

    parts.push({ variant: "string", value: currentText });

    this.lookahead = this.tokenizer.nextToken();

    return {
      position,
      type: "TemplateString",
      parts,
    };
  }

  /**
   * MatchExpression
   *  : 'match' Expression '{' MatchArmList '}'
   */
  private MatchExpression(): Expression {
    const position = this.tokenizer.currentPosition();
    this.eat("match");
    const expr = this.Expression();
    this.eat("{");
    const arms = this.MatchArmList();
    this.eat("}");

    return {
      position,
      type: "MatchExpression",
      scrutinee: expr,
      arms,
    };
  }

  /**
   * MatchArmList
   *  : MatchArm
   *  | MatchArmList MatchArm
   */
  private MatchArmList(): MatchArm[] {
    const arms = [this.MatchArm()];

    while (this.lookahead?.type === ",") {
      this.eat(",");
      arms.push(this.MatchArm());
    }

    return arms;
  }

  /**
   * MatchArm
   *  : Expression '->' Expression
   */
  private MatchArm(): MatchArm {
    const position = this.tokenizer.currentPosition();
    const pattern = this.Expression();
    this.eat("->");
    const expression = this.Expression();

    return {
      position,
      type: "MatchArm",
      pattern,
      expression,
    };
  }

  /**
   *  ConditionalExpression
   *  : 'if' Expression 'then' Expression 'else' Expression
   */
  private ConditionalExpression(): Expression {
    const position = this.tokenizer.currentPosition();
    this.eat("if");
    const test = this.Expression();
    this.eat("then");
    const consequence = this.Expression();
    this.eat("else");
    const alternative = this.Expression();

    return {
      position,
      type: "ConditionalExpression",
      test,
      consequence,
      alternative,
    };
  }

  private _isLiteral(tokenType: Token["type"] | undefined) {
    return (
      tokenType === "NUMBER" ||
      tokenType === "STRING" ||
      tokenType === "number" ||
      tokenType === "string" ||
      tokenType === "[" ||
      tokenType === "infer" ||
      tokenType === "\\" ||
      tokenType === "{"
    );
  }

  /**
   * BlockExpression
   *  : ':{' StatementList '}'
   *  ;
   */
  private BlockExpression(): Expression {
    const position = this.tokenizer.currentPosition();
    this.eat(":");
    this.eat("{");
    const statements = this.StatementList("}");
    this.eat("}");

    return {
      position,
      type: "BlockExpression",
      body: statements,
    };
  }

  /**
   * ParenthesizedExpression
   *  : '(' Expression ')'
   *  ;
   */
  private ParenthesizedExpression(): Expression {
    this.eat("(");
    const expr = this.Expression();
    this.eat(")");

    return expr;
  }

  private Literal(): Expression {
    switch (this.lookahead?.type) {
      case "number":
        return this.NumberKeyword();
      case "string":
        return this.StringKeyword();
      case "NUMBER":
        return this.NumericLiteral();
      case "STRING":
        return this.StringLiteral();
      case "{":
        return this.ObjectLiteralOrMappedType();
      case "[":
        return this.TupleLiteral();
      case "infer":
        return this.InferredVariable();
    }

    throw new SyntaxError(`Unexpected literal production`);
  }

  /**
   * ObjectLiteralOrMappedType
   *  : ObjectLiteral
   *  | MappedType
   */
  private ObjectLiteralOrMappedType(): Expression {
    if (
      this.tokenizer
        .peek(4)
        .map(({ type }) => type)
        .includes("in")
    ) {
      return this.MappedType();
    } else {
      return this.ObjectLiteral();
    }
  }

  /**
   * MappedType
   *  : '{' '[' Identifier 'in' Expression OptAlias ']' OptOptional ':' Expression'}'
   */
  private MappedType(): MappedType {
    const position = this.tokenizer.currentPosition();
    this.eat("{");
    this.eat("[");
    const key = this.Identifier();
    this.eat("in");
    const union = this.Expression();

    let alias = null;
    if (this.lookahead?.type === "as") {
      this.eat("as");
      alias = this.Expression();
    }
    this.eat("]");
    const optional = this.lookahead?.type === "?" ? !!this.eat("?") : false;
    this.eat(":");
    const value = this.Expression();
    this.eat("}");

    return {
      position,
      type: "MappedType",
      key: key.name,
      union,
      value,
      alias,
      optional,
    };
  }

  /**
   * ObjectLiteral
   *  : '{' OptObjectProperties '}'
   */
  private ObjectLiteral(): Expression {
    const position = this.tokenizer.currentPosition();
    this.eat("{");
    const properties =
      this.lookahead?.type === "}" ? [] : this.ObjectProperties();

    this.eat("}");

    return {
      position,
      type: "ObjectLiteral",
      properties,
    };
  }

  /**
   * ObjectProperties
   *  : ObjectProperty
   *  | ObjectProperties ',' ObjectProperty
   *  | ObjectProperties ';' ObjectProperty
   */
  private ObjectProperties(): ObjectProperty[] {
    const properties = [this.ObjectProperty()];

    while (this.lookahead?.type === "," || this.lookahead?.type === ";") {
      this.eat(this.lookahead.type);
      // @ts-ignore lookahead?.type changes after `eat` so the
      // error is incorrect
      if (this.lookahead?.type === "}") {
        break;
      }
      properties.push(this.ObjectProperty());
    }

    return properties;
  }

  /**
   * ObjectProperty
   *  : Identifier OptOptional ':' Expression
   *  | '[' Expression ']' OptOptional ':' Expression
   */
  private ObjectProperty(): ObjectProperty {
    const position = this.tokenizer.currentPosition();
    if (this.lookahead?.type === "[") {
      this.eat("[");
      const key = this.Expression();
      this.eat("]");
      // @ts-ignore TS doesn't understand that lookahead gets changed in `eat`
      const optional = this.lookahead?.type === "?" ? !!this.eat("?") : false;
      this.eat(":");
      const value = this.Expression();

      return {
        position,
        type: "ObjectProperty",
        key,
        computed: true,
        optional,
        value,
      };
    }

    const key = this.Identifier();
    const optional = this.lookahead?.type === "?" ? !!this.eat("?") : false;
    this.eat(":");
    const value = this.Expression();

    return {
      position,
      type: "ObjectProperty",
      key: key.name,
      computed: false,
      optional,
      value,
    };
  }

  private InferredVariable(): Expression {
    const position = this.tokenizer.currentPosition();
    this.eat("infer");
    const name = this.Identifier().name;

    let extendsType = null;
    if (this.lookahead?.type === "extends") {
      this.eat("extends");
      extendsType = this.Expression();
    }

    return {
      position,
      type: "InferredVariable",
      name,
      extends: extendsType,
    };
  }

  private Lambda(): Expression {
    const position = this.tokenizer.currentPosition();
    const params =
      this.lookahead?.type !== "("
        ? // case: a => 42
          [this.Param()]
        : // case: () => 42
        this.tokenizer.peek(1)[0].type === ")" && this.eat("(") && this.eat(")")
        ? []
        : // case: (a) => 42, or (a, b) => 42, etc.
          this.ParameterList();

    this.eat("=>");
    const body = this.Expression();

    return {
      position,
      type: "Lambda",
      params,
      body,
    };
  }

  private StringLiteral(): Expression {
    const position = this.tokenizer.currentPosition();
    const token = this.eat("STRING");

    return {
      position,
      type: "StringLiteral",
      value: token.value.slice(1, -1),
    };
  }

  private NumericLiteral(): Expression {
    const position = this.tokenizer.currentPosition();
    const token = this.eat("NUMBER");

    return {
      position,
      type: "NumericLiteral",
      value: Number(token.value),
    };
  }

  private NumberKeyword(): Expression {
    const position = this.tokenizer.currentPosition();
    const token = this.eat("number");

    return {
      position,
      type: "NumberKeyword",
    };
  }

  private StringKeyword(): Expression {
    const position = this.tokenizer.currentPosition();
    const token = this.eat("string");

    return {
      position,
      type: "StringKeyword",
    };
  }

  /**
   * TupleLiteral
   *  : '[' OptTupleElements ']'
   */
  private TupleLiteral(): Expression {
    const position = this.tokenizer.currentPosition();
    this.eat("[");
    const elements = this.lookahead?.type === "]" ? [] : this.TupleElements();

    this.eat("]");

    return {
      position,
      type: "Tuple",
      elements,
    };
  }

  /**
   * TupleElements
   *  : Expression
   *  | TupleElements Expression
   */
  private TupleElements(): Expression[] {
    const elements = [this.Expression()];

    while (this.lookahead?.type === ",") {
      this.eat(",");
      elements.push(this.Expression());
    }

    return elements;
  }

  // Identifier: IDENTIFIER;
  private Identifier() {
    const position = this.tokenizer.currentPosition();
    const name = this.eat("IDENTIFIER").value;
    return {
      position,
      type: "Identifier",
      name,
    } as const;
  }

  // assert that the current token is of the expected type,
  // "consume it" from the stream and return it.
  private eat(tokenType: Omit<string, Token["type"]> | Token["type"]) {
    const token = this.lookahead;

    if (token === null) {
      throw new SyntaxError(`Unexpected end of input, expected ${tokenType}`);
    }

    if (token.type !== tokenType) {
      throw new SyntaxError(
        `Unexpected token: ${token.type}, expected ${tokenType}`
      );
    }

    // advance to next token
    this.lookahead = this.tokenizer.nextToken();

    return token;
  }
}
