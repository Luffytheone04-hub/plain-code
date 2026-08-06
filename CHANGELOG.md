# Changelog

All notable changes to Plain are documented here.

---

## [1.0.0] — 2026

### Milestone

First stable release of Plain. Language syntax is now frozen.

This release is a quality and polish milestone — no new syntax was added.

### Compiler

- Final audit of lexer, parser, generator, bundler, and formatter
- Removed dead code (`cmdWarn_example` placeholder)
- Switched `plain run` internal execution from `execSync` string interpolation to `execFileSync` with argument array
- Improved comments throughout all compiler modules

### CLI

- Updated `plain help` to list all v1.0 stdlib functions
- Output message on `plain run` simplified to `Done.`
- Version bumped to **1.0.0**

### Testing

- 250+ tests covering all language features, CLI, formatter, bundler, and runtime stdlib

### VS Code Extension

- Version bumped to **1.0.0**

### Documentation

- `PLAIN_SPEC.md` updated to v1.0.0 (stable status, complete keyword list, all features documented)
- Website updated to v1.0
- `RELEASE_NOTES.md` and `UPGRADE_GUIDE.md` added

### GitHub Linguist

- `samples/` directory added with representative Plain programs

---

## [0.6.0] — 2026

### Language

**Extended comparisons**
- `is above` → `>` (alias for `is greater than`)
- `is below` → `<` (alias for `is less than`)
- `is at least` → `>=`
- `is at most` → `<=`
- `is not` → `!==`
- `is empty` → `.length === 0`
- `is not empty` → `.length > 0`
- `contains` → `.includes()`
- `starts with` → `.startsWith()`
- `ends with` → `.endsWith()`
- `between X and Y` → `>= X && <= Y`

**Aliases**
- `for every X in Y` — identical to `for each X in Y`

### Runtime Standard Library

New built-in functions (no imports required):

| Plain              | Compiles to                                    |
|--------------------|------------------------------------------------|
| `print(x)`         | `console.log(x)`                               |
| `readFile(path)`   | `require('fs').readFileSync(path, 'utf8')`     |
| `writeFile(p, c)`  | `require('fs').writeFileSync(p, c, 'utf8')`    |
| `fileExists(path)` | `require('fs').existsSync(path)`               |
| `sleep(ms)`        | Synchronous sleep via `Atomics.wait`           |
| `time()`           | `Date.now()`                                   |
| `date()`           | `new Date().toISOString()`                     |
| `jsonEncode(x)`    | `JSON.stringify(x)`                            |
| `jsonDecode(s)`    | `JSON.parse(s)`                                |
| `env(key)`         | `process.env[key]`                             |
| `exit(code)`       | `process.exit(code)`                           |
| `uuid()`           | `require('crypto').randomUUID()`               |

### Express Developer Experience

Cleaner web-app syntax alongside existing `use express` / `when someone visits`:

```plain
web app

route "/"
    reply "Hello"
done

start 3000
```

### SQLite Developer Experience

Simplified database syntax alongside existing `use sqlite`:

```plain
database "app.db"

execute
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
done

insert
    INSERT INTO users (name) VALUES ('Alice')
done

query
    SELECT * FROM users
done
```

### CLI

- Coloured terminal output (✓ green, ✗ red, ⚠ yellow) when stdout is a TTY
- Compilation timing shown for slow stages
- `plain fmt` reports "already formatted" instead of rewriting an identical file
- `plain help` updated with v0.6 feature summary
- Version bumped to **0.6.0**

### VS Code Extension

- Grammar updated with all v0.6 keywords
- Snippets added for common patterns
- `CHANGELOG.md` and `LICENSE` included

### Documentation

- Full documentation website in `docs/website/index.html`
- New examples: `examples/stdlib.pln`, `examples/web-app.pln`

### Tests

- 200+ compiler tests covering all language features

---

## [0.5.0] — 2026

### Tools (RFC-0006 Part 1)

- `plain check <file.pln>` — syntax check without compiling or running
- `plain fmt <file.pln>` — format a Plain file in-place
- Formatter: 4-space indentation, blank lines between top-level blocks, array formatting
- Diagnostics: errors now include `filename — Line N, Column N:`
- VS Code extension scaffolded in `plain-vscode/`

---

## [0.4.2] — 2025

- Package manager: `plain init`, `plain install`, `plain add`, `plain remove`, `plain update`
- Dependency validation before compilation
- Multi-file imports: `import "./math.pln"`

## [0.4.1] — 2025

- Multi-file package system and bundler

## [0.3.0] — 2025

- Express runtime: `use express`, `when someone visits`, `listen on`, `reply`, `serve folder`
- SQLite runtime: `use sqlite`

## [0.2.0] — 2025

- Arrays, objects, `becomes`, `for each`, `while`
- Standard library: `length()`, `uppercase()`, `lowercase()`, `random()`, `round()`

## [0.1.0] — 2025

- `remember`, `show`, `if`/`otherwise`/`done`, `make`/`give`
- Lexer, parser, AST generator, CLI (`plain run`, `plain build`, `plain new`)
