---
name: Plain lexer SQL raw-collection mode
description: How the lexer handles inline SQL blocks to avoid SQL characters breaking tokenization
---

## Rule
When `query`, `insert`, `update`, `delete`, or `execute` appear on a line by themselves, the lexer switches to raw-collection mode: it gathers subsequent lines verbatim until `done` appears alone on a line. It emits `QUERY_KW` (or the relevant keyword token) + `SQL_BODY` (raw SQL string) + `DONE`.

**Why:** SQL contains `*`, `=`, `!`, `(`, `)` and other chars the Plain tokenizer would reject or misparse. Handling this at the lexer level means the parser and generator never see raw SQL chars.

**How to apply:** The SQL body is stored as `token.value` on the `SQL_BODY` token. Generator wraps it in a template literal for the `db.prepare(...)` or `db.exec(...)` call.
