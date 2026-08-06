# Plain v1.0.0 — Release Notes

**Release date:** 2026

---

## What is Plain?

Plain is an Intent-Oriented Programming Language (IOPL) that compiles to JavaScript.

You describe **what** you want. The compiler decides **how** to implement it.

```plain
remember name as "Ayokunle"
remember age as 17

if age is at least 18
    show "Adult"
otherwise
    show "Teenager"
done
```

---

## What's in v1.0.0?

This is the first **stable release** of Plain.

The language syntax is now frozen. No new syntax changes are planned before v1.1.

### Quality improvements

- Compiler audit: dead code removed, comments improved, naming clarified
- CLI: `plain run` now uses `execFileSync` (no shell interpolation)
- 250+ tests passing across all language features
- Documentation updated throughout

### Language features (all stable)

- Variables: `remember` / `becomes`
- Printing: `show`
- Conditions: `if` / `otherwise` / `done` with all comparison operators
- Functions: `make` / `give`
- Loops: `for each` / `for every` / `while`
- Arrays and objects
- Imports: `import "./file.pln"`
- Runtime packages: `use express` / `use sqlite` / `use fs` / `use path`
- Express server (classic and shorthand)
- SQLite database (classic and shorthand)
- Standard library: `print`, `readFile`, `writeFile`, `fileExists`, `sleep`, `time`, `date`, `jsonEncode`, `jsonDecode`, `env`, `exit`, `uuid`
- Developer tools: `plain check`, `plain fmt`, `plain new`, `plain init`, `plain add`, `plain remove`, `plain install`, `plain update`

---

## Installation

```bash
npm install -g @ayoxx/plain-code
```

---

## Upgrade guide

See `UPGRADE_GUIDE.md` for instructions on upgrading from v0.6 to v1.0.

---

## What's next?

The language is frozen for v1.0. Future improvements will be proposed via RFC and released as v1.1+.
