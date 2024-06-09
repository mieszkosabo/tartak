# tartak

## ROADMAP

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
- [ ] number methods
- [ ] object methods
- [ ] union methods
- [ ] tuple methods
  - [ ] .partition
  - [ ] .isEmpty
  - [ ] .zip
  - [ ] .zipWIth
  - [x] .sort
  - [x] .head
  - [x] .tail
  - [x] .at
  - [x] .last
  - [ ] .flatMap
  - [ ] .find
  - [x] .drop
  - [x] .take
  - [ ] .takeWhile
  - [ ] .groupBy
  - [ ] .join
  - [x] .map
  - [ ] .filter
  - [ ] .reduce
  - [ ] .reduceRight
  - [ ] .reverse
  - [ ] .every
  - [ ] .splitAt
  - [ ] .toUnion
  - [ ] .toIntersection
  - [ ] .prepend
  - [ ] .append
  - [ ] .concat
  - [ ] .min
  - [ ] .max
  - [x] .sum
- [ ] objects
- [ ] records
- [ ] unions
- [ ] intersections
- [ ] string literals
- [x] match
- [x] first-class testing framework? (kinda)
- [x] syntax highlighting (barely works)
- [ ] fix all todos and fixmes
- [ ] finish type-checker and integrate it with compiler

## Syntax highlighting

Currently one can symlink the `tartak-syntax-highlighter` to the `~/.vscode/extensions` directory to get syntax highlighting in Visual Studio Code.
TODO: publish the extension to the marketplace.

- later TODO: create a language server.

## internal notes

`this["arg0"]` is the scope of the function, parameters are stored in `this["arg1"], this["arg2"], ...`.
Because hotscript supports up to 4 arguments, then tartak functions support up to 3 arguments.

This should be fine, because one of the argument can always be a tuple or an object.
