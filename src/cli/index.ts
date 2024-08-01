#!/usr/bin/env node

import { Compiler } from "@/compiler";
import fs from "node:fs";
import path from "node:path";
import { program } from "commander";

program.description("Tartak compiler");

program.parse();

const argPath = program.args[0] ?? ".";

const isFile = fs.statSync(argPath).isFile();

if (isFile && !argPath.endsWith(".tartak")) {
  console.error(
    "Invalid file extension, compiler can be only used with .tartak files"
  );
  process.exit(1);
}

if (isFile) {
  console.log(`Compiling ${argPath}`);
  compileFile(path.resolve(argPath));
} else {
  // recursively compile all .tartak files starting from the given directory
  compileDir(path.resolve(argPath));
}

function compileFile(filePath: string) {
  const compiler = new Compiler();
  const contents = fs.readFileSync(filePath);
  const compiled = compiler.compile(contents.toString());
  const compiledPath = path.join(
    path.dirname(filePath),
    `${path.basename(filePath)}.ts`
  );
  console.log(`Writing to ${compiledPath}`);
  fs.writeFileSync(compiledPath, compiled);
}

function compileDir(dirPath: string) {
  const files = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith(".tartak"));

  for (const file of files) {
    compileFile(path.join(dirPath, file.name));
  }
  const dirs = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((f) => f.isDirectory());

  for (const dir of dirs) {
    compileDir(path.join(dirPath, dir.name));
  }
}
