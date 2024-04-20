import { match } from "ts-pattern";
import { Parser } from "../parser/parser";
import type { Expression, Statement, TartakAST } from "../parser/types";

type VarName = string;
type CompilerEnv = {
  innerScope: VarName[];
  outerScope: VarName[];
  params: VarName[];
};

export class Compiler {
  private parser = new Parser();
  private imports: {
    hot: Set<string>;
    math: Set<string>;
    prelude: Set<string>;
  } = {
    hot: new Set(),
    math: new Set(),
    prelude: new Set(),
  };
  private nextId = 1;
  private lambdas: Record<string, { argCount: number; code: string }> = {};

  compile(tartakCode: string) {
    const ast = this.parser.parse(tartakCode);
    return this._compile(ast as TartakAST, {
      innerScope: [],
      outerScope: [],
      params: [],
    });
  }

  private _compile(ast: TartakAST, env: CompilerEnv): string {
    return (
      match(ast)
        .with({ type: "Program" }, (program) => {
          const defs = program.body
            .map((def) => {
              return this._compile(def, {
                innerScope: [],
                outerScope: [],
                params: [],
              });
            })
            .join(";\n\n");

          const hotImports =
            this.imports.hot.size > 0
              ? `import { type ${Array.from(this.imports.hot.values()).join(
                  ", type "
                )} } from "hotscript"`
              : "";
          const mathImports =
            this.imports.math.size > 0
              ? `import { type ${Array.from(this.imports.math.values()).join(
                  ", type "
                )} } from "ts-arithmetic"`
              : "";
          const preludeImports =
            this.imports.prelude.size > 0
              ? `import { type ${Array.from(this.imports.prelude.values()).join(
                  ", type "
                )} } from "@/prelude"`
              : "";

          const lambdaDefs = Object.values(this.lambdas)
            .map((l) => l.code)
            .join(";\n\n");

          return `${hotImports}
${mathImports}
${preludeImports}

${lambdaDefs}

${defs}`;
        })
        .with({ type: "Definition" }, (def) => {
          if (def.params.length > 0) {
            // we want to keep all functions as lambdas, so we can partially apply them
            const lambdaExpr: Expression = {
              position: def.position,
              type: "Lambda",
              params: def.params,
              body: def.body,
            };

            const lambdaName = this._compile(lambdaExpr, env);

            return `type ${def.name} = ${lambdaName}`;
          } else {
            return `type ${def.name} = ${this._compile(def.body, env)}`;
          }
        })

        .with({ type: "Section" }, (section) => {
          const body = section.body
            .map((s) => this._compile(s, env))
            .join("\n");
          return `// ${section.name}
namespace ${section.name} {
  ${body}
}`;
        })

        .with({ type: "Param" }, (param) => {
          return `${param.name}${
            param.paramType
              ? ` extends ${this._compile(param.paramType, env)}`
              : ""
          }`;
        })

        .with({ type: "AssertEqual" }, (ass) => {
          this.imports.hot.add("Booleans");
          this.imports.hot.add("Call");
          this.imports.prelude.add("Expect");

          const left = this._compile(ass.left, env);
          const right = this._compile(ass.right, env);

          return `type ${this.freshId()} = Expect<Call<Booleans.Equals<${left}, ${right}>>>`;
        })

        //Expressions
        .with({ type: "Identifier" }, (ident) => {
          const maybeOuterScopeIdx = env.outerScope.indexOf(ident.name);
          const maybeParamsIdx = env.params.indexOf(ident.name);

          if (maybeOuterScopeIdx !== -1) {
            return `this["arg0"][${maybeOuterScopeIdx}] /** ${ident.name} */`;
          } else if (maybeParamsIdx !== -1) {
            return `this["arg${maybeParamsIdx + 1}"] /** ${ident.name} */`;
          }

          // default: inner scope variable or global identifier
          return ident.name;
        })
        .with({ type: "BinaryExpression" }, (expr) => {
          const fn: {
            fName: string;
            leftType: string | null;
            rightType: string | null;
          } = match(expr.operator)
            .with("+", () => {
              this.imports.math.add("Add");
              return {
                fName: "Add",
                leftType: "number",
                rightType: "number",
              };
            })
            .with("-", () => {
              this.imports.math.add("Subtract");
              return {
                fName: "Subtract",
                leftType: "number",
                rightType: "number",
              };
            })
            .with("-", () => {
              this.imports.math.add("Subtract");
              return {
                fName: "Subtract",
                leftType: "number",
                rightType: "number",
              };
            })
            .with("<", () => {
              this.imports.math.add("Lt");
              return {
                fName: "Lt",
                leftType: "number",
                rightType: "number",
              };
            })
            .with("==", () => {
              this.imports.hot.add("Booleans");
              return {
                fName: "Booleans.Equals",
                leftType: null,
                rightType: null,
              };
            })
            .run();

          // TODO: refactor
          const shouldAdjust = ["Lt", "LtOrEq", "Gt", "GtOrEq"].includes(
            fn.fName
          );

          const left = this._compile(expr.left, env);
          const right = this._compile(expr.right, env);

          const leftId = this.freshId();
          const rightId = this.freshId();

          const call =
            expr.operator === "=="
              ? `Call<${fn.fName}, ${leftId}, ${rightId}> ${
                  shouldAdjust ? "extends 1 ? true : false" : ""
                }`
              : `${fn.fName}<${leftId}, ${rightId}> ${
                  shouldAdjust ? "extends 1 ? true : false" : ""
                }`;

          return `(${left} extends infer ${leftId} ${
            fn.leftType ? `extends ${fn.leftType}` : ""
          }
            ? ${right} extends infer ${rightId} ${
            fn.leftType ? `extends ${fn.leftType}` : ""
          }
              ? (${call})
              : never
            : never)`;
        })

        .with({ type: "CallExpression" }, (expr) => {
          // TODO: this doesn't work yet, because I don't know how to check if a function is a partial apply.
          // needs more bookkeeping
          const isPartialApply = false;

          this.imports.hot.add("PartialApply");
          this.imports.hot.add("Apply");

          if (expr.callee.type === "MemberExpression") {
            return this.compileMethodCall(expr, env);
          }

          const evaledArgs = expr.arguments.map((e) => ({
            name: this.freshId(),
            expr: this._compile(e, env),
          }));

          const cont = (args: { name: string; expr: string }[]): string => {
            const evaledCallee = this._compile(expr.callee, env);
            if (args.length === 0 && expr.arguments.length !== 0) {
              const args = evaledArgs.map((arg) => arg.name).join(",");
              // FIXME: this is a temporary hack to make it work: we call a fun with Apply, and if it
              // extends never, then we call it with PartialApply lol

              return `(Apply<${evaledCallee}, [${args}]>) extends never
                ? (PartialApply<${evaledCallee}, [${args}]>)
                : (Apply<${evaledCallee}, [${args}]>)`;
            } else if (args.length === 0) {
              return evaledCallee;
            }

            const [a, ...rest] = args;

            return `(${a.expr}) extends infer ${a.name} extends (${a.expr})
            ? (${cont(rest)})
            : never`;
          };

          return "(" + cont(evaledArgs) + ")";
        })

        .with({ type: "Lambda" }, (lambda) => {
          this.imports.hot.add("Fn");
          this.imports.hot.add("PartialApply");

          const body = lambda.body;
          const params = lambda.params.map((p) => p.name);
          const newEnv: CompilerEnv = {
            params,
            outerScope: [
              ...env.innerScope,
              ...env.outerScope,
              ...env.params,
            ].filter((p) => !params.includes(p)),
            innerScope: [],
          };

          const compiledBody = this._compile(body, newEnv);

          const fnName = `lambda_${this.freshId()}`;
          this.lambdas[fnName] = {
            code: `interface ${fnName} extends Fn {
            return: ${compiledBody}
          }`,
            argCount: lambda.params.length,
          };

          const passingInnerScope = env.innerScope;
          const passingScope = env.outerScope.map(
            (_, idx) => `this["arg0"][${idx}]`
          );
          const passingParams = env.params.map(
            (_, idx) => `this["arg${idx + 1}"]`
          );
          return `[${passingInnerScope
            .concat(passingScope)
            .concat(passingParams)
            .join(
              ", "
            )}] extends infer scope ? PartialApply<${fnName}, [scope]> : never`;
        })

        .with({ type: "BlockExpression" }, (expr) => {
          const statements = expr.body;
          if (statements.length === 1) {
            return this._compile(statements[0], env);
          }

          const lastElem = statements.pop();

          const declarations = statements.map(
            (decl) =>
              decl as Extract<Statement, { type: "VariableDeclaration" }>
          ) as unknown as Extract<Statement, { type: "VariableDeclaration" }>[];

          const newEnv: CompilerEnv = {
            params: env.params,
            innerScope: env.innerScope,
            outerScope: env.outerScope,
          };

          const evaledDeclarations: { name: string; expr: string }[] = [];

          for (const decl of declarations) {
            evaledDeclarations.push({
              name: decl.name,
              expr: this._compile(decl.expr, newEnv),
            });
            newEnv.params = newEnv.params.filter((p) => p !== decl.name);
            newEnv.outerScope = newEnv.outerScope.filter(
              (p) => p !== decl.name
            );
            newEnv.innerScope.push(decl.name);
          }

          const cont = (
            decls: { name: string; expr: string }[],
            lastElem: string
          ): string => {
            if (decls.length === 0) {
              return lastElem;
            } else {
              const [d, ...rest] = decls;
              return `(${d.expr}) extends infer ${d.name} extends (${d.expr})
                ? (${cont(rest, lastElem)})
                : never`;
            }
          };

          return cont(evaledDeclarations, this._compile(lastElem!, newEnv));
        })

        .with({ type: "ExpressionStatement" }, (expr) => {
          return this._compile(expr.expression, env);
        })

        .with({ type: "ConditionalExpression" }, (expr) => {
          const { test, consequence, alternative } = expr;

          return `(${this._compile(test, env)}) extends true
          ? ${this._compile(consequence, env)}
          : ${this._compile(alternative, env)}`;
        })

        // Literals
        .with({ type: "NumericLiteral" }, (lit) => {
          return String(lit.value);
        })
        .with({ type: "StringLiteral" }, (lit) => {
          return `"${lit.value}"`;
        })
        .with({ type: "NumberKeyword" }, (lit) => {
          return "number";
        })
        .with({ type: "StringKeyword" }, (lit) => {
          return "string";
        })
        .with({ type: "Tuple" }, (lit) => {
          return `[${lit.elements
            .map((e) => this._compile(e, env))
            .join(", ")}]`;
        })
        .otherwise(() => `unimplemented, ${JSON.stringify(ast, null, 2)}`)
    );
  }

  // TODO: apart from `map` other needs to be custom implemented from scratch
  // to adhere to the scope/params convention I have going on here
  private compileMethodCall(
    expr: Extract<Expression, { type: "CallExpression" }>,
    env: CompilerEnv
  ) {
    const callee = expr.callee;
    if (callee.type !== "MemberExpression") {
      throw new Error("Expected callee to be a MemberExpression");
    }

    this.imports.hot.add("Pipe");

    const fun = match(callee.property)
      .with({ type: "Identifier", name: "sort" }, () => {
        this.imports.hot.add("Tuples");
        return "Tuples.Sort";
      })
      .with({ type: "Identifier", name: "sum" }, () => {
        this.imports.hot.add("Tuples");
        return "Tuples.Sum";
      })
      .with({ type: "Identifier", name: "head" }, () => {
        this.imports.hot.add("Tuples");
        return "Tuples.Head";
      })
      .with({ type: "Identifier", name: "tail" }, () => {
        this.imports.hot.add("Tuples");
        return "Tuples.Tail";
      })
      .with({ type: "Identifier", name: "last" }, () => {
        this.imports.hot.add("Tuples");
        return "Tuples.Last";
      })
      .with({ type: "Identifier", name: "at" }, () => {
        this.imports.hot.add("Tuples");
        return `Tuples.At`;
      })
      .with({ type: "Identifier", name: "drop" }, () => {
        this.imports.hot.add("Tuples");
        return `Tuples.Drop`;
      })
      .with({ type: "Identifier", name: "take" }, () => {
        this.imports.hot.add("Tuples");
        return `Tuples.Take`;
      })

      .with({ type: "Identifier", name: "map" }, () => {
        this.imports.prelude.add("Map");
        return `Map`;
      })
      .otherwise(() => {
        throw new Error("unimplemented method " + callee.property);
      });

    return `(${fun}<${expr.arguments
      .map((arg) => this._compile(arg, env))
      .join(",")}, ${this._compile(callee.object, env)}>)`;
  }

  private freshId() {
    return `temp_${this.nextId++}`;
  }
}
