# REST API

## Capability

Building REST API servers with Express: routes, request data, response data,
JSON responses, path parameters, query parameters, and middleware.

## Purpose

Let users write a REST API server in readable Plain without a JavaScript
Gateway block. The generated JavaScript uses the `express` package, which the
existing dependency detector already maps in `PACKAGE_MAP`.

## Supported Plain syntax

### 1. Create the server

```plain
remember app as express app
```

### 2. Routes

```plain
app get "/health" as
  reply "ok"
done

app post "/users" as
  remember body as request.json
  reply body
done

app get "/users/:id" as
  remember id as request.param("id")
  reply { "id": id }
done

app get "/users" as
  remember q as request.query("name")
  reply { "query": q }
done
```

### 3. JSON responses

```plain
app get "/status" as
  reply { "status": "running", "version": 2 }
done
```

`reply` inside a route sends a JSON response when the value is an object or a
string body otherwise.

### 4. Middleware

```plain
app use as
  show "request: " + request.method
done
```

### 5. Start the server

```plain
listen app on port 3000
```

## Semantic meaning

- `remember app as express app` creates an Express application.
- `app <verb> "<path>" as ... done` registers a route for the given HTTP verb.
- `request` inside a route is the Express request: `request.json`,
  `request.param("id")`, `request.query("name")`, `request.method`.
- `reply <value>` inside a route sends the response (`res.json(...)` for
  objects/arrays, `res.send(...)` for strings).
- `app use as ... done` registers middleware.
- `listen app on port 3000` starts the server on the given port.

## JavaScript target

The translator must follow this shape:

```js
const express = require("express");
const app = express();

app.get("/health", (req, res) => {
  res.send("ok");
});

app.post("/users", async (req, res) => {
  const body = req.body;
  res.json(body);
});

app.use((req, res, next) => {
  console.log("request: " + req.method);
  next();
});

app.listen(3000);
```

When a route body uses `request.json` or `await`-requiring helpers, the handler
must be an `async` function. Express `app` must be created before any route.

## Dependency

- `express`

## Imports / runtime requirements

- No project imports required by the rule itself.
- `express` must be installed by the normal dependency system (`plain install`
  / `plain run`). `PACKAGE_MAP` already maps `express`.

## Async behavior

Async-capable. Routes that read `request.json` or perform awaited work must be
async handlers; `app.listen` is synchronous setup.

## Examples

```plain
remember app as express app

app get "/health" as
  reply "ok"
done

app post "/users" as
  remember body as request.json
  reply body
done

listen app on port 3000
```

## Invalid forms

- Route registered before `remember app as express app`.
- `app <verb>` with a missing `<path>`.
- `reply` with a raw object outside a route context.
- `listen app on port` without a numeric port.

## Security considerations

- Bind to `0.0.0.0` only when intended; document port exposure.
- Validate and sanitize `request.param` / `request.query` values — treat them as
  untrusted input.
- Never send secrets, database credentials, or real request payloads to the AI
  provider.

## Expected compiler output

```json
{
  "javascript": "<generated express code>",
  "dependencies": ["express"],
  "imports": [],
  "async": false
}
```

## Tests

- `tests/ai.test.js` — resolver selects the `rest-api` rule; mocked translation
  of the health route example passes validation; `reply <object>` maps to
  `res.json`.
