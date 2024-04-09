import type { Token } from "./tokenizer";

type DefinitionParam = string;

type Definition = {
  type: "Definition";
  name: string;
  params: DefinitionParam[];
  body: never;
};

export type TartakAST =
  | { type: "Program"; body: Definition[] }
  | Definition
  | Expression;

export type Literal =
  | { type: "NumericLiteral"; value: number }
  | { type: "StringLiteral"; value: string }
  | { type: "NumberKeyword" }
  | { type: "StringKeyword" };

export type Statement =
  | {
      type: "ReturnStatement";
      argument: Expression | null;
    }
  | {
      type: "VariableDeclaration";
      name: string;
      expr: Expression;
    }
  | {
      type: "ExpressionStatement";
      expression: Expression;
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
      type: "CallExpression";
      callee: Expression;
      arguments: Expression[];
    }
  | {
      type: "LogicalExpression";
      left: Expression;
      operator: Token["value"];
      right: Expression;
    }
  | {
      type: "AssignmentExpression";
      operator: string;
      left: Expression;
      right: Expression;
    }
  | {
      type: "UnaryExpression";
      operator: Token["value"];
      argument: Expression;
    }
  | Literal;
