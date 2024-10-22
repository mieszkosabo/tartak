import { P, match } from "ts-pattern";
import { Expression, Statement, TartakAST } from "../parser/types";

type Type =
  | { type: "number" }
  | { type: "string" }
  | { type: "boolean" }
  | { type: "numberLit"; value: number }
  | { type: "stringLit"; value: string }
  | { type: "true" }
  | { type: "false" }
  | { type: "tuple"; types: Type[] }
  | { type: "union"; types: Type[] }
  | { type: "any" }
  | { type: "fn"; args: Type[]; returnType: Type };

type Ident = string;

type TypeEnv = Record<Ident, Type | undefined>;

export const checkStatement = (stmt: Statement, env: TypeEnv): TypeEnv =>
  match(stmt)
    .with({ type: "ExpressionStatement" }, () => env)
    .with({ type: "VariableDeclaration" }, (decl) => {
      return {
        ...env,
        [decl.name]: evalExprType(decl.expr, env),
      } as TypeEnv;
    })
    .with({ type: "AssertEqual" }, () => env)
    .with({ type: "Definition" }, (e) => {
      const newEnv = e.params.reduce(
        (acc, curr) => {
          acc[curr.name] = curr.paramType
            ? evalExprType(curr.paramType, env)
            : { type: "any" };
          return acc;
        },
        { ...env }
      );
      const returnType = evalExprType(e.body, newEnv);

      return env;
    })
    .exhaustive();

const checkStatements = (stmts: Statement[], initialEnv: TypeEnv): TypeEnv =>
  stmts.reduce((acc, curr) => checkStatement(curr, acc), initialEnv);

export const evalExprType = (expr: Expression, env: TypeEnv): Type => {
  return match<Expression, Type>(expr)
    .with({ type: "StringKeyword" }, () => ({ type: "string" }))
    .with({ type: "NumberKeyword" }, () => ({ type: "number" }))
    .with({ type: "StringLiteral", value: P.select() }, (value) => ({
      type: "stringLit",
      value,
    }))
    .with({ type: "NumericLiteral", value: P.select() }, (value) => ({
      type: "numberLit",
      value,
    }))
    .with({ type: "UnaryExpression" }, (e) => {
      const argT = evalExprType(e.argument, env);

      return match<[Type, (typeof e)["operator"]], Type>([argT, e.operator])
        .with([{ type: "number" }, "-"], () => ({ type: "number" }))
        .with([{ type: "numberLit", value: P.select() }, "-"], (val) => ({
          type: "numberLit",
          value: -val,
        }))
        .with([{ type: "boolean" }, "!"], () => ({ type: "boolean" }))
        .with([{ type: "false" }, "!"], () => ({
          type: "true",
        }))
        .with([{ type: "true" }, "!"], () => ({
          type: "false",
        }))
        .otherwise(() => {
          throw new Error("unimplemented unary operator?");
        });
    })
    .with({ type: "LogicalExpression" }, (e) => {
      const leftT = evalExprType(e.left, env);
      const rightT = evalExprType(e.right, env);

      return (
        match<[Type, Type, (typeof e)["operator"]], Type>([
          leftT,
          rightT,
          e.operator,
        ])
          .with([{ type: "boolean" }, P._, P._], () => ({ type: "boolean" }))
          .with([P._, { type: "boolean" }, P._], () => ({ type: "boolean" }))

          // just some truth tables, why not
          .with([{ type: "true" }, { type: "true" }, "&&"], () => ({
            type: "true",
          }))
          .with([{ type: "true" }, { type: "false" }, "&&"], () => ({
            type: "false",
          }))
          .with([{ type: "false" }, { type: "true" }, "&&"], () => ({
            type: "false",
          }))
          .with([{ type: "false" }, { type: "false" }, "&&"], () => ({
            type: "false",
          }))

          .with([{ type: "true" }, { type: "true" }, "||"], () => ({
            type: "true",
          }))
          .with([{ type: "true" }, { type: "false" }, "||"], () => ({
            type: "true",
          }))
          .with([{ type: "false" }, { type: "true" }, "||"], () => ({
            type: "true",
          }))
          .with([{ type: "false" }, { type: "false" }, "||"], () => ({
            type: "false",
          }))

          .otherwise(() => {
            throw new Error(
              "LogicalExpression used with non-boolean arguments!"
            );
          })
      );
    })
    .with({ type: "Identifier" }, ({ name }) => {
      const ty = env[name];

      if (ty) {
        return ty;
      } else {
        throw new Error(`Unknown identifier: ${ty}`);
      }
    })

    .with({ type: "BinaryExpression" }, () => ({ type: "number" }))
    .with({ type: "BlockExpression" }, (e) => {
      const newEnv = checkStatements(e.body, env);
      return evalExprType(
        (e.body.at(-1)! as Extract<Statement, { type: "ExpressionStatement" }>)
          .expression,
        newEnv
      );
    })
    .with({ type: "AssignmentExpression" }, (e) => {
      return evalExprType(e.right, env);
    })
    .with({ type: "ConditionalExpression" }, (e) => {
      return {
        type: "union",
        types: [
          evalExprType(e.consequence, env),
          evalExprType(e.alternative, env),
        ],
      };
    })
    .with({ type: "Lambda" }, (e) => {
      const newEnv = e.params.reduce(
        (acc, curr) => {
          const paramType = curr.paramType;
          acc[curr.name] = paramType
            ? evalExprType(paramType, env)
            : { type: "any" };
          return acc;
        },
        { ...env }
      );
      return {
        type: "fn",
        args: e.params.map((p) =>
          p.paramType ? evalExprType(p.paramType, env) : { type: "any" }
        ),
        returnType: evalExprType(e.body, newEnv),
      };
    })
    .with({ type: "Tuple" }, (e) => {
      return {
        type: "tuple",
        types: e.elements.map((el) => evalExprType(el, env)),
      };
    })
    .with({ type: "CallExpression" }, (e) => {
      const callee = evalExprType(e.callee, env);
      if (callee.type === "fn") {
        // TODO: checks
        return callee.returnType;
      } else {
        throw new Error("TypeChecker: callee is not a function");
      }
    })
    .with({ type: "MemberExpression" }, () => {
      throw new Error("TypeChecker Unimplemented: MemberExpression");
    })
    .exhaustive();
};

export class TypeChecker {
  // checkTypes(ast: TartakAST): TypeEnv {
  //   const env: TypeEnv = {};
  //   if (ast.type === "Program") {
  //     ast.
  //     return checkStatements(ast, {});
  //   }
  // }
}
