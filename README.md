# Plain

> "When even a simple sentence can be code."

Plain is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

---

## Quick start

```bash
npm install -g @ayoxx/plain-code
plain new myapp
cd myapp
plain install
plain run app.pln
```

---

CLI

```
plain run    <file.pln>   Install missing dependencies, compile and execute
plain build  <file.pln>   Install missing dependencies and compile
plain check  <file.pln>   Check syntax only (no output, no execution)
plain fmt    <file.pln>   Format a Plain file in-place
plain new    [name]       Create a new Plain project
plain init               Create a plain.json in the current directory
plain install            Install dependencies required by the project's source files
plain start              Start the entry file from plain.json
plain doctor             Check the Plain project environment
plain add    <package>   Install a package and add it to plain.json
plain remove <package>   Remove a package from plain.json and uninstall it
plain update             Update all installed npm packages
plain version            Print the compiler version
plain help               Print help text
```

---

Language features

Variables

```plain
remember name as "Ayokunle"
remember age as 16
age becomes 17
```

Conditions (v0.6 comparisons)

```plain
if age is at least 18
    show "Adult"
otherwise
    show "Teenager"
done

if name contains "Plain"
    show "Found it"
done

if score between 90 and 100
    show "A grade"
done
```

All comparison operators:

Plain JavaScript
is / is equal to ===
is not !==
is greater than / is above >
is less than / is below <
is at least >=
is at most <=
is empty .length === 0
is not empty .length > 0
contains "x" .includes("x")
starts with "x" .startsWith("x")
ends with "x" .endsWith("x")
between A and B >= A && <= B
# =>
Functions

```plain
make add(a, b)
    give a + b
done
show add(5, 7)
```

Arrays & Objects

```plain
remember players as ["Haaland", "Foden", "Rodri"]
show players[0]
players[1] becomes "Palmer"

remember user as
    name is "Ayokunle"
    age is 17
done
show user.name
```

Loops

```plain
for each player in players
    show player
done

for every item in basket    // alias for "for each"
    show item
done

while age is less than 18
    age becomes age + 1
done
```

Plain Expressions (v1.1)

Collections, properties, and files read like sentences.

Items

```plain
remember players as ["Haaland", "Foden", "Rodri"]

show first player from players   // players[0]
show last player from players    // players[players.length - 1]
show player two from players     // players[1]
first player from players becomes "Haaland"  // players[0] = "Haaland"
```

Number words from `one` to `twenty` map to one-based positions: `player one` is the first item.

Collections

```plain
show players length              // players.length
add("Palmer" to players)         // players.push("Palmer")
remove("Rodri" from players)     // players.splice(players.indexOf("Rodri"), 1)

if players contains "Foden"      // players.includes("Foden")
    show "Found"
done
```

Properties

```plain
show name of user                // user.name
show city of address of customer // customer.address.city
name of user becomes "Ayo"       // user.name = "Ayo"
```

`of` chains right-to-left: `city of address of customer` reads the city of the address of the customer.

Files

```plain
remember data as read("users.txt")   // fs.readFileSync("users.txt", 'utf8')
write(data to "users.txt")           // fs.writeFileSync(data, "users.txt", 'utf8')
```

The older `readFile()` / `writeFile()` forms still work and are unchanged.

Runtime Standard Library (v0.6)

No imports needed. These functions are built into the compiler:

Plain Description
print(x) Print a value (console.log)
readFile("path") Read a file as UTF-8 text
writeFile("path", data) Write text to a file
read("path") Read a file as UTF-8 text (v1.1)
fileExists("path") Check if a file exists
sleep(ms) Sleep synchronously
time() Current Unix timestamp (Date.now())
date() ISO date string
jsonEncode(value) JSON.stringify
jsonDecode(string) JSON.parse
env("KEY") Read environment variable
exit(code) Exit the process
uuid() Generate a UUID v4
length(x) Length of array/string
uppercase(x) Convert to uppercase
lowercase(x) Convert to lowercase
random() Random number 0–1
round(x) Round to nearest integer

---

Project management (v0.4.2)

Plain can manage its own project configuration without relying on npm for everything.

plain init

Create a plain.json in the current directory:

```bash
plain init
```

Generates:

```json
{
    "name": "my-app",
    "version": "0.1.0",
    "entry": "app.pln"
}
```

If plain.json already exists, Plain prints Project already initialized. and does nothing.

plain install

Install all npm packages required by your project's source files. Plain scans all .pln files, detects use statements, and installs any missing packages.

```bash
plain install
```

If no external dependencies are found, it prints:

```
This project has no external dependencies.
```

If all dependencies are already installed, it prints:

```
All dependencies are already installed.
```

plain add

Install a package and record it in plain.json:

```bash
plain add express
plain add better-sqlite3
```

plain remove

Uninstall a package and remove it from plain.json:

```bash
plain remove express
```

plain update

Update all installed npm packages:

```bash
plain update
```

Automatic runtime dependencies

Plain detects dependencies from `use` statements and shorthand features such as
`web app` and `database`. Built-in Node modules are ignored. `plain run` and
`plain build` install missing npm packages automatically; `plain install` does
the same without compiling or running the project.

```
✓ express already installed
Installing axios...
✓ axios installed
Done.
```

Runtime dependency detection

Plain can inspect a source file and list the npm packages it needs. The
reusable detector scans use statements, maps Plain module names to their npm
packages, detects shorthand runtime features, ignores Node built-ins such as
fs and path, and removes duplicates.

The current mappings include:

Plain module npm package
express express
sqlite better-sqlite3
web app express
axios axios
chalk chalk

`plain start` reads the entry file from `plain.json`, installs missing runtime
packages, compiles, and runs the application. `plain doctor` checks Node, npm,
the Plain compiler, formatter, runtime, project configuration, and dependencies.

---

Web Apps (v0.6)

The web app shorthand sets up Express with less boilerplate:

```plain
web app

route "/"
    reply "Hello from Plain!"
done

route "/api/status"
    reply json
        status is "ok"
        version is "0.6"
    done
done

start 3000
```

The classic use express / when someone visits style still works alongside the new syntax.

---

SQLite Database (v0.6)

Inline SQL blocks compile directly to better-sqlite3 calls:

```plain
database "app.db"

execute
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
done

insert
    INSERT INTO users (name) VALUES ('Alice')
done

remember rows as query
    SELECT * FROM users
done
```

Plain Compiles to
database "f" const db = new Database("f")
query … done db.prepare(\…`).all()`
insert … done db.prepare(\…`).run()`
update … done db.prepare(\…`).run()`
delete … done db.prepare(\…`).run()`
execute … done db.exec(\…`)`

---

Multi-file projects (v0.4.1)

Split your code across multiple .pln files using import:

```plain
import "./math.pln"
import "./utils.pln"

show PI
show double(5)
```

Rules:

· Paths must be relative (./ or ../)
· Files compile in dependency order (deepest dependency first)
· Duplicate imports are de-duplicated automatically
· Circular imports produce a friendly compiler error

---

Express server (v0.3)

```plain
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
```

Inside route bodies, request maps to req and response maps to res.

---

SQLite (v0.3)

```plain
use sqlite

remember db as sqlite("database.db")
```

---

Supported packages

Plain Compiles to
use express const express = require('express');
use sqlite const Database = require('better-sqlite3');
use fs const fs = require('fs');
use path const path = require('path');

Unknown packages produce a friendly compiler error.

---

Running the tests

```bash
npm test
```

---

Project structure

```
Plain/
├── compiler/
│   ├── lexer.js       — tokenises Plain source into tokens
│   ├── parser.js      — builds an AST from tokens
│   ├── generator.js   — generates JavaScript from the AST
│   └── cli.js         — command-line entry point
│
├── examples/
│   ├── hello.pln      — variables and printing
│   ├── day2.pln       — conditions
│   ├── day3.pln       — functions
│   ├── arrays.pln     — arrays and indexing
│   ├── objects.pln    — objects and property access
│   ├── loops.pln      — for each and while loops
│   ├── server.pln     — Express server (v0.3)
│   ├── database.pln   — SQLite connection (v0.3)
│   ├── expressions.pln— Plain Expressions (v1.1)
│   └── stdlib.pln     — runtime stdlib usage
│
├── tests/
│   └── compiler.test.js
│
├── docs/
│   └── PLAIN_SPEC.md  — language specification (v0.3)
│
├── package.json
└── README.md
```