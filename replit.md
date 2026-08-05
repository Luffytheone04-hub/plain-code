# Plain

An Intent-Oriented Programming Language (IOPL) that compiles `.pln` files to JavaScript.

Tagline: "When even a simple sentence can be code."

## Project overview
- Stack: Node.js (no dependencies)
- Compiler: `compiler/` — lexer → parser → AST → JS generator → CLI
- File extension: `.pln`
- Current version: 0.5.0

## How to run

```bash
node compiler/cli.js run examples/hello.pln
node compiler/cli.js check app.pln
node compiler/cli.js fmt app.pln
node compiler/cli.js build app.pln
```

## How to test

```bash
node tests/compiler.test.js
```

## Compiler modules

| File                    | Responsibility                                   |
|-------------------------|--------------------------------------------------|
| `compiler/lexer.js`     | Tokenise Plain source into tokens                |
| `compiler/parser.js`    | Build the AST; emit line/column diagnostics      |
| `compiler/generator.js` | Generate JavaScript from the AST                 |
| `compiler/bundler.js`   | Resolve imports, detect circular dependencies    |
| `compiler/formatter.js` | Format Plain source in-place                     |
| `compiler/cli.js`       | Command-line interface                           |

## CLI commands (v0.5.0)

| Command                 | Behaviour                                          |
|-------------------------|----------------------------------------------------|
| `plain run <file>`      | Compile and execute                                |
| `plain build <file>`    | Compile to JavaScript                              |
| `plain check <file>`    | Syntax check only — no output, no execution        |
| `plain fmt <file>`      | Format file in-place                               |
| `plain new [name]`      | Scaffold a new Plain project                       |
| `plain init`            | Create plain.json                                  |
| `plain install`         | Install declared dependencies                      |
| `plain add <pkg>`       | Install package and add to plain.json              |
| `plain remove <pkg>`    | Uninstall package and remove from plain.json       |
| `plain update`          | Update all installed packages                      |
| `plain version`         | Print compiler version                             |
| `plain help`            | Print help text                                    |

## VS Code extension

Located in `plain-vscode/`. See `plain-vscode/README.md` for installation instructions.

## User preferences
(none recorded)
