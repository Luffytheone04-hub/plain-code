# Plain

> "When even a simple sentence can be code."

Plain is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

---

## Quick start

```bash
npm install -g @ayoxx/plain-code
plain new myapp
cd myapp && npm install
plain run app.pln
```

---

## CLI

```
plain run   <file.pln>   Compile and execute a Plain program
plain build <file.pln>   Compile to JavaScript without running
plain new   [name]       Scaffold a new Plain project
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

### Conditions

```plain
if age is greater than 12
    show "Teenager"
otherwise
    show "Child"
done
```

### Functions

```plain
make add(a, b)
    give a + b
done
show add(5, 7)
```

### Arrays

```plain
remember players as ["Haaland", "Foden", "Rodri"]
show players[0]
players[1] becomes "Palmer"
```

### Objects

```plain
remember user as
    name is "Ayokunle"
    age is 17
done
show user.name
user.age becomes 18
```

### Loops

```plain
for each player in players
    show player
done

while age is less than 18
    age becomes age + 1
done
```

### Standard library

| Plain           | Does                     |
|-----------------|--------------------------|
| `length(x)`     | Length of array/string   |
| `uppercase(x)`  | Convert to uppercase     |
| `lowercase(x)`  | Convert to lowercase     |
| `random()`      | Random number 0–1        |
| `round(x)`      | Round to nearest integer |

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
