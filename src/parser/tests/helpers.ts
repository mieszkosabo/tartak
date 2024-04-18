import { expect } from "vitest";
import { Parser } from "../parser";

export const removeKey = <T>(obj: T, keyToRemove: string): T =>
  JSON.parse(
    JSON.stringify(obj, (key, val) => (key === keyToRemove ? undefined : val))
  );

export const testExpression = (expression: string, expectedAST: any) => {
  const parser = new Parser();
  const result = parser.parse(`type _dummy = ${expression}`);

  expect(removeKey(result, "position")).toEqual({
    type: "Program",
    body: [
      {
        type: "Definition",
        name: "_dummy",
        params: [],
        body: expectedAST,
      },
    ],
  });
};
