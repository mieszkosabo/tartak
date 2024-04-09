import { test } from "vitest";
import { Parser } from "../parser";

test("manual test", () => {
  const parser = new Parser();
  const result = parser.parse(`type yo = :{
    let a = 1;
    let b = 2;
    
    a | b
  }`);
  console.log(`Manual test result:
  
  ${JSON.stringify(result, null, 2)}
  `);
});
