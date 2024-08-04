![tartak logo](./assets/TARTAK_LOGO.png)

# Tartak

Tartak is a functional programming language that compiles to **TypeScript types**.

My goal was to create a language that's not just a syntax sugar over TypeScript types, but a language that's as close to any general purpose programming language as possible.

Tartak uses [hotscript](https://github.com/gvergnaud/hotscript), [ts-arithmetic](https://github.com/arielhs/ts-arithmetic) and many other tricks to make it happen.

🔔 Keep in mind that this project is a work in progress, may contain bugs and missing features.
Also, see the [ROADMAP](#ROADMAP) section for planned features.
Feel free to request features or report bugs with GitHub issues.

## Feature highlights:

- first-class functions (closures, functions returning functions, partial application, etc.)
- support for arithmetic, relational and logical operators
- built-in test sections a la Rust
- pattern matching

## Quick demo

```ts
// file: parseRoute.tartak

// exported types will be available for you to import from compiled files
// to distinguish between objects ({}) and blocks, blocks have a colon before the opening brace (:{})
export type parseRoute = (route: string) => :{
  // assign computations to variables like this
  let parts = route.split("/"); // -> ["users", "<id:string>", "posts", "<index:number>"]

  // last expression is the return value, like in Rust
  parts
    // method chaining!
    .filter((part) => part.startsWith("<")) // -> ["<id:string>", "<index:number>"]
    .map((part) => match part {
      // infer subparts of the expression during pattern matching
      `<${infer name}:${infer ty}>` -> [name, ty]
    }) // -> [["id", "string"], ["index", "number"]]
    .toUnion() // -> ["id", "string"] | ["index", "number"]
    .fromEntries() // -> { id: "string"; index: "number" }
    .mapValues((ty) => match ty {
      "string" -> string,
      "number" -> number
    }) // -> { id: string; index: number }
}

type params = parseRoute("/users/<id:string>/posts/<index:number>")
//   ^?
//    { id: string; index: number; }


// Add tests alongside your code
#[test] :{
  AssertEqual(
    parseRoute("/users/<id:string>/posts/<index:number>"),
    { id: string, index: number }
  )
  AssertEqual(
    parseRoute("/users/noParams"),
    {}
  )
}

```

Then, compile the file with:

```bash
npx tartak parseRoute.tartak
```

This will generate a `parseRoute.tartak.ts` file that exports `parseRoute` type, which can be imported and used like this:

```ts
import { parseRoute } from "./routeParser.tartak";

declare function redirect<Route extends string>(
  route: Route,
  params: parseRoute<Route>
): void;

redirect("/api/v1/user/<id:string>", {
  id: "123", // OK
});

redirect("/api/v1/user/<id:string>", {
  id: 123, // Error: Type 'number' is not assignable to type 'string'
});

redirect("/api/v1/user/<id:string>", {
  hello: "123", // Error: Object literal may only specify known properties, and hello does not exist in type:
});
```

## Getting started

First, install Tartak with your favorite package manager:

```bash
npm i -D tartak
yarn add -D tartak
pnpm add -D tartak
bun add -D tartak
```

Then, create a file with the `.tartak` extension and start writing your code. You can place `.tartak` files anywhere in your project.
For example:

```tartak
// hello.tartak

export type greet = (name: string) => `hello ${name}`;
```

To compile your code into a TypeScript file, run:

```bash
# This will recursively look for all .tartak files starting from the current directory and compile them to corresponding *.tartak.ts files.
npx tartak

# Or, you can specify the path to the file you want to compile
npx tartak hello.tartak

# Or, you can watch for changes
npx tartak --watch
```

## ROADMAP

- [ ] readonly
- [ ] optional parameters
- [ ] language server?
- [x] optional object properties
- [x] cli: --watch flag
- [x] imports/exports
- [x] closures
- [x] partial application
- [x] arithmetic operators
  - [x] - (subtraction)
  - [x] - (negation)
  - [x] `+`
  - [x] /
  - [x] `**` (power)
  - [x] % (mod)
- [x] relational and logical operators
  - [x] ==
  - [x] !=
  - [x] <
  - [x] <=
  - [x] >
  - [x] `>=`
  - [x] && (logical and)
  - [x] || (logical or)
  - [x] ! (logical not)
- [ ] string methods
  - [x] .length
  - [x] .trimLeft
  - [x] .trimRight
  - [x] .trim
  - [x] .replace
  - [ ] .slice
  - [x] .split
  - [x] .repeat
  - [x] .startsWith
  - [x] .endsWith
  - [x] .toTuple
  - [x] .toNumber
  - [x] .toString
  - [x] .stringsPrepend
  - [x] .stringsAppend
  - [x] .uppercase
  - [x] .lowercase
  - [x] .capitalize
  - [x] .uncapitalize
  - [x] .snakeCase
  - [x] .camelCase
  - [x] .kebabCase
  - [x] .compare
  - [x] .lessThan
  - [x] .lessThanOrEqual
  - [x] .greaterThan
  - [x] .greaterThanOrEqual
- [x] number methods
  - [x] .abs
- [ ] object methods
  - [ ] .readonly
  - [ ] .mutable
  - [ ] .required
  - [ ] .partial
  - [ ] .readonlyDeep
  - [ ] .mutableDeep
  - [ ] .requiredDeep
  - [ ] .partialDeep
  - [ ] .update
  - [ ] .keys
  - [ ] .values
  - [ ] .allPath
  - [ ] .get
  - [ ] .fromEntries
  - [ ] .entries
  - [ ] .mapValues
  - [ ] .mapKeys
  - [ ] .assign
  - [ ] .pick
  - [ ] .pickBy
  - [ ] .omit
  - [ ] .omitBy
  - [ ] .objectCamelCase
  - [ ] .objectCamelCaseDeep
  - [ ] .objectSnakeCase
  - [ ] .objectSnakeCaseDeep
  - [ ] .objectKebabCase
  - [ ] .objectKebabCaseDeep
- [ ] union methods
  - [ ] .mapUnion
  - [ ] .extract
  - [ ] .extractBy
  - [ ] .exclude
  - [ ] .excludeBy
  - [ ] .unionNonNullable
  - [ ] .unionToTuple
  - [ ] .unionToIntersection
- [x] tuple methods
  - [x] .partition
  - [x] .isEmpty
  - [x] .zip
  - [x] .zipWith
  - [x] .sort
  - [x] .head
  - [x] .tail
  - [x] .at
  - [x] .last
  - [x] .flatMap
  - [x] .find
  - [x] .drop
  - [x] .take
  - [x] .takeWhile
  - [x] .groupBy
  - [x] .join
  - [x] .map
  - [x] .filter
  - [x] .reduce
  - [x] .reduceRight
  - [x] .reverse
  - [x] .every
  - [x] .splitAt
  - [x] .toUnion
  - [x] .toIntersection
  - [x] .prepend
  - [x] .append
  - [x] .concat
  - [x] .min
  - [x] .max
  - [x] .sum
- [x] objects
  - [x] accessing properties
- [x] mapped types
- [ ] records
- [x] unions
- [x] intersections
- [x] string literals
- [x] match
- [x] first-class testing framework? (kinda)
- [x] syntax highlighting (barely works)

## Syntax highlighting

Currently one can symlink the `tartak-syntax-highlighter` to the `~/.vscode/extensions` directory to get syntax highlighting in Visual Studio Code.
TODO: publish the extension to the marketplace.

- later TODO: create a language server.

## internal notes

`this["arg0"]` is the captured environment of the function, parameters are stored in `this["arg1"], this["arg2"], ...`.
Because hotscript supports up to 4 arguments, then **tartak functions support up to 3 arguments.**

This should be fine, because one of the argument can always be a tuple or an object.
