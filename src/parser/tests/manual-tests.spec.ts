import { test } from "vitest";
import { Parser } from "../parser";

test("manual test", () => {
  const parser = new Parser();
  const result = parser.parse(`
  
  type basic = a => 42;
  type basic2 = () => 42;
  type basic3 = (a) => 42;
  type basic4 = (a, b) => 42;
  type basic5 = ((a, b) => 42);
  type basic6 = (42); 


  `);
  console.log(`Manual test result:
  
  ${JSON.stringify(result, null, 2)}
  `);
});
