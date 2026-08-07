# Plain

**Plain** is an Intent-Oriented Programming Language (IOPL) that compiles to JavaScript. You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

Version: **1.0.1** (runtime stabilization)

---

## Running tests

```bash
npm test
```

Compiler, runtime dependency, bundler, formatter, CLI, and runtime stdlib tests.

## CLI usage

```bash
node compiler/cli.js run    <file.pln>   # compile and execute
node compiler/cli.js build  <file.pln>   # compile to .js
  node compiler/cli.js start                 # use the plain.json entry file
  node compiler/cli.js doctor                # check the project environment
node compiler/cli.js check  <file.pln>   # syntax check
node compiler/cli.js fmt    <file.pln>   # format in-place
node compiler/cli.js new    [name]       # scaffold new project
node compiler/cli.js version             # print version
node compiler/cli.js help                # print help
```

## Project structure

```
compiler/
  lexer.js       — tokenises Plain source into tokens
  parser.js      — builds the AST
  generator.js   — generates JavaScript from the AST
  bundler.js     — resolves imports, builds dependency graph
  formatter.js   — formats Plain source code
  cli.js         — command-line interface

tests/
  compiler.test.js   — full compiler and runtime test suite
  fixtures/          — bundler test fixtures

examples/          — example .pln programs
samples/           — representative programs for GitHub Linguist
docs/
  PLAIN_SPEC.md  — language specification (v1.0.1)
  website/       — documentation website

plain-vscode/    — VS Code extension (v1.0.1)
```

## User preferences

- Stabilization release: do not add new syntax or features
- Follow RFC-0008 strictly: correctness, testing, and documentation over new functionality
- Keep compiler modules separate (lexer / parser / generator / bundler / formatter)
