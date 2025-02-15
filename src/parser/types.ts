import type { Token, Position } from "./tokenizer";

export type Param = { position: Position } & {
  type: "Param";
  name: string;
  paramType: Expression | null;
};

export type Definition = { position: Position } & {
  type: "Definition";
  name: string;
  params: Param[];
  body: Expression;
  isExported: boolean;
};

export type Section = {
  type: "Section";
  name: string;
  body: Statement[];
};

export type ImportStatement = {
  type: "ImportStatement";
  imports: string[];
  source: string;
};

export type TartakAST = { position: Position } & (
  | { type: "Program"; body: Definition[] }
  | Expression
  | Param
  | Section
  | Statement
  | MatchArm
  | ObjectProperty
  | ImportStatement
);

export type Literal =
  | { type: "NumericLiteral"; value: number }
  | { type: "StringLiteral"; value: string }
  | { type: "NumberKeyword" }
  | { type: "Tuple"; elements: Expression[] }
  | { type: "Lambda"; params: Param[]; body: Expression }
  | { type: "ObjectLiteral"; properties: ObjectProperty[] }
  | MappedType
  | { type: "InferredVariable"; name: string; extends: Expression | null }
  | { type: "StringKeyword" };

export type ObjectProperty = {
  position: Position;
  type: "ObjectProperty";
  value: Expression;
  optional: boolean;
} & (
  | { computed: false; key: string | number }
  | {
      computed: true;
      key: Expression;
    }
);

export type MappedType = {
  position: Position;
  type: "MappedType";
  key: string | number;
  union: Expression;
  alias: Expression | null;
  value: Expression;
  optional: boolean;
};

export type Statement = { position: Position } & (
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
    }
  | Definition
);

export type MatchArm = {
  position: Position;
  type: "MatchArm";
  pattern: Expression;
  expression: Expression;
};

export type Expression = { position: Position } & (
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
  | Literal
  | {
      type: "MatchExpression";
      scrutinee: Expression;
      arms: MatchArm[];
    }
  | {
      type: "TemplateString";
      parts: TemplateStringPart[];
    }
);

export type TemplateStringPart =
  | { variant: "string"; value: string }
  | { variant: "expression"; value: Expression };
