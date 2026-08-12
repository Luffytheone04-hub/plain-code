# RFC-0020: Plain 2.0.0 — AI-Assisted Intent-Oriented Compilation

- **Status:** Proposed
- **Target release:** `2.0.0`
- **Project:** `@ayoxx/plain-code`
- **Github repo:** `github.com/ayoistooslick/plain-code`
- **Implementation target:** OpenCode
- **Scope:** compiler, AI translation layer, rule system, runtime/deployment support, documentation, tests

## 1. Summary

Plain is evolving from a readable JavaScript-like language into a practical Intent-Oriented Programming Language (IOPL).

Plain 2.0.0 introduces an **AI-assisted compilation layer** without replacing the existing deterministic compiler.

The core idea:

> Plain's language rules remain authoritative. The existing compiler remains the deterministic execution path whenever it understands the syntax. An AI compiler layer handles supported Plain constructs that are not yet represented by the deterministic compiler by consulting versioned rule files and translating the Plain program into JavaScript.

This lets Plain grow its vocabulary and domain support without requiring every new capability to immediately become hundreds or thousands of lines of lexer/parser/generator code.

The JavaScript Gateway remains available as an explicit escape hatch for advanced scripts that Plain does not yet support directly. It must not become the default solution for ordinary missing syntax.

## 2. Motivation

Plain already supports readable constructs, web applications, SQLite, expressions, imports, standard-library operations, JavaScript Gateway blocks, and npm runtime dependencies.

Real-world programming quickly introduces additional common domains:

- HTTP requests
- REST APIs
- Telegram bots
- Discord bots
- authentication
- JSON APIs
- databases
- middleware
- scheduled jobs
- common Node.js libraries
- API clients
- file uploads
- WebSockets
- queues
- caching
- common application patterns

Plain 2.0.0 should make these capabilities expressible in Plain without turning the core compiler into an enormous collection of one-off integrations.

## 3. Goals

### 3.1 Keep Plain as the language

AI must translate **Plain**, not invent a new language.

The user writes Plain syntax.

The rules directory defines what valid Plain constructs mean.

The AI produces JavaScript as an intermediate compilation result.

### 3.2 Preserve the existing compiler

The existing lexer, parser, generator, bundler, formatter, dependency detector, diagnostics, and CLI remain important.

The AI layer supplements them. It does not replace them.

### 3.3 Make common programming tasks feel native

Users should be able to write readable Plain for common tasks instead of immediately falling back to:

```plain
remember result as javascript
  ...
done
```

The JavaScript Gateway remains useful for genuinely advanced or unsupported JavaScript.

### 3.4 Make rules persistent and version-controlled

Rules live inside the published Plain package/repository.

Rules must be ordinary project files that can be reviewed, edited, versioned, tested, and shipped.

### 3.5 Use AI only where useful

The AI layer should not make an API call for every line.

Deterministic compiler support remains the preferred path.

AI should be invoked when:

1. Plain syntax is valid under the language/rules model.
2. The deterministic compiler does not understand the construct.
3. A matching rule exists.
4. Translation is necessary.

### 3.6 Keep the JavaScript Gateway

The JavaScript Gateway remains an explicit escape hatch for:

- complex JavaScript libraries
- unusual Node.js APIs
- advanced async control
- experimental integrations
- code that should remain directly controlled by the developer

It must not be presented as the normal answer whenever a common Plain syntax is missing.

## 4. Non-goals

Plain 2.0.0 must not become:

- a generic natural-language-to-code chatbot
- an unrestricted code generator
- a system that silently changes Plain semantics
- a system that sends entire projects to an AI provider unnecessarily
- a compiler that depends on AI for basic existing syntax
- an excuse to remove deterministic compiler tests
- a system that executes AI-generated code without validation

## 5. Architecture

```text
                 app.pln
                    |
                    v
          Existing Plain Lexer/Parser
                    |
          deterministic support?
               /                       yes           no
              |             |
              v             v
        Existing        Rule resolver
        compiler             |
                             v
                       AI translation
                             |
                             v
                     validated JS/IR
                             |
                             v
                   Existing generator/
                      bundler/runtime
                             |
                             v
                       executable JS
```

The AI layer is a **compiler extension**, not a replacement compiler.

## 6. Rule System

Create a compiler rule directory, for example:

```text
compiler/
  ai/
    agent.js
    client.js
    prompt.js
    resolver.js
    validator.js
    cache.js
    translator.js
    index.js
  rules/
    README.md
    core/
    web/
    http/
    databases/
    bots/
    auth/
    files/
    async/
    npm/
```

Rules should be grouped by capability.

Example:

```text
compiler/rules/
  http/
    fetch.md
    requests.md
    responses.md

  bots/
    telegram.md
    discord.md

  web/
    rest-api.md
    middleware.md
    routing.md
```

The exact directory layout may be adjusted during implementation, but the rule system must remain discoverable and version-controlled.

## 7. Rule File Requirements

Each rule must describe:

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

Conceptual example:

```md
# Telegram Bot

## Capability

Telegram bot creation and message handling using `node-telegram-bot-api`.

## Plain syntax

remember bot as telegram bot with token

when someone sends "/start"
  reply "Hello from Plain!"
done

## JavaScript target

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(token, { polling: true });

bot.onText(/^\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hello from Plain!");
});

## Dependency

node-telegram-bot-api
```

The exact syntax must be validated against the Plain language design and tested before being considered supported.

## 8. Rule Resolution

The compiler should identify a missing construct and search rules before invoking the model.

Conceptually:

```js
const rule = resolveRule(sourceNode, rules);

if (rule) {
  return aiTranslate(sourceNode, rule);
}

throw unsupportedPlainSyntaxError();
```

Rules should have metadata that makes matching deterministic where possible.

A rule should not rely solely on the AI guessing which file is relevant.

## 9. AI Provider

Plain 2.0.0 initially targets **Agent Router with Claude Opus** as the primary provider.

Provider configuration must never be committed to the public repository.

Use environment variables such as:

```text
PLAIN_AI_API_KEY=...
PLAIN_AI_BASE_URL=https://agentrouter.org
PLAIN_AI_MODEL=claude-opus-4-6
```

The implementation must not contain a hardcoded secret.

The repository should contain only an example configuration.

## 10. Provider Abstraction

Do not hard-code the compiler around one provider.

Implement a provider interface such as:

```js
translate({
  source,
  rule,
  context,
  project
})
```

The first implementation is Agent Router + Claude Opus.

Future providers may include Groq or other compatible endpoints.

The model must be configurable.

## 11. AI Prompt Contract

The AI must receive:

- the relevant Plain source
- the matching rule
- relevant existing compiler semantics
- available Plain variables/functions where required
- dependency information
- project context only when necessary
- strict output requirements

The model must be instructed:

> You are compiling Plain code. You are not designing a new language. Follow the supplied Plain rule exactly. Do not invent syntax or semantics. Produce only the requested JavaScript representation.

The AI must not arbitrarily rewrite unrelated user code.

## 12. Output Contract

The AI should preferably return a structured representation rather than prose.

Example:

```json
{
  "dependencies": ["node-telegram-bot-api"],
  "imports": [],
  "javascript": "...",
  "async": false
}
```

A stronger implementation may use an internal representation:

```json
{
  "type": "GeneratedJavaScript",
  "code": "...",
  "dependencies": [],
  "async": false
}
```

Malformed AI output must fail compilation cleanly.

## 13. Validation

AI-generated JavaScript must not be trusted blindly.

At minimum:

1. validate provider response structure
2. validate required fields
3. validate generated JavaScript syntax
4. detect unsupported/forbidden output patterns
5. resolve generated npm dependencies
6. pass generated code through the normal bundling/runtime path
7. surface useful source-line diagnostics

Where practical, use an AST parser instead of regex-only validation.

## 14. Deterministic First

Existing deterministic syntax must remain deterministic.

For example:

```plain
remember name as "Ayo"
show name
```

must continue through the normal lexer/parser/generator path.

The AI must not be called merely because AI support exists.

This matters for:

- performance
- cost
- reliability
- offline development
- predictable compiler behavior

## 15. AI Cache

Implement a local cache for successful translations where practical.

Cache keys should include enough information to prevent stale semantics, such as:

```text
rule version
Plain compiler version
model
normalized source
relevant configuration
```

A cached translation from an older rule version must not silently survive a rule change.

## 16. Security

The AI compiler must treat Plain source as potentially untrusted.

Do not send secrets to the model.

Do not include:

- environment values
- bot tokens
- API keys
- passwords
- private files
- unrelated project files

unless explicitly required and safe.

For example:

```plain
remember token as env("BOT_TOKEN")
```

may tell the AI that `token` is a runtime environment variable, but the actual token value must never be included in the prompt.

## 17. Network Failure

AI compilation requires network access only when AI translation is needed.

If the AI service is unavailable:

- deterministic Plain programs should still compile
- cached translations may still work
- unsupported AI-dependent syntax should produce a clear error
- the compiler must not silently substitute JavaScript Gateway code

Example:

```text
Plain AI compilation failed.

The syntax requires the "telegram-bot" rule, but the configured AI provider
could not be reached.

Try again or use the JavaScript Gateway for this advanced integration.
```

## 18. CLI

Plain must support:

```bash
plain run app.pln
```

The package must expose the `plain` command directly.

For backward compatibility, `plain-code` may remain available.

Recommended `package.json` bin configuration:

```json
{
  "plain": "./compiler/cli.js",
  "plain-code": "./compiler/cli.js"
}
```

## 19. CLI Commands

Preserve existing commands:

```bash
plain new
plain init
plain check app.pln
plain fmt app.pln
plain build
plain run app.pln
plain start
plain install
plain add <package>
plain remove <package>
plain update
plain version
plain help
```

Optional diagnostic commands may include:

```bash
plain ai status
plain ai rules
plain ai cache
```

## 20. Runtime Dependencies

The existing runtime dependency detector must understand AI-generated dependencies.

For example, a Telegram rule may produce:

```text
node-telegram-bot-api
```

The normal dependency system must handle installation and runtime resolution.

Do not create a separate dependency mechanism for AI-generated code.

## 21. Common Capability Rules

OpenCode should implement rules for common programming capabilities, not only Telegram.

At minimum, investigate and cover:

### HTTP

- fetch
- GET
- POST
- PUT
- PATCH
- DELETE
- headers
- JSON bodies
- JSON responses
- status checks
- query parameters
- error handling

### REST APIs

- routes
- request data
- response data
- JSON responses
- path parameters
- query parameters
- middleware

### Web

- Express
- routing
- middleware
- static files
- JSON APIs
- request/response helpers

### Databases

- SQLite
- PostgreSQL
- MySQL-compatible databases
- MongoDB
- common CRUD operations

### Bots

- Telegram
- Discord
- other major Node.js bot libraries where practical

Telegram support must specifically cover:

- bot creation
- polling
- commands
- messages
- replies
- sendMessage
- buttons
- inline keyboards
- callback queries
- basic error handling

### Files

- read
- write
- append
- existence checks
- JSON files
- directories

### Async

- await
- promises
- delays
- concurrent operations
- error handling

### Authentication

- password hashing
- JWT
- sessions
- common auth middleware

Security-sensitive rules must document safe behavior.

## 22. Plain Syntax Philosophy

Plain syntax should remain:

- readable
- predictable
- composable
- English-like
- explicit enough to compile reliably

Do not force users to write JavaScript simply because the underlying library is JavaScript.

For example, the HTTP rule should aim toward something like:

```plain
remember response as await fetch "https://facts.com"

if response is ok
  remember data as response.json()
  show data
otherwise
  show "api failed"
done
```

The exact syntax must be validated against the language grammar and rule system before adoption.

## 23. JavaScript Gateway Policy

The JavaScript Gateway remains supported for:

- advanced JavaScript
- unsupported niche libraries
- experimental code
- low-level Node.js APIs
- intentionally direct JavaScript

Do not use it as the automatic answer for every missing common feature.

If a common capability deserves Plain syntax, create a rule.

## 24. Generated Code

AI-generated JavaScript must ultimately flow through the existing generator/bundler architecture where practical.

Avoid creating a second completely independent compiler pipeline.

Generated code must remain compatible with:

- dependency detection
- multi-file imports
- runtime dependency installation
- project-local module resolution
- async runtime wrapping
- build output
- `plain run`
- `plain start`

## 25. Testing

Existing tests must continue passing.

Add tests for:

### Rule discovery

- matching rule found
- no matching rule
- multiple candidate rules
- invalid rule metadata

### AI provider

- successful response
- malformed response
- network failure
- authentication failure
- timeout
- provider error

### Translation

- valid generated JavaScript
- invalid generated JavaScript
- dependency extraction
- async detection
- variable mapping

### Security

- secrets are not included in prompts
- unrelated project files are not sent
- generated code validation rejects forbidden output where applicable

### Cache

- cache hit
- cache miss
- invalidation after rule changes
- invalidation after compiler/model changes

### CLI

- `plain run`
- `plain start`
- `plain version`
- AI diagnostics
- project-local dependency resolution

### Capability rules

Every shipped rule must have:

1. at least one positive example
2. at least one negative example
3. expected JavaScript behavior
4. runtime test where practical

## 26. Golden Tests

For important rules, add deterministic golden tests.

Example:

```text
input:
  Plain source

rule:
  telegram.md

expected:
  normalized JavaScript representation
```

The test must not require a live AI provider.

The AI layer can be mocked.

This prevents model changes from silently changing compiler behavior.

## 27. Offline Development

The compiler remains usable offline for deterministic Plain syntax.

AI-dependent syntax must clearly report when network access is required.

Do not make the entire compiler unusable because the AI provider is unavailable.

## 28. Deployment Architecture

The AI API key belongs on a trusted server-side environment, not inside:

- the Git repository
- the npm package
- Plain source
- generated JavaScript
- client applications

A hosted AI compilation service may be deployed separately.

Conceptually:

```text
User
 |
 v
plain CLI
 |
 +-- deterministic compiler
 |
 +-- rule-backed unsupported syntax
          |
          v
    Plain AI service
          |
          +-- rules
          +-- compiler context
          |
          v
       Agent Router
          |
          v
      Claude Opus
          |
          v
  validated JavaScript
```

The repository may contain the service implementation, while the secret is configured only in the deployment environment.

## 29. AI Service API

If a remote service is implemented, define a small API such as:

```http
POST /compile
```

Request:

```json
{
  "source": "...",
  "rule": "telegram",
  "compilerVersion": "2.0.0",
  "ruleVersion": "1"
}
```

Response:

```json
{
  "ok": true,
  "javascript": "...",
  "dependencies": ["node-telegram-bot-api"],
  "async": false
}
```

Never return provider credentials.

Never expose the Agent Router key to the CLI client.

## 30. Persistence

The rule directory must be part of the deployed service and npm package where appropriate.

Do not rely on ephemeral runtime storage for canonical rules.

Rules are source code. They belong in Git.

## 31. Versioning

Plain 2.0.0 must update all relevant version references.

Inspect and update, as appropriate:

- `package.json`
- CLI version constant
- README
- documentation
- website
- examples
- release notes
- changelog
- version badges
- generated metadata
- tests expecting the previous version

Search the repository for:

```text
1.1.1-beta
1.1.1
```

Determine whether each occurrence should become `2.0.0`.

Do not blindly rewrite historical changelog entries.

## 32. Documentation

Update documentation to explain:

1. Plain 2.0.0
2. AI-assisted compilation
3. rule system
4. deterministic compiler
5. JavaScript Gateway
6. common capability syntax
7. Telegram example
8. HTTP example
9. REST API example
10. AI configuration
11. privacy/security
12. network requirements
13. `plain run`
14. troubleshooting
15. how developers can contribute rules

Make it clear that AI assistance is part of the compiler architecture, not a generic chatbot.

## 33. README Examples

Include the intended direction, but only document syntax that is actually implemented and tested.

Telegram example:

```plain
remember token as env("BOT_TOKEN")

remember bot as telegram bot with token

when someone sends "/start"
  reply "Hello from Plain!"
done
```

HTTP example:

```plain
remember response as await fetch "https://facts.com"

if response is ok
  remember data as response.json()
  show data
otherwise
  show "api failed"
done
```

## 34. Rule Authoring

Document how contributors create a new rule.

A contributor should be able to:

1. create a rule file
2. define Plain syntax
3. define semantics
4. define JavaScript output
5. define dependencies
6. add examples
7. add tests
8. run the compiler test suite
9. submit the rule

Adding a common capability should be substantially cheaper than modifying the core lexer/parser/generator.

## 35. Agent Context Selection

Do not dump the entire repository into every AI request.

Build a context selector that provides only:

- relevant rule files
- relevant language specification
- relevant compiler semantics
- relevant source statements
- relevant declarations
- relevant dependency information

## 36. Rule Precedence

Recommended precedence:

1. exact syntax rule
2. domain-specific rule
3. generic library rule
4. generic JavaScript interoperability rule
5. JavaScript Gateway

A broad generic rule must not override an exact Plain language rule.

## 37. Deterministic Rule Metadata

Where practical, rule files should include machine-readable metadata.

Example:

```yaml
name: telegram
category: bots
version: 1
keywords:
  - telegram
  - bot
  - message
  - command
dependencies:
  - node-telegram-bot-api
```

The rest can remain human-readable Markdown.

## 38. Compiler Boundaries

Keep responsibilities separated:

### Lexer/parser
Understands stable core Plain syntax.

### Existing generator
Compiles deterministic Plain constructs.

### Rule resolver
Identifies supported advanced capabilities.

### AI translator
Maps a supported rule-backed Plain construct to JavaScript.

### Validator
Checks AI output.

### Bundler
Resolves dependencies and produces executable output.

### CLI
Coordinates everything.

Do not put AI-provider logic into the lexer.

Do not put network calls into the parser.

## 39. Failure Diagnostics

Errors should identify the layer that failed.

Examples:

```text
Plain syntax error
```

```text
Plain rule error
```

```text
AI compilation error
```

```text
Generated JavaScript validation error
```

```text
Runtime dependency error
```

## 40. Determinism and Reproducibility

Because AI output can vary, record enough metadata to reproduce a translation where practical:

- model
- provider
- rule version
- compiler version
- rule identifier
- cache key

Do not claim AI compilation is deterministic unless the implementation actually guarantees it.

## 41. Cost Control

Minimize AI requests using:

- deterministic compilation first
- rule matching before AI
- caching
- focused prompts
- small source windows
- rule-specific context

Never send an entire project to the model if the translation only needs one construct.

## 42. OpenCode Implementation Requirement

OpenCode must implement this RFC inside the existing repository.

It must inspect the existing architecture before changing it.

Do not rewrite the compiler from scratch.

Do not remove existing functionality merely to implement the AI layer.

Do not invent APIs that conflict with existing modules without first adapting to the current codebase.

## 43. Termux Constraint

**Critical development constraint:**

> OpenCode must not assume that it can execute shell commands in the user's Termux environment.

Therefore, OpenCode must not depend on:

```bash
npm test
npm install
git
node
plain
```

being executable during its own implementation session.

Instead:

- inspect files directly
- modify source files
- create tests
- create documentation
- provide implementation artifacts
- reason from the existing test structure
- do not claim tests were executed unless execution actually occurred

The user can run commands manually afterward in Termux.

## 44. Implementation Safety

OpenCode must not:

- expose API keys
- write secrets into source files
- commit `.env`
- modify `.gitignore` to permit secrets
- hardcode Agent Router credentials
- send Telegram tokens to the AI service
- silently transmit arbitrary project files

Add or update `.gitignore` as necessary for local secrets and caches.

## 45. Environment Configuration

Provide an example file such as:

```text
.env.example
```

containing:

```text
PLAIN_AI_API_KEY=
PLAIN_AI_BASE_URL=https://agentrouter.org
PLAIN_AI_MODEL=claude-opus-4-6
```

The real `.env` must never be committed.

## 46. Acceptance Criteria

Plain 2.0.0 is complete only when:

- existing regression tests remain intact
- deterministic Plain syntax still works
- `plain run app.pln` works
- `plain start` works
- `plain` is exposed as a CLI executable
- rule files exist
- rule resolution works
- AI provider configuration is environment-based
- Agent Router + Claude Opus is supported
- provider abstraction exists
- AI output is validated
- runtime dependencies are integrated
- AI failures are clearly reported
- secrets are protected
- caching works or is explicitly deferred with a documented reason
- Telegram rule exists and is tested
- HTTP/fetch rule exists and is tested
- REST API rule exists and is tested
- documentation is updated
- version references are updated to `2.0.0`
- package metadata is updated
- release notes/changelog are updated
- historical release information is not incorrectly rewritten
- JavaScript Gateway still works
- existing compiler architecture remains functional

## 47. Final Principle

Plain 2.0.0 should not be:

> "JavaScript with an AI wrapper."

It should be:

> **An Intent-Oriented Programming Language with a deterministic compiler, a growing rule system, and an AI-assisted translation layer for capabilities that have not yet been hard-coded into the compiler.**

The deterministic compiler provides stability.

The rule system provides language design.

The AI layer provides extensibility.

The JavaScript Gateway provides an explicit escape hatch.

Together, these allow Plain to grow toward a genuinely useful IOPL without turning every new capability into another mountain of compiler code.
