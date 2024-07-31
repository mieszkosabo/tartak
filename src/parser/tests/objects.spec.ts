import { test } from "vitest";
import { testExpression } from "./helpers";

test("objects", () => {
  testExpression(`{}`, { type: "ObjectLiteral", properties: [] });
  testExpression(`{ a: 1, b: 2}`, {
    type: "ObjectLiteral",
    properties: [
      {
        type: "ObjectProperty",
        key: "a",
        computed: false,
        value: { type: "NumericLiteral", value: 1 },
      },
      {
        type: "ObjectProperty",
        key: "b",
        computed: false,
        value: { type: "NumericLiteral", value: 2 },
      },
    ],
  });

  testExpression(`{ ["hello"]: 1; ["world"]: "yo"}`, {
    type: "ObjectLiteral",
    properties: [
      {
        type: "ObjectProperty",
        key: { type: "StringLiteral", value: "hello" },
        computed: true,
        value: { type: "NumericLiteral", value: 1 },
      },
      {
        type: "ObjectProperty",
        key: { type: "StringLiteral", value: "world" },
        computed: true,
        value: { type: "StringLiteral", value: "yo" },
      },
    ],
  });
});
