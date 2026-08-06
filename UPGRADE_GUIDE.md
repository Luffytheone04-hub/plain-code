# Upgrade Guide — v0.6 → v1.0.0

## Overview

Plain v1.0.0 is a stabilisation release. It contains no breaking changes.

All programs written for Plain v0.6 will continue to work without modification.

---

## Step 1 — Update the compiler

```bash
npm install -g @ayoxx/plain-code
```

Verify the version:

```bash
plain version
# Plain v1.0.0
```

---

## Step 2 — Update your plain.json (optional)

If you track the Plain version in `plain.json`:

```json
{
    "name": "my-app",
    "version": "0.1.0",
    "entry": "app.pln"
}
```

No changes are required. This file tracks your application version, not the compiler version.

---

## Step 3 — Update the VS Code extension (optional)

If you use the Plain VS Code extension, update to v1.0.0 for consistency.
The grammar is unchanged.

---

## Breaking changes

None. Every program that compiled under v0.6 will compile identically under v1.0.0.

---

## What changed in the CLI

The output of `plain run` changed slightly:

| v0.6                     | v1.0.0                |
|--------------------------|-----------------------|
| `Compilation successful.`| `Done.`               |

This is a cosmetic change only. Exit codes are unchanged.

---

## Questions?

See `RELEASE_NOTES.md` or the language specification in `docs/PLAIN_SPEC.md`.
