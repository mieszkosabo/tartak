import { test } from "vitest";
import { testExpression } from "./helpers";

test("match", () => {
  testExpression(
    `match 42 {
    1 -> "one",
    infer Num extends number -> Num + 1,
    infer Else -> "something else"
  }`,
    {
      type: "MatchExpression",
      scrutinee: { type: "NumericLiteral", value: 42 },
      arms: [
        {
          type: "MatchArm",
          pattern: { type: "NumericLiteral", value: 1 },
          expression: { type: "StringLiteral", value: "one" },
        },
        {
          type: "MatchArm",
          pattern: {
            type: "InferredVariable",
            name: "Num",
            extends: { type: "NumberKeyword" },
          },
          expression: {
            type: "BinaryExpression",
            left: { type: "Identifier", name: "Num" },
            operator: "+",
            right: { type: "NumericLiteral", value: 1 },
          },
        },
        {
          type: "MatchArm",
          pattern: { type: "InferredVariable", name: "Else", extends: null },
          expression: { type: "StringLiteral", value: "something else" },
        },
      ],
    }
  );
});
