import type { Token } from "./tokenizer";

export type Param = {
  type: "Param";
  name: string;
  paramType: Expression | null;
};

export type Definition = {
  type: "Definition";
  name: string;
  params: Param[];
  body: Expression;
};

export type Section = {
  type: "Section";
  name: string;
  body: Statement[];
};

export type TartakAST =
  | { type: "Program"; body: Definition[] }
  | Definition
  | Expression
  | Param
  | Section
  | Statement;

export type Literal =
  | { type: "NumericLiteral"; value: number }
  | { type: "StringLiteral"; value: string }
  | { type: "NumberKeyword" }
  | { type: "Tuple"; elements: Expression[] }
  | { type: "Lambda"; params: Param[]; body: Expression }
  | { type: "StringKeyword" };

export type Statement =
  | {
      type: "VariableDeclaration";
      name: string;
      expr: Expression;
    }
  | {
      type: "ExpressionStatement";
      expression: Expression;
    }
  | {
      type: "AssertEqual";
      left: Expression;
      right: Expression;
    };

export type Expression =
  | { type: "BlockExpression"; body: Statement[] }
  | { type: "Identifier"; name: string }
  | {
      type: "BinaryExpression";
      left: Expression;
      operator: Token["value"];
      right: Expression;
    }
  | {
      type: "MemberExpression";
      computed: boolean;
      object: Expression;
      property: Expression;
    }
  | {
      type: "ConditionalExpression";
      test: Expression;
      consequence: Expression;
      alternative: Expression;
    }
  | {
      type: "CallExpression";
      callee: Expression;
      arguments: Expression[];
    }
  | {
      type: "LogicalExpression";
      left: Expression;
      operator: "&&" | "||";
      right: Expression;
    }
  | {
      type: "AssignmentExpression";
      operator: "=";
      left: Expression;
      right: Expression;
    }
  | {
      type: "UnaryExpression";
      operator: "-" | "!";
      argument: Expression;
    }
  | Literal;
