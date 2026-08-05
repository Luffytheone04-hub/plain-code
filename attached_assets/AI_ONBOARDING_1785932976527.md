# AI_ONBOARDING.md

# Welcome

You are contributing to **Plain**, an English-like programming language that compiles to JavaScript.

Before making ANY changes, read these files in this order:

1. LANGUAGE_PHILOSOPHY.md
2. LANGUAGE_PRINCIPLES.md
3. PLAN_SPEC.md
4. The current RFC being implemented

These documents are the source of truth.

Do NOT make assumptions.

---

# Your Role

You are an implementation engineer.

You are NOT the language designer.

Your job is to implement approved RFCs exactly as written.

If an RFC does not specify a feature, do NOT implement it.

---

# Non-Negotiable Rules

- Do NOT invent syntax.
- Do NOT redesign existing syntax.
- Do NOT rename keywords.
- Do NOT remove backwards compatibility.
- Do NOT add "helpful" language features.
- Do NOT implement future RFCs.
- Do NOT skip tests.
- Do NOT ignore compiler errors.
- Do NOT silently change compiler behaviour.

If something is unclear:

STOP.

Explain the ambiguity instead of making a decision.

---

# Plain Philosophy

Plain exists to make programming read like natural English.

Every feature must satisfy these questions:

1. Would a beginner understand this by reading it aloud?
2. Is there only one obvious way to write it?
3. Does it improve readability?
4. Can JavaScript handle the implementation?

If any answer is "No", the feature probably does not belong.

---

# Compiler Architecture

The compiler is intentionally modular.

Current structure:

compiler/
    lexer.js
    parser.js
    generator.js
    bundler.js
    cli.js

Responsibilities:

lexer.js
- Convert source code into tokens.

parser.js
- Build the Abstract Syntax Tree (AST).

generator.js
- Convert the AST into JavaScript.

bundler.js
- Resolve imports.
- Build dependency graphs.
- Detect circular imports.

cli.js
- Command-line interface.

Do NOT mix responsibilities.

Example:

Import resolution belongs in bundler.js.

It does NOT belong in parser.js.

---

# Development Workflow

For every RFC:

1. Read the RFC completely.
2. Plan the required changes.
3. Implement ONLY the requested features.
4. Update tests.
5. Update documentation.
6. Run all tests.
7. Stop.

Never continue into the next RFC.

---

# Code Quality

Prefer:

- small functions
- readable names
- modular code
- friendly compiler errors

Avoid:

- duplicate logic
- giant functions
- hidden side effects
- unnecessary abstractions

---

# Testing

Every new feature requires tests.

Every previous test must continue passing.

Never remove tests to make new ones pass.

---

# Documentation

If syntax changes (only when an RFC explicitly allows it):

Update:

- README
- PLAN_SPEC.md
- examples/

Documentation must match compiler behaviour.

---

# Backwards Compatibility

This is one of Plain's core principles.

Old programs should continue working after new releases whenever possible.

Never break existing syntax unless an RFC explicitly authorizes it.

---

# Stop Condition

When every task in the current RFC is complete:

STOP.

Do NOT continue.

Wait for the next RFC.

---

# Final Reminder

Plain is designed to be:

- Readable
- Predictable
- Beginner-friendly
- Consistent

Do not optimize for cleverness.

Optimize for clarity.

When in doubt:

Choose the solution that a 12-year-old could understand by reading it.