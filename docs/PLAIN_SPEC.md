# Plain Language Specification (v0.2)

Version: 0.2
Status: Draft
File Extension: .pln

Tagline

"When even a simple sentence can be code."

Mission

Plain is an Intent-Oriented Programming Language (IOPL).

Its goal is to let developers describe WHAT they want while the compiler decides HOW JavaScript should implement it.

Plain is designed to be:

- Beginner friendly
- Readable
- Predictable
- Consistent
- Easy to teach

Every keyword should be understandable by a 12-year-old.

----------------------------------------

## Core Principles

1. One way to do everything.
2. Readability over fewer characters.
3. Keywords never have aliases.
4. Error messages should teach.
5. JavaScript is an implementation detail.
6. Code should read like documentation.

----------------------------------------

## Comments

Single line

    // This is a comment

----------------------------------------

## Variables

Declare:

    remember name as "Ayokunle"
    remember age as 16

Reassign:

    age becomes 17

----------------------------------------

## Printing

    show "Hello"
    show age
    show players[0]
    show user.name

----------------------------------------

## Conditions

    if age is 18
        show "Adult"
    otherwise
        show "Minor"
    done

Comparison keywords:

    is
    is greater than
    is less than

----------------------------------------

## Functions

    make greet()
        show "Hello"
    done

    greet()

Returning values:

    make add(a, b)
        give a + b
    done

    show add(5, 7)

----------------------------------------

## Arrays

Declare:

    remember players as [
        "Haaland",
        "Foden",
        "Rodri"
    ]

Index:

    show players[0]

Assign by index:

    players[1] becomes "Palmer"

----------------------------------------

## Objects

Declare:

    remember user as
        name is "Ayokunle"
        age is 17
        country is "Nigeria"
    done

Property access:

    show user.name

Property assignment:

    user.age becomes 18

----------------------------------------

## Loops

For each:

    for each player in players
        show player
    done

Generates: for (const player of players) { ... }

While:

    while age is less than 18
        age becomes age + 1
    done

Generates: while (age < 18) { ... }

----------------------------------------

## Standard Library

Built-in functions that compile to JavaScript equivalents:

| Plain              | JavaScript equivalent          |
|--------------------|-------------------------------|
| length(x)          | (x).length                    |
| uppercase(text)    | (text).toUpperCase()          |
| lowercase(text)    | (text).toLowerCase()          |
| random()           | Math.random()                 |
| round(number)      | Math.round(number)            |

Example:

    show length(players)
    show uppercase("hello")
    show round(3.7)

----------------------------------------

## Imports

Syntax (parser support only; runtime not yet available):

    use math
    use sqlite

Compiles to a placeholder comment.

----------------------------------------

## Reserved Keywords

    remember  becomes  show
    make      give
    if        otherwise  done
    for       each       in
    while
    use
    is        greater    less    than
    true      false
    note

----------------------------------------

This document is the single source of truth for Plain.
Every compiler implementation must follow this specification.
