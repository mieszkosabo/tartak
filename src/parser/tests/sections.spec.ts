import { expect, test } from "vitest";
import { Parser } from "../parser";

test("sections", () => {
  const parser = new Parser();
  const result = parser.parse(`
  
  type hi = 123

  #[test] :{

    AssertEqual(1, 1)


    AssertEqual("hi", "hello") // should fail
  }
  
  `);

  expect(result).toEqual({
    type: "Program",
    body: [
      {
        type: "Definition",
        name: "hi",
        params: [],
        body: { type: "NumericLiteral", value: 123 },
      },

      {
        type: "Section",
        name: "test",
        body: [
          {
            type: "AssertEqual",
            left: { type: "NumericLiteral", value: 1 },
            right: { type: "NumericLiteral", value: 1 },
          },
          {
            type: "AssertEqual",
            left: { type: "StringLiteral", value: "hi" },
            right: { type: "StringLiteral", value: "hello" },
          },
        ],
      },
    ],
  });
});
