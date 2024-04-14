import { Tokenizer, type Token } from "./tokenizer";
import type { Definition, Expression, Param, Statement } from "./types";

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
      type: "Program",
      body: this.DefinitionOrSectionList(),
    } as const;
  }

  // DefinitionOrSectionList: Definition | Section | DefinitionOrSectionList ...;
  //
  // Since we use a recursive descent parser, we can't do left recursion,
  // so the above rule (and everywhere else) will be implemented with a loop.
  private DefinitionOrSectionList(stopToken: Token["type"] | null = null) {
    const definitions = [this.DefinitionOrSection()];

    while (this.lookahead !== null && this.lookahead.type !== stopToken) {
      definitions.push(this.DefinitionOrSection());
    }

    return definitions;
  }

  /**
   * DefinitionOrSection
   *  : Definition | Section;
   */
  private DefinitionOrSection() {
    if (this.lookahead?.type === "type") {
      return this.Definition();
    } else if (this.lookahead?.type === "#") {
      return this.Section();
    }

    throw new SyntaxError(
      `Unexpected token: \`${this.lookahead}\`. Should be a definition or section.`
    );
  }

  /**
   * Section
   *  : '#' '[' Identifier ']' BlockExpression
   */
  private Section() {
    this.eat("#");
    this.eat("[");
    const name = this.Identifier();
    this.eat("]");
    const body = this.BlockExpression() as Extract<
      Expression,
      { type: "BlockExpression" }
    >;

    return {
      type: "Section",
      name: name.name,
      body: body.body,
    } as const;
  }

  // Definition: "type" Identifier "=" Type ";";
  private Definition() {
    this.eat("type");

    const name = this.Identifier().name;

    const params = this.lookahead?.type === "(" ? this.ParameterList() : [];

    this.eat("=");

    const body = this.Type();

    return {
      type: "Definition",
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
    const ident = this.Identifier();
    const paramType =
      this.lookahead?.type === ":" && this.eat(":") ? this.Expression() : null;

    return {
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
    const id = this.eat("IDENTIFIER");
    if (id.value !== "AssertEqual") {
      throw new SyntaxError(`Expected AssertEqual, got ${id}`);
    }

    this.eat("(");
    const left = this.Expression();
    this.eat(",");
    const right = this.Expression();
    this.eat(")");

    return {
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
    const expr = this.Expression();

    return {
      type: "ExpressionStatement",
      expression: expr,
    };
  }

  /**
   * VariableDeclaration
   *  : 'let' IDENTIFIER '=' Expression ';'
   *  ;
   */
  private VariableDeclaration() {
    this.eat("let");
    let id = this.Identifier();
    this.eat("=");
    let expr = this.Expression();
    this.eat(";");

    return {
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
    const left = this.LogicalORExpression(); // always start with the lowest precedence

    if (this.lookahead?.type !== "=") {
      return left;
    }

    return {
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
    let left = this[builderName]();

    while (this.lookahead?.type === operatorToken) {
      const operator = this.eat(operatorToken).value as "&&" | "||";
      const right = this[builderName]();

      left = {
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
    let left = this[builderName]();

    while (this.lookahead?.type === operatorToken) {
      const operator = this.eat(operatorToken).value;
      const right = this[builderName]();

      left = {
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
      default:
        return this.LeftHandSideExpression();
    }
  }

  /**
   *  ConditionalExpression
   *  : 'if' Expression 'then' Expression 'else' Expression
   */
  private ConditionalExpression(): Expression {
    this.eat("if");
    const test = this.Expression();
    this.eat("then");
    const consequence = this.Expression();
    this.eat("else");
    const alternative = this.Expression();

    return {
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
      tokenType === "\\"
    );
  }

  /**
   * BlockExpression
   *  : ':{' StatementList '}'
   *  ;
   */
  private BlockExpression(): Expression {
    this.eat(":");
    this.eat("{");
    const statements = this.StatementList("}");
    this.eat("}");

    return {
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

  // Literal: "string" | "number";
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
      case "[":
        return this.TupleLiteral();
      case "\\":
        return this.Lambda();
    }

    throw new SyntaxError(`Unexpected literal production`);
  }

  private Lambda(): Expression {
    this.eat("\\");
    const params = this.ParameterList();
    this.eat("=>");
    const body = this.Expression();

    return {
      type: "Lambda",
      params,
      body,
    };
  }

  private StringLiteral(): Expression {
    const token = this.eat("STRING");

    return {
      type: "StringLiteral",
      value: token.value.slice(1, -1),
    };
  }

  private NumericLiteral(): Expression {
    const token = this.eat("NUMBER");

    return {
      type: "NumericLiteral",
      value: Number(token.value),
    };
  }

  private NumberKeyword(): Expression {
    const token = this.eat("number");

    return {
      type: "NumberKeyword",
    };
  }

  private StringKeyword(): Expression {
    const token = this.eat("string");

    return {
      type: "StringKeyword",
    };
  }

  /**
   * TupleLiteral
   *  : '[' OptTupleElements ']'
   */
  private TupleLiteral(): Expression {
    this.eat("[");
    const elements = this.lookahead?.type === "]" ? [] : this.TupleElements();

    this.eat("]");

    return {
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
    const name = this.eat("IDENTIFIER").value;
    return {
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
