import { test } from "vitest";
import { Parser } from "../parser";

test("manual test", () => {
  const parser = new Parser();
  const result = parser.parse(`type yo = \\(x) => x`);
  console.log(`Manual test result:
  
  ${JSON.stringify(result, null, 2)}
  `);
});
