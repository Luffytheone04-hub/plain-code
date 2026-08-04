# Plain

> "When even a simple sentence can be code."

Plain is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

---

## Quick start

```bash
node compiler/cli.js run examples/hello.pln
```

Or after `npm install -g .`:

```bash
plain run examples/hello.pln
```

---

## CLI

```
plain run   <file.pln>   Compile and execute a Plain program
plain build <file.pln>   Compile to JavaScript without running
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

### Printing

```plain
show "Hello"
show age
```

### Conditions

```plain
if age is greater than 12
    show "Teenager"
otherwise
    show "Child"
done
```

Comparisons: `is`, `is greater than`, `is less than`

### Functions

```plain
make add(a, b)
    give a + b
done

show add(5, 7)
```

### Arrays

```plain
remember players as [
    "Haaland",
    "Foden",
    "Rodri"
]

show players[0]
players[1] becomes "Palmer"
show length(players)
```

### Objects

```plain
remember user as
    name is "Ayokunle"
    age is 17
    country is "Nigeria"
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

| Plain           | Does                      |
|-----------------|---------------------------|
| `length(x)`     | Length of array or string |
| `uppercase(x)`  | Convert to uppercase      |
| `lowercase(x)`  | Convert to lowercase      |
| `random()`      | Random number 0–1         |
| `round(x)`      | Round to nearest integer  |

### Imports (parser only)

```plain
use math
use sqlite
```

---

## Running the tests

```bash
npm test
# or
node tests/compiler.test.js
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
│   └── loops.pln      — for each and while loops
│
├── tests/
│   └── compiler.test.js
│
├── docs/
│   └── PLAIN_SPEC.md  — language specification (v0.2)
│
├── package.json
└── README.md
```

---

## npm

This package is prepared for npm publishing (not yet published).

```bash
npm install        # install locally
npm install -g .   # install globally as "plain"
```

After global install, use `plain run file.pln` from anywhere.
