import { test } from "vitest";
import { testExpression } from "./helpers";

test("literals", () => {
  testExpression(`42`, { type: "NumericLiteral", value: 42 });
  testExpression(`"hello"`, { type: "StringLiteral", value: "hello" });
});
