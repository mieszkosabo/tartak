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
      body: this.DefinitionList(),
    } as const;
  }

  // DefinitionList: Definition | DefinitionList Definition;
  //
  // Since we use a recursive descent parser, we can't do left recursion,
  // so the above rule (and everywhere else) will be implemented with a loop.
  private DefinitionList(stopToken: Token["type"] | null = null) {
    const definitions = [this.Definition()];

    while (this.lookahead !== null && this.lookahead.type !== stopToken) {
      definitions.push(this.Definition());
    }

    return definitions;
  }

  // Definition: "type" Identifier "=" Type ";";
  private Definition() {
    this.eat("type");

    const name = this.Identifier().name;

    const params = this.lookahead?.type === "(" ? this.ParameterList() : [];

    this.eat("SIMPLE_ASSIGN");

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
    switch (this.lookahead?.type) {
      case "let":
        return this.VariableDeclaration();
      default:
        return this.ExpressionStatement();
    }
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
    this.eat("SIMPLE_ASSIGN");
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

    if (!this._isAssignmentOperator(this.lookahead?.type)) {
      return left;
    }

    return {
      type: "AssignmentExpression",
      operator: this.AssignmentOperator().value,
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

  private _isAssignmentOperator(tokenType: Token["type"] | undefined) {
    return tokenType === "SIMPLE_ASSIGN" || tokenType === "COMPLEX_ASSIGN";
  }

  private _checkValidAssignmentTarget(node: any) {
    if (node.type === "Identifier" || node.type === "MemberExpression") {
      return node;
    }

    throw new SyntaxError(`Invalid left-hand side in assignment expression`);
  }

  /**
   * AssignmentOperator
   *  : SIMPLE_ASSIGN
   *  | COMPLEX_ASSIGN
   *  ;
   */

  private AssignmentOperator() {
    if (this.lookahead?.type === "SIMPLE_ASSIGN") {
      return this.eat("SIMPLE_ASSIGN");
    }

    return this.eat("COMPLEX_ASSIGN");
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
    operatorToken: Token["type"]
  ): Expression {
    let left = this[builderName]();

    while (this.lookahead?.type === operatorToken) {
      const operator = this.eat(operatorToken).value;
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
    let operator: Token["value"] | null = null;
    switch (this.lookahead?.type) {
      case "ADDITIVE_OPERATOR":
        operator = this.eat("ADDITIVE_OPERATOR").value;
        break;
      case "LOGICAL_NOT":
        operator = this.eat("LOGICAL_NOT").value;
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
    } as Expression;

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

    while (this.lookahead?.type === "." || this.lookahead?.type === "[") {
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
      tokenType === "string"
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
    }

    throw new SyntaxError(`Unexpected literal production`);
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
