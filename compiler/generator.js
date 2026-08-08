// Generator: converts a Plain AST into JavaScript source code.

const vm = require('vm');

// Known runtime packages and their require() statements.
const KNOWN_PACKAGES = {
  express: `const express = require('express');`,
  sqlite:  `const Database = require('better-sqlite3');`,
  fs:      `const fs = require('fs');`,
  path:    `const path = require('path');`,
  axios:   `const axios = require('axios');`,
  chalk:   `const chalk = require('chalk');`,
};

// Plain module names whose npm package name differs from the Plain name.
// Used to de-duplicate runtime requires across aliases (RFC-0011 §22).
const NPM_NAME = {
  sqlite: 'better-sqlite3',
};

// JavaScript reserved words that cannot be used as a const binding name.
const JS_RESERVED = new Set([
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface',
  'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while',
  'with', 'yield',
]);

const BUILTIN_DECLARATIONS = {
  fs: `const fs = require('fs');`,
  crypto: `const crypto = require('crypto');`,
  // v1.1.1 — ask runtime (RFC-0011 §14)
  ask: [
    `const readline = require('readline');`,
    `async function __ask(prompt = '') {`,
    `  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });`,
    `  try {`,
    `    return await new Promise((resolve) => rl.question(prompt, resolve));`,
    `  } finally {`,
    `    rl.close();`,
    `  }`,
    `}`,
  ].join('\n'),
};

// Built-in stdlib functions: Plain name → JS code generator.
// v0.1–v0.4 original stdlib
const STDLIB = {
  length:    (args, context) => `(${generateExpr(args[0], context)}).length`,
  uppercase: (args, context) => `(${generateExpr(args[0], context)}).toUpperCase()`,
  lowercase: (args, context) => `(${generateExpr(args[0], context)}).toLowerCase()`,
  random:    (_args) => `Math.random()`,
  round:     (args, context)  => `Math.round(${generateExpr(args[0], context)})`,
  // Runtime constructors
  sqlite:    (args, context)  => `new Database(${args.map(arg => generateExpr(arg, context)).join(', ')})`,
  // v0.6 — runtime standard library
  print:      (args, context) => `console.log(${args.map(arg => generateExpr(arg, context)).join(', ')})`,
  readFile:   (args, context) => `fs.readFileSync(${generateExpr(args[0], context)}, 'utf8')`,
  writeFile:  (args, context) => `fs.writeFileSync(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)}, 'utf8')`,
  fileExists: (args, context) => `fs.existsSync(${generateExpr(args[0], context)})`,
  read:       (args, context) => `fs.readFileSync(${generateExpr(args[0], context)}, 'utf8')`,
  sleep:      (args, context) => `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${generateExpr(args[0], context)})`,
  time:       (_args) => `Date.now()`,
  date:       (_args) => `new Date().toISOString()`,
  jsonEncode: (args, context) => `JSON.stringify(${generateExpr(args[0], context)})`,
  jsonDecode: (args, context) => `JSON.parse(${generateExpr(args[0], context)})`,
  env:        (args, context) => `process.env[${generateExpr(args[0], context)}]`,
  exit:       (args, context) => `process.exit(${args.length ? generateExpr(args[0], context) : '0'})`,
  uuid:       (_args, context) => `crypto.randomUUID()`,
};

// Set to true while generating inside a route handler body.
// Remaps Plain's "request" → "req" and "response" → "res".
let _inRoute = false;

function createGenerationContext() {
  return {
    requires: new Set(),
    pendingPrelude: [],
    needsAsync: false, // true when top-level code emits await (js blocks / ask)
    inFunction: false, // true while generating inside a function-like scope
  };
}

// Wraps a generated program so top-level `await` is legal (RFC-0011 §10).
function wrapAsync(js) {
  return `(async () => {\n${js}\n})();`;
}

function isValidIdentifier(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && !JS_RESERVED.has(name);
}

function npmPackageName(moduleName) {
  return NPM_NAME[moduleName] || moduleName;
}

function emitRequire(context, moduleName) {
  const npmName = npmPackageName(moduleName);
  if (context.requires.has(npmName)) return '';
  context.requires.add(npmName);

  if (KNOWN_PACKAGES[moduleName]) return KNOWN_PACKAGES[moduleName];

  // RFC-0011 §5.1 — arbitrary npm packages. A name that is not a valid JS
  // identifier (e.g. node-fetch) is required for its side effect only.
  if (isValidIdentifier(moduleName)) {
    return `const ${moduleName} = require('${moduleName}');`;
  }
  return `require('${moduleName}');`;
}

function ensureBuiltin(context, moduleName) {
  if (context.requires.has(moduleName)) return;
  context.requires.add(moduleName);
  const declaration = BUILTIN_DECLARATIONS[moduleName];
  if (declaration && !context.pendingPrelude.includes(declaration)) {
    context.pendingPrelude.push(declaration);
  }
}

// True when any statement in the block emits `await` (a JavaScript block or
// `ask`), including inside nested if / loop bodies. Nested Plain function
// declarations are handled independently, so they are not descended into.
function containsAsyncBlock(statements) {
  for (const stmt of statements || []) {
    if (stmt.type === 'AskStatement' || stmt.type === 'JavaScriptBlock') return true;
    if (stmt.type === 'IfStatement') {
      if (containsAsyncBlock(stmt.consequent)) return true;
      if (stmt.alternate && containsAsyncBlock(stmt.alternate)) return true;
    } else if (stmt.type !== 'FunctionDeclaration' && stmt.body) {
      if (containsAsyncBlock(stmt.body)) return true;
    }
  }
  return false;
}

function generate(ast, context = createGenerationContext()) {
  if (ast.type !== 'Program') {
    throw new Error(`Expected a Program node but got "${ast.type}".`);
  }
  const preludeStart = context.pendingPrelude.length;
  const body = ast.body.map(node => generateStatement(node, '', context)).filter(Boolean).join('\n');
  return context.pendingPrelude.slice(preludeStart).concat(body).filter(Boolean).join('\n');
}

// ── Condition generation ────────────────────────────────────────────────────

function generateCondition(cond, context) {
  switch (cond.type) {
    case 'BinaryCondition':
      return `${generateExpr(cond.left, context)} ${cond.op} ${generateExpr(cond.right, context)}`;

    case 'UnaryCondition':
      if (cond.op === 'isEmpty')    return `(${generateExpr(cond.left, context)}).length === 0`;
      if (cond.op === 'isNotEmpty') return `(${generateExpr(cond.left, context)}).length > 0`;
      throw new Error(`Unknown unary condition op "${cond.op}".`);

    case 'BetweenCondition': {
      const expr = generateExpr(cond.left, context);
      return `${expr} >= ${generateExpr(cond.low, context)} && ${expr} <= ${generateExpr(cond.high, context)}`;
    }

    case 'StringCondition':
      return `(${generateExpr(cond.left, context)}).${cond.method}(${generateExpr(cond.right, context)})`;

    default:
      throw new Error(`Unknown condition type "${cond.type}".`);
  }
}

// ── Statement generation ────────────────────────────────────────────────────

function generateStatement(node, indent = '', context = createGenerationContext()) {
  switch (node.type) {
    case 'RememberStatement':
      return `${indent}let ${node.name} = ${generateExpr(node.value, context)};`;

    case 'ShowStatement':
      return `${indent}console.log(${generateExpr(node.value, context)});`;

    case 'GiveStatement':
      return `${indent}return ${generateExpr(node.value, context)};`;

    case 'BecomeStatement':
      return `${indent}${generateLValue(node.target, context)} = ${generateExpr(node.value, context)};`;

    case 'ExpressionStatement':
      return `${indent}${generateExpr(node.expression, context)};`;

    case 'ImportStatement':
      return ''; // resolved at bundle time by the bundler

    case 'UseStatement': {
      const pkg = emitRequire(context, node.module);
      return pkg ? `${indent}${pkg}` : '';
    }

    // v1.1.1 — JavaScript Gateway (RFC-0011)

    // remember <name> as javascript … done
    case 'JavaScriptBlock': {
      if (!context.inFunction) context.needsAsync = true;
      // Validate the raw JavaScript at compile time so JS syntax errors are
      // reported as such, with the Plain context that produced them.
      try {
        new vm.Script(`(async () => {\n${node.body}\n})`);
      } catch (e) {
        throw new Error(
          `JavaScript error inside the "javascript" block assigned to "${node.name}": ${e.message}`
        );
      }
      // The body is emitted verbatim: JavaScript indentation, template
      // literals, and line structure are preserved as written (RFC-0011 §31).
      return `${indent}let ${node.name} = await (async () => {\n${node.body}\n${indent}})();`;
    }

    // ask name  /  ask "<prompt>" as name
    case 'AskStatement': {
      ensureBuiltin(context, 'ask');
      if (!context.inFunction) context.needsAsync = true;
      const prompt = node.prompt != null ? JSON.stringify(node.prompt) : '"> "';
      return `${indent}let ${node.variable} = await __ask(${prompt});`;
    }

    case 'FunctionDeclaration': {
      const isAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const params = node.params.join(', ');
      const prevInFunction = context.inFunction;
      context.inFunction = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      context.inFunction = prevInFunction;
      return `${indent}${isAsync}function ${node.name}(${params}) {\n${body}\n${indent}}`;
    }

    case 'IfStatement': {
      const condition  = generateCondition(node.condition, context);
      const consequent = node.consequent.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      let out = `${indent}if (${condition}) {\n${consequent}\n${indent}}`;
      if (node.alternate) {
        const alternate = node.alternate.map(s => generateStatement(s, indent + '  ', context)).join('\n');
        out += ` else {\n${alternate}\n${indent}}`;
      }
      return out;
    }

    case 'ForEachStatement': {
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}for (const ${node.item} of ${generateExpr(node.collection, context)}) {\n${body}\n${indent}}`;
    }

    case 'WhileStatement': {
      const condition = generateCondition(node.condition, context);
      const body      = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}while (${condition}) {\n${body}\n${indent}}`;
    }

    // v0.3 — Express runtime

    case 'ListenStatement': {
      const handlerAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}app.listen(${generateExpr(node.port, context)}, ${handlerAsync}() => {\n${body}\n${indent}});`;
    }

    case 'RouteStatement': {
      _inRoute = true;
      const handlerAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inRoute = false;
      return `${indent}app.get(${JSON.stringify(node.path)}, ${handlerAsync}(req, res) => {\n${body}\n${indent}});`;
    }

    case 'ReplyStatement':
      return `${indent}res.send(${generateExpr(node.value, context)});`;

    case 'ReplyJsonStatement': {
      const props = node.properties
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value, context)}`)
        .join(', ');
      return `${indent}res.json({ ${props} });`;
    }

    case 'ServeFolderStatement':
      return `${indent}app.use(express.static(${JSON.stringify(node.folder)}));`;

    // v0.6 — Express DX

    case 'WebAppStatement':
      return [emitRequire(context, 'express'), `${indent}const app = express();`]
        .filter(Boolean).map(line => line.startsWith('const ') ? `${indent}${line}` : line).join('\n');

    case 'SimpleRouteStatement': {
      _inRoute = true;
      const handlerAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inRoute = false;
      return `${indent}app.get(${JSON.stringify(node.path)}, ${handlerAsync}(req, res) => {\n${body}\n${indent}});`;
    }

    case 'StartStatement':
      return `${indent}app.listen(${generateExpr(node.port, context)});`;

    // v0.6 — SQLite DX

    case 'DatabaseStatement':
      return [
        emitRequire(context, 'sqlite'),
        `${indent}const db = new Database(${JSON.stringify(node.file)});`,
      ].filter(Boolean).map(line => line.startsWith('const ') ? `${indent}${line}` : line).join('\n');

    case 'QueryStatement':
      return `${indent}db.prepare(\`${node.sql}\`).all();`;

    case 'InsertStatement':
    case 'UpdateStatement':
    case 'DeleteStatement':
      return `${indent}db.prepare(\`${node.sql}\`).run();`;

    case 'ExecuteStatement':
      return `${indent}db.exec(\`${node.sql}\`);`;

    default:
      throw new Error(`Unknown statement type "${node.type}".`);
  }
}

// Generates a valid JS assignment target (left-hand side of =).
function generateLValue(node, context) {
  if (node.type === 'Identifier')       return node.name;
  if (node.type === 'IndexExpression')  return `${generateExpr(node.object, context)}[${generateExpr(node.index, context)}]`;
  if (node.type === 'MemberExpression') return `${generateExpr(node.object, context)}.${node.property}`;
  if (node.type === 'OfExpression')     return `${generateExpr(node.object, context)}.${generateExpr(node.property, context)}`;
  if (node.type === 'FirstItem')        return `${generateExpr(node.collection, context)}[0]`;
  if (node.type === 'NumberedItem')     return `${generateExpr(node.collection, context)}[${node.index}]`;
  if (node.type === 'LastItem')         return `${generateExpr(node.collection, context)}[${generateExpr(node.collection, context)}.length - 1]`;
  throw new Error(`Invalid assignment target "${node.type}".`);
}

function generateExpr(node, context = createGenerationContext()) {
  switch (node.type) {
    case 'StringLiteral':    return JSON.stringify(node.value);
    case 'NumberLiteral':    return String(node.value);

    case 'Identifier': {
      // Inside route handlers, remap Plain's request/response to req/res
      if (_inRoute && node.name === 'request')  return 'req';
      if (_inRoute && node.name === 'response') return 'res';
      return node.name;
    }

    case 'BinaryExpression': return `${generateExpr(node.left, context)} ${node.operator} ${generateExpr(node.right, context)}`;

    case 'ArrayLiteral':
      return `[${node.elements.map(element => generateExpr(element, context)).join(', ')}]`;

    case 'ObjectLiteral': {
      const props = node.properties
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value, context)}`)
        .join(', ');
      return `{ ${props} }`;
    }

    case 'IndexExpression':
      return `${generateExpr(node.object, context)}[${generateExpr(node.index, context)}]`;

    case 'MemberExpression':
      return `${generateExpr(node.object, context)}.${node.property}`;

    case 'CallExpression': {
      if (STDLIB[node.name]) {
        if (node.name === 'readFile' || node.name === 'writeFile' ||
            node.name === 'fileExists' || node.name === 'read') {
          ensureBuiltin(context, 'fs');
        } else if (node.name === 'uuid') {
          ensureBuiltin(context, 'crypto');
        }
        return STDLIB[node.name](node.args, context);
      }
      return `${node.name}(${node.args.map(arg => generateExpr(arg, context)).join(', ')})`;
    }

    // v1.1 — Item expressions
    case 'FirstItem':
      return `${generateExpr(node.collection, context)}[0]`;

    case 'LastItem':
      return `${generateExpr(node.collection, context)}[${generateExpr(node.collection, context)}.length - 1]`;

    case 'NumberedItem':
      return `${generateExpr(node.collection, context)}[${node.index}]`;

    case 'LengthExpression':
      return `${generateExpr(node.object, context)}.length`;

    // v1.1 — Property access
    case 'OfExpression':
      return `${generateExpr(node.object, context)}.${generateExpr(node.property, context)}`;

    // v1.1 — Collection operations
    case 'AddCall':
      return `${generateExpr(node.collection, context)}.push(${generateExpr(node.value, context)})`;

    case 'RemoveCall':
      return `${generateExpr(node.collection, context)}.splice(${generateExpr(node.collection, context)}.indexOf(${generateExpr(node.value, context)}), 1)`;

    case 'WriteCall':
      ensureBuiltin(context, 'fs');
      return `fs.writeFileSync(${generateExpr(node.data, context)}, ${generateExpr(node.file, context)}, 'utf8')`;

    default:
      throw new Error(`Unknown expression type "${node.type}".`);
  }
}

module.exports = { generate, createGenerationContext, wrapAsync };
