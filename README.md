# Plain

> "When even a simple sentence can be code."

Plain is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

---

## Quick start

```bash
node compiler/cli.js examples/hello.pln
```

---

## Examples

### Variables and printing (`examples/hello.pln`)

```plain
remember name as "Ayokunle"

show name
```

### Conditions (`examples/day2.pln`)

```plain
remember age as 16

if age is greater than 12
    show "Teenager"
otherwise
    show "Child"
done
```

### Functions (`examples/day3.pln`)

```plain
make greet()
    show "Hello"
done

greet()

make add(a, b)
    give a + b
done

show add(5, 7)
```

---

## Running the tests

```bash
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
│   └── day3.pln       — functions
│
├── tests/
│   └── compiler.test.js
│
├── docs/
│   └── PLAIN_SPEC.md  — language specification
│
└── README.md
```

---

## Language reference

See [`docs/PLAIN_SPEC.md`](docs/PLAIN_SPEC.md) for the full specification.
