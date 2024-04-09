import { test } from "vitest";
import { testExpression } from "./helpers";

test("primitives", () => {
  testExpression(`string`, { type: "StringKeyword" });
  testExpression(`number`, { type: "NumberKeyword" });
});
