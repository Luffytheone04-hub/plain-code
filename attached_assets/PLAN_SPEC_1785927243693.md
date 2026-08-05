# Plain Language Specification (v0.1)

Version: 0.1
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

Documentation

note:

This function creates a server.

----------------------------------------

## Variables

Syntax

remember name as "Ayokunle"

remember age as 16

remember isAdmin as true

Multiple variables

remember name, age as (
    "Ayokunle",
    16
)

Variables are immutable.

Reassignment

age becomes 17

----------------------------------------

## Printing

show "Hello"

show age

show `${name}`

----------------------------------------

## Conditions

if age is 18

    show "Adult"

otherwise

    show "Minor"

done

Comparison keywords

is

is greater than

is less than

is greater than or equal to

is less than or equal to

----------------------------------------

## Functions

make greet()

    show "Hello"

done

Returning values

make add(a, b)

    give a + b

done

----------------------------------------

## Arrays

remember fruits as [
    "Apple",
    "Banana"
]

----------------------------------------

## Objects

remember person as

    name is "Kunle"

    age is 16

    country is "Nigeria"

done

----------------------------------------

## Imports

use express

use sqlite

----------------------------------------

## Philosophy

Frameworks should become English.

The programmer should express intent.

The compiler should handle implementation.

----------------------------------------

## Reserved Keywords

remember

becomes

show

make

give

use

if

otherwise

done

is

true

false

note

----------------------------------------

This document is the single source of truth for Plain.

Every compiler implementation must follow this specification.