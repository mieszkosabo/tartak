import { test } from "vitest";
import { testExpression } from "./helpers";

test("unions & intersections", () => {
  testExpression(`1 | 2`, {
    type: "BinaryExpression",
    operator: "|",
    left: { type: "NumericLiteral", value: 1 },
    right: { type: "NumericLiteral", value: 2 },
  });

  testExpression(`"hi" & "howdy" & "hello"`, {
    type: "BinaryExpression",
    operator: "&",
    left: {
      type: "BinaryExpression",
      operator: "&",
      left: { type: "StringLiteral", value: "hi" },
      right: { type: "StringLiteral", value: "howdy" },
    },
    right: { type: "StringLiteral", value: "hello" },
  });
});
