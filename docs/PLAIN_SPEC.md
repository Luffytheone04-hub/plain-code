# Plain Language Specification (v0.3)

Version: 0.3
Status: Draft
File Extension: .pln

Tagline: "When even a simple sentence can be code."

---

## Mission

Plain is an Intent-Oriented Programming Language (IOPL).

Its goal is to let developers describe WHAT they want while the compiler decides HOW JavaScript should implement it.

Plain is designed to be: beginner-friendly, readable, predictable, consistent, and easy to teach.

Every keyword should be understandable by a 12-year-old.

---

## Core Principles

1. One way to do everything.
2. Readability over fewer characters.
3. Keywords never have aliases.
4. Error messages should teach.
5. JavaScript is an implementation detail.
6. Code should read like documentation.

---

## Comments

    // This is a comment

---

## Variables

Declare:

    remember name as "Ayokunle"
    remember age as 16

Reassign:

    age becomes 17

---

## Printing

    show "Hello"
    show age
    show players[0]
    show user.name

---

## Conditions

    if age is 18
        show "Adult"
    otherwise
        show "Minor"
    done

Comparisons: `is`, `is greater than`, `is less than`

---

## Functions

    make greet()
        show "Hello"
    done

    greet()

    make add(a, b)
        give a + b
    done

    show add(5, 7)

---

## Arrays

    remember players as [
        "Haaland",
        "Foden",
        "Rodri"
    ]

    show players[0]
    players[1] becomes "Palmer"

---

## Objects

    remember user as
        name is "Ayokunle"
        age is 17
        country is "Nigeria"
    done

    show user.name
    user.age becomes 18

---

## Loops

For each:

    for each player in players
        show player
    done

While:

    while age is less than 18
        age becomes age + 1
    done

---

## Standard Library

| Plain           | JavaScript equivalent   |
|-----------------|-------------------------|
| length(x)       | (x).length              |
| uppercase(x)    | (x).toUpperCase()       |
| lowercase(x)    | (x).toLowerCase()       |
| random()        | Math.random()           |
| round(x)        | Math.round(x)           |

---

## Imports / Packages

Supported packages:

    use express    → const express = require('express');
    use sqlite     → const Database = require('better-sqlite3');
    use fs         → const fs = require('fs');
    use path       → const path = require('path');

Unknown packages produce a friendly compiler error.

---

## Express Server (v0.3)

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

### Routes

    when someone visits "<path>"
        ...
    done

Compiles to: `app.get(path, (req, res) => { ... })`

Inside route bodies:

- `request` → `req`
- `response` → `res`

### Sending responses

    reply "Hello"          → res.send("Hello")
    reply user             → res.send(user)

### JSON responses

    reply json
        name is "Plain"
        version is "0.3"
    done

Compiles to: `res.json({ "name": "Plain", "version": "0.3" })`

### Static files

    serve folder "public"

Compiles to: `app.use(express.static("public"))`

### Listening

    listen on 3000
        show "Running"
    done

Compiles to: `app.listen(3000, () => { ... })`

---

## SQLite (v0.3)

    use sqlite

    remember db as sqlite("database.db")

Compiles to: `new Database("database.db")`

---

## Reserved Keywords

    remember  becomes  show
    make      give
    if        otherwise  done
    for       each       in
    while
    use
    when      someone   visits
    listen    on
    reply     json
    serve     folder
    is        greater    less    than
    true      false
    note

---

This document is the single source of truth for Plain.
Every compiler implementation must follow this specification.
