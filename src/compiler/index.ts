import { match } from "ts-pattern";
import { Parser } from "../parser/parser";
import type { Expression, Statement, TartakAST } from "../parser/types";
import fs from "node:fs";

class Compiler {
  private ast: TartakAST | null = null;
  private parser = new Parser();
  private imports: {
    math: Set<string>;
    utils: Set<string>;
    hot: Set<string>;
    // local: Set<string>;
  } = {
    math: new Set(),
    utils: new Set(),
    hot: new Set(),
  };
  private nextId = 1;

  compile(tartakCode: string) {
    const ast = this.parser.parse(tartakCode);
    return this._compile(ast as TartakAST);
  }

  private _compile(ast: TartakAST): string {
    return (
      match(ast)
        .with({ type: "Program" }, (program) => {
          const defs = program.body
            .map((def) => {
              return this._compile(def);
            })
            .join(";\n\n");

          const mathImports =
            this.imports.math.size > 0
              ? `import { type ${Array.from(this.imports.math.values()).join(
                  ", type "
                )} } from "ts-arithmetic"`
              : "";
          const utilsImports =
            this.imports.utils.size > 0
              ? `import { type ${Array.from(this.imports.utils.values()).join(
                  ", type "
                )} } from "type-fest"`
              : "";
          const hotImports =
            this.imports.hot.size > 0
              ? `import { type ${Array.from(this.imports.hot.values()).join(
                  ", type "
                )} } from "hotscript"`
              : "";

          return `${hotImports}\n${mathImports}\n${utilsImports}\n\n${defs}`;
        })
        .with({ type: "Definition" }, (def) => {
          const body = this._compile(def.body);
          const params = def.params.map((p) => this._compile(p));
          return `type ${def.name}${
            params.length > 0 ? `<${params.join(",")}>` : ""
          } = ${body}`;
        })

        .with({ type: "Param" }, (param) => {
          return `${param.name}${
            param.paramType ? ` extends ${this._compile(param.paramType)}` : ""
          }`;
        })

        //Expressions
        .with({ type: "Identifier" }, (ident) => {
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
              this.imports.utils.add("IsEqual");
              return {
                fName: "IsEqual",
                leftType: null,
                rightType: null,
              };
            })
            .run();

          // TODO: refactor
          const shouldAdjust = ["Lt", "LtOrEq", "Gt", "GtOrEq"].includes(
            fn.fName
          );

          const left = this._compile(expr.left);
          const right = this._compile(expr.right);

          const leftId = this.freshId();
          const rightId = this.freshId();

          return `(${left} extends infer ${leftId} ${
            fn.leftType ? `extends ${fn.leftType}` : ""
          }
            ? ${right} extends infer ${rightId} ${
            fn.leftType ? `extends ${fn.leftType}` : ""
          }
              ? (${fn.fName}<${leftId}, ${rightId}> ${
            shouldAdjust ? "extends 1 ? true : false" : ""
          })
              : never
            : never)`;
        })

        .with({ type: "CallExpression" }, (expr) => {
          if (expr.callee.type === "MemberExpression") {
            return this.compileMethodCall(expr);
          }

          const evaledArgs = expr.arguments.map((e) => ({
            name: this.freshId(),
            expr: this._compile(e),
          }));

          const cont = (args: { name: string; expr: string }[]): string => {
            if (args.length === 0 && expr.arguments.length !== 0) {
              return `${this._compile(expr.callee)}<${evaledArgs
                .map((arg) => arg.name)
                .join(",")}>`;
            } else if (args.length === 0) {
              return this._compile(expr.callee);
            }

            const [a, ...rest] = args;

            // FIXME: fix `extends number` hard coded
            return `(${a.expr}) extends infer ${a.name} extends number
            ? (${cont(rest)})
            : never`;
          };

          return "(" + cont(evaledArgs) + ")";
        })

        .with({ type: "BlockExpression" }, (expr) => {
          const statements = expr.body;
          if (statements.length === 1) {
            return this._compile(statements[0]);
          }

          const lastElem = statements.pop();

          const declarations = statements.map((decl) =>
            this.declareVariable(
              decl as Extract<Statement, { type: "VariableDeclaration" }>
            )
          ) as unknown as Extract<Statement, { type: "VariableDeclaration" }>[];

          const cont = (
            decls: Extract<Statement, { type: "VariableDeclaration" }>[],
            lastElem: string
          ): string => {
            if (decls.length === 0) {
              return lastElem;
            } else {
              const [d, ...rest] = decls;
              return `(${d.expr}) extends infer ${d.name}
                ? (${cont(rest, lastElem)})
                : never`;
            }
          };

          return cont(declarations, this._compile(lastElem!));
        })

        .with({ type: "ExpressionStatement" }, (expr) => {
          return this._compile(expr.expression);
        })

        .with({ type: "ConditionalExpression" }, (expr) => {
          const { test, consequence, alternative } = expr;

          return `(${this._compile(test)}) extends true
          ? ${this._compile(consequence)} 
          : ${this._compile(alternative)}`;
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
          return `[${lit.elements.map((e) => this._compile(e)).join(", ")}]`;
        })
        .otherwise(() => `unimplemented, ${JSON.stringify(ast, null, 2)}`)
    );
  }

  private compileMethodCall(
    expr: Extract<Expression, { type: "CallExpression" }>
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
        return `Tuples.At<${expr.arguments
          .map((arg) => this._compile(arg))
          .join(",")}>`;
      })
      .with({ type: "Identifier", name: "drop" }, () => {
        this.imports.hot.add("Tuples");
        return `Tuples.Drop<${expr.arguments
          .map((arg) => this._compile(arg))
          .join(",")}>`;
      })
      .with({ type: "Identifier", name: "take" }, () => {
        this.imports.hot.add("Tuples");
        return `Tuples.Take<${expr.arguments
          .map((arg) => this._compile(arg))
          .join(",")}>`;
      })
      .otherwise(() => {
        throw new Error("unimplemented method " + callee.property);
      });

    return `(Pipe<${this._compile(callee.object)}, [${fun}]>)`;
  }

  private declareVariable(
    s: Extract<Statement, { type: "VariableDeclaration" }>
  ) {
    return {
      name: s.name,
      expr: this._compile(s.expr),
    };
  }

  private freshId() {
    return `temp_${this.nextId++}`;
  }
}

const compiler = new Compiler();

fs.writeFileSync(
  "tmp/test.generated.ts",
  compiler.compile(`
  
  type hello = [2, 1, 3, 4, 5].sort().drop(3)

`)
);
