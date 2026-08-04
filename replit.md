# Plain

An Intent-Oriented Programming Language (IOPL) that compiles `.pln` files to JavaScript.

Tagline: "When even a simple sentence can be code."

## Project overview
- Stack: Node.js (no dependencies)
- Compiler: `compiler/` — lexer → parser → AST → JS generator → CLI
- File extension: `.pln`

## How to run

```
node compiler/cli.js examples/hello.pln
```

## Current language support (Day 1)
- `remember <name> as <value>` — declare a variable
- `show <value|name>` — print to stdout

## User preferences
(none recorded)
