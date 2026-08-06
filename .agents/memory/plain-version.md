---
name: Plain current version
description: Where the version string lives and which tests assert it
---

## Current version: 0.6.0

Files that must all be bumped together:
- `package.json` — `"version": "0.6.0"`
- `compiler/cli.js` — `const VERSION = '0.6.0'`
- `plain-vscode/package.json` — `"version": "0.6.0"`

Tests that assert the version:
- "plain version shows 0.6.0" (two occurrences in tests/compiler.test.js, updated with replace_all)
- "plain help mentions v0.6 features" checks for the string "0.6" in help output

**Why:** Version is in three places. Missing one causes test failures or stale extension metadata.
