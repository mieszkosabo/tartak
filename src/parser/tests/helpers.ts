import { expect } from "vitest";
import { Parser } from "../parser";

export const testExpression = (expression: string, expectedAST: any) => {
  const parser = new Parser();
  const result = parser.parse(`type _dummy = ${expression}`);

  expect(result).toEqual({
    type: "Program",
    body: [
      {
        type: "Definition",
        name: "_dummy",
        body: expectedAST,
      },
    ],
  });
};
