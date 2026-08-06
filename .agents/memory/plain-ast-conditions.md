---
name: Plain AST condition shape
description: How if/while conditions are represented in the Plain AST after the v0.6 refactor
---

## Rule
`IfStatement` and `WhileStatement` hold a single `condition` field, not `{ left, operator, right }`.

## Condition types
- `BinaryCondition`   — `{ type, left, op, right }` for `===`, `!==`, `>`, `<`, `>=`, `<=`
- `UnaryCondition`    — `{ type, left, op }` for `isEmpty`, `isNotEmpty`
- `BetweenCondition`  — `{ type, left, low, high }` for `between X and Y`
- `StringCondition`   — `{ type, left, method, right }` for `includes`, `startsWith`, `endsWith`

**Why:** the original flat shape couldn't represent multi-part comparisons (between, contains, starts with). The new shape is closed — adding new comparison kinds does not touch if/while parsing.

**How to apply:** `generateCondition(cond)` dispatches on `cond.type`. Generator never accesses `node.left` / `node.operator` directly on an IfStatement.
