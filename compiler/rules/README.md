# Plain Rule System

Rules define what valid Plain constructs mean for capabilities that are not yet
hard-coded into the deterministic compiler (lexer/parser/generator).

They are the **language design** of Plain 2.0.0: version-controlled, reviewable,
testable, and shipped inside the published package.

## How it works

1. The deterministic compiler tries to compile the Plain source first.
2. If a construct is not supported deterministically, the **rule resolver**
   (`compiler/ai/resolver.js`) searches the rule files for a match.
3. If a rule matches, the **AI translator** (`compiler/ai/translator.js`)
   compiles the Plain construct to JavaScript following that rule.
4. The generated JavaScript is **validated** (`compiler/ai/validator.js`),
   flows through the normal bundler/runtime path, and dependencies are
   installed by the existing dependency system.
5. If no rule matches, or validation fails, compilation fails cleanly with a
   clear, layer-specific diagnostic.

## Rule precedence

1. exact syntax rule
2. domain-specific rule
3. generic library rule
4. generic JavaScript interoperability rule
5. JavaScript Gateway

A broad generic rule must never override an exact Plain language rule.

## Rule file layout

Each rule is a pair of files in the same directory:

- `capability.md` — the human-readable rule (what Plain syntax means, what
  JavaScript it maps to, examples, security notes).
- `capability.json` — machine-readable metadata used by the rule resolver and
  the cache (name, category, version, keywords, triggers, dependencies).

## Rule file requirements

Every rule must describe (RFC-0020 §7):

1. capability name
2. purpose
3. supported Plain syntax
4. semantic meaning
5. JavaScript target
6. required npm dependencies
7. imports/runtime requirements
8. async behavior
9. examples
10. invalid forms
11. security considerations
12. expected compiler output
13. tests

## Metadata contract

```json
{
  "name": "telegram",
  "category": "bots",
  "version": 1,
  "keywords": ["telegram", "bot"],
  "triggers": [
    { "type": "regex", "pattern": "telegram bot with token" }
  ],
  "dependencies": ["node-telegram-bot-api"],
  "async": true,
  "compilerMin": "2.0.0"
}
```

- `version` participates in the AI cache key. Bump it whenever the rule's
  semantics change so stale cached translations are not reused.
- `triggers` are matched against normalized Plain source by the resolver. A rule
  may also be selected by a resolvable path like `bots/telegram`.
- `dependencies` are merged into the existing dependency detector output
  (`compiler/dependency-detector.js`); there is no separate dependency system.

## Adding a new rule

1. Create `compiler/rules/<category>/<capability>.md`.
2. Create `compiler/rules/<category>/<capability>.json`.
3. Add examples to the markdown and mirror at least one in `tests/ai.test.js`.
4. Run the test suite: `npm test`.

## Testing

`tests/ai.test.js` exercises the resolver, validator, cache, and translator with
a mocked provider so the rule system is testable offline.
