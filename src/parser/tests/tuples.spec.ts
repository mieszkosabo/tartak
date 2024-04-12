import { test } from "vitest";
import { testExpression } from "./helpers";

test("primitives", () => {
  testExpression(`[]`, { type: "Tuple", elements: [] });
  testExpression(`[1, 2, 3]`, {
    type: "Tuple",
    elements: [
      { type: "NumericLiteral", value: 1 },
      { type: "NumericLiteral", value: 2 },
      { type: "NumericLiteral", value: 3 },
    ],
  });

  testExpression(`["hi", "howdy", "hello"]`, {
    type: "Tuple",
    elements: [
      { type: "StringLiteral", value: "hi" },
      { type: "StringLiteral", value: "howdy" },
      { type: "StringLiteral", value: "hello" },
    ],
  });
});
