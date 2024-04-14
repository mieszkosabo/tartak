import { Compiler } from "@/compiler";
import fs from "node:fs";
import path from "node:path";

const dir = "tests";

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".tartak"));

const removeExtension = (filename: string) => {
  const parts = filename.split(".");
  parts.pop();
  return parts.join(".");
};

for (const file of files) {
  console.log(`Compiling ${file}`);
  const compiler = new Compiler();
  const filePath = path.join(dir, file);
  const contents = fs.readFileSync(filePath);

  const compiled = compiler.compile(contents.toString());

  const compiledPath = path.join(dir, `${file}.ts`);

  fs.writeFileSync(compiledPath, compiled);
}
