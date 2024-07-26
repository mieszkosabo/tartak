import { test } from "vitest";
import { testExpression } from "./helpers";

test("template strings", () => {
  testExpression("`hello ${string}, what is ${number}?`", {
    type: "TemplateString",
    parts: [
      { variant: "string", value: "hello " },
      { variant: "expression", value: { type: "StringKeyword" } },
      { variant: "string", value: ", what is " },
      { variant: "expression", value: { type: "NumberKeyword" } },
      { variant: "string", value: "?" },
    ],
  });
});
