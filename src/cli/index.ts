#!/usr/bin/env node

import { Compiler } from "@/compiler";
import fs from "node:fs";
import path from "node:path";
import { program } from "commander";
import { watch } from "chokidar";

program
  .option("-w, --watch", "recompile on file change")
  .description("Tartak compiler");

program.parse();

const argPath = path.resolve(program.args[0] ?? ".");
const isFile = fs.statSync(argPath).isFile();
const isWatch = !!program.opts().watch;

const compile = () => {
  const now = performance.now();
  if (isFile) {
    compileFile(argPath);
  } else {
    // recursively compile all .tartak files starting from the given directory
    compileDir(argPath);
  }
  console.log(`✅ Done in ${(performance.now() - now).toFixed(2)}ms\n`);
};

function compileFile(filePath: string) {
  if (!filePath.endsWith(".tartak")) {
    console.error(
      "Invalid file extension, compiler can be only used with .tartak files"
    );
    process.exit(1);
  }

  try {
    const compiler = new Compiler();
    const contents = fs.readFileSync(filePath);
    const compiled = compiler.compile(contents.toString());
    const compiledPath = path.join(
      path.dirname(filePath),
      `${path.basename(filePath)}.ts`
    );
    fs.writeFileSync(compiledPath, compiled);
  } catch (e) {
    console.error(`Error while compiling ${filePath}`);
    console.error(e);
  }
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

if (!isWatch) {
  compile();
  process.exit(0);
} else {
  compile();
  watch(isFile ? argPath : `${argPath}/**/*.tartak`, { ignoreInitial: true })
    .on("all", (ev, path) => {
      console.log(`⏳ Compiling ${path}`);
      const now = performance.now();
      compileFile(path);
      console.log(
        `✅ Compiled ${path} in ${(performance.now() - now).toFixed(2)}ms\n`
      );
    })
    .on("ready", () => {
      console.log(`👀 Watching for changes in ${argPath}`);
    });
}
