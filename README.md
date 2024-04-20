# tartak

## TODOs

- [ ] finish type-checker and integrate it with compiler
- [x] partial application
- [ ] string functions
- [ ] array functions
- [ ] "enums" (data types)
- [ ] match
- [x] map with captures
- [ ] fix all todos and fixmes
- [x] first-class testing framework? (kinda)
- [x] syntax highlighting (barely works)

## Syntax highlighting

Currently one can symlink the `tartak-syntax-highlighter` to the `~/.vscode/extensions` directory to get syntax highlighting in Visual Studio Code.
TODO: publish the extension to the marketplace.

- later TODO: create a language server.

## internal notes

`this["arg0"]` is the scope of the function, parameters are stored in `this["arg1"], this["arg2"], ...`.
Because hotscript supports up to 4 arguments, then tartak functions support up to 3 arguments.

This should be fine, because one of the argument can always be a tuple or an object.
