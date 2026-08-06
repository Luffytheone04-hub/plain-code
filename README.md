# Plain

> "When even a simple sentence can be code."

Plain is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

---

## Quick start

```bash
npm install -g @ayoxx/plain-code
plain new myapp
cd myapp
plain install
plain run app.pln
```

---

## CLI

```
plain run    <file.pln>   Compile and execute a Plain program
plain build  <file.pln>   Compile to JavaScript without running
plain check  <file.pln>   Check syntax only (no output, no execution)
plain fmt    <file.pln>   Format a Plain file in-place
plain new    [name]       Create a new Plain project
plain init               Create a plain.json in the current directory
plain install            Install dependencies listed in plain.json
plain add    <package>   Install a package and add it to plain.json
plain remove <package>   Remove a package from plain.json and uninstall it
plain update             Update all installed npm packages
plain version            Print the compiler version
plain help               Print help text
```

---

## Language features

### Variables

```plain
remember name as "Ayokunle"
remember age as 16
age becomes 17
```

### Conditions (v0.6 comparisons)

```plain
if age is at least 18
    show "Adult"
otherwise
    show "Teenager"
done

if name contains "Plain"
    show "Found it"
done

if score between 90 and 100
    show "A grade"
done
```

All comparison operators:

| Plain                   | JavaScript        |
|-------------------------|-------------------|
| `is` / `is equal to`    | `===`             |
| `is not`                | `!==`             |
| `is greater than` / `is above` | `>`      |
| `is less than` / `is below`    | `<`      |
| `is at least`           | `>=`              |
| `is at most`            | `<=`              |
| `is empty`              | `.length === 0`   |
| `is not empty`          | `.length > 0`     |
| `contains "x"`          | `.includes("x")`  |
| `starts with "x"`       | `.startsWith("x")`|
| `ends with "x"`         | `.endsWith("x")`  |
| `between A and B`       | `>= A && <= B`    |

### Functions

```plain
make add(a, b)
    give a + b
done
show add(5, 7)
```

### Arrays & Objects

```plain
remember players as ["Haaland", "Foden", "Rodri"]
show players[0]
players[1] becomes "Palmer"

remember user as
    name is "Ayokunle"
    age is 17
done
show user.name
```

### Loops

```plain
for each player in players
    show player
done

for every item in basket    // alias for "for each"
    show item
done

while age is less than 18
    age becomes age + 1
done
```

### Runtime Standard Library (v0.6)

No imports needed. These functions are built into the compiler:

| Plain                      | Description                          |
|----------------------------|--------------------------------------|
| `print(x)`                 | Print a value (`console.log`)        |
| `readFile("path")`         | Read a file as UTF-8 text            |
| `writeFile("path", data)`  | Write text to a file                 |
| `fileExists("path")`       | Check if a file exists               |
| `sleep(ms)`                | Sleep synchronously                  |
| `time()`                   | Current Unix timestamp (`Date.now()`) |
| `date()`                   | ISO date string                      |
| `jsonEncode(value)`        | `JSON.stringify`                     |
| `jsonDecode(string)`       | `JSON.parse`                         |
| `env("KEY")`               | Read environment variable            |
| `exit(code)`               | Exit the process                     |
| `uuid()`                   | Generate a UUID v4                   |
| `length(x)`                | Length of array/string               |
| `uppercase(x)`             | Convert to uppercase                 |
| `lowercase(x)`             | Convert to lowercase                 |
| `random()`                 | Random number 0–1                    |
| `round(x)`                 | Round to nearest integer             |

---

## Project management (v0.4.2)

Plain can manage its own project configuration without relying on npm for everything.

### plain init

Create a `plain.json` in the current directory:

```bash
plain init
```

Generates:

```json
{
    "name": "my-app",
    "version": "0.1.0",
    "entry": "app.pln"
}
```

If `plain.json` already exists, Plain prints `Project already initialized.` and does nothing.

### plain install

Install all dependencies listed in `plain.json`:

```bash
plain install
```

### plain add

Install a package and record it in `plain.json`:

```bash
plain add express
plain add better-sqlite3
```

### plain remove

Uninstall a package and remove it from `plain.json`:

```bash
plain remove express
```

### plain update

Update all installed npm packages:

```bash
plain update
```

### Dependency validation

Before compiling, Plain checks that every package referenced by `use` is installed.
If a package is missing, you see a friendly error:

```
Package "express" is not installed.
Run: plain add express
```

---

## Web Apps (v0.6)

The `web app` shorthand sets up Express with less boilerplate:

```plain
web app

route "/"
    reply "Hello from Plain!"
done

route "/api/status"
    reply json
        status is "ok"
        version is "0.6"
    done
done

start 3000
```

The classic `use express` / `when someone visits` style still works alongside the new syntax.

---

## SQLite Database (v0.6)

Inline SQL blocks compile directly to `better-sqlite3` calls:

```plain
database "app.db"

execute
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
done

insert
    INSERT INTO users (name) VALUES ('Alice')
done

remember rows as query
    SELECT * FROM users
done
```

| Plain          | Compiles to                     |
|----------------|---------------------------------|
| `database "f"` | `const db = new Database("f")`  |
| `query … done` | `db.prepare(\`…\`).all()`       |
| `insert … done`| `db.prepare(\`…\`).run()`       |
| `update … done`| `db.prepare(\`…\`).run()`       |
| `delete … done`| `db.prepare(\`…\`).run()`       |
| `execute … done`| `db.exec(\`…\`)`               |

---

## Multi-file projects (v0.4.1)

Split your code across multiple `.pln` files using `import`:

```plain
import "./math.pln"
import "./utils.pln"

show PI
show double(5)
```

Rules:
- Paths must be relative (`./` or `../`)
- Files compile in dependency order (deepest dependency first)
- Duplicate imports are de-duplicated automatically
- Circular imports produce a friendly compiler error

---

## Express server (v0.3)

```plain
use express

remember app as express()

serve folder "public"

when someone visits "/"
    reply "Hello from Plain!"
done

when someone visits "/api/status"
    reply json
        status is "ok"
        version is "0.3"
    done
done

listen on 3000
    show "Server running at http://localhost:3000"
done
```

Inside route bodies, `request` maps to `req` and `response` maps to `res`.

---

## SQLite (v0.3)

```plain
use sqlite

remember db as sqlite("database.db")
```

---

## Supported packages

| Plain          | Compiles to                              |
|----------------|------------------------------------------|
| `use express`  | `const express = require('express');`    |
| `use sqlite`   | `const Database = require('better-sqlite3');` |
| `use fs`       | `const fs = require('fs');`              |
| `use path`     | `const path = require('path');`          |

Unknown packages produce a friendly compiler error.

---

## Running the tests

```bash
npm test
```

---

## Project structure

```
Plain/
├── compiler/
│   ├── lexer.js       — tokenises Plain source into tokens
│   ├── parser.js      — builds an AST from tokens
│   ├── generator.js   — generates JavaScript from the AST
│   └── cli.js         — command-line entry point
│
├── examples/
│   ├── hello.pln      — variables and printing
│   ├── day2.pln       — conditions
│   ├── day3.pln       — functions
│   ├── arrays.pln     — arrays and indexing
│   ├── objects.pln    — objects and property access
│   ├── loops.pln      — for each and while loops
│   ├── server.pln     — Express server (v0.3)
│   └── database.pln   — SQLite connection (v0.3)
│
├── tests/
│   └── compiler.test.js
│
├── docs/
│   └── PLAIN_SPEC.md  — language specification (v0.3)
│
├── package.json
└── README.md
```
