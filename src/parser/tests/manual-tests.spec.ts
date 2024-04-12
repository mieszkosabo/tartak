import { test } from "vitest";
import { Parser } from "../parser";

test("manual test", () => {
  const parser = new Parser();
  const result = parser.parse(`type yo = a.hello().hi`);
  console.log(`Manual test result:
  
  ${JSON.stringify(result, null, 2)}
  `);
});
