// Generator: converts a Plain AST into JavaScript source code.

// Known runtime packages and their require() statements.
const KNOWN_PACKAGES = {
  express: `const express = require('express');`,
  sqlite:  `const Database = require('better-sqlite3');`,
  fs:      `const fs = require('fs');`,
  path:    `const path = require('path');`,
  axios:   `const axios = require('axios');`,
  chalk:   `const chalk = require('chalk');`,
};

const BUILTIN_DECLARATIONS = {
  fs: `const fs = require('fs');`,
  crypto: `const crypto = require('crypto');`,
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
  return { requires: new Set(), pendingPrelude: [] };
}

function emitRequire(context, moduleName) {
  if (context.requires.has(moduleName)) return '';
  context.requires.add(moduleName);

  if (KNOWN_PACKAGES[moduleName]) return KNOWN_PACKAGES[moduleName];

  // Keep the old friendly error for the formerly unsupported placeholder
  // package while allowing RFC-0009.3's explicitly supported packages.
  throw new Error(
    `Unknown package "${moduleName}".\n\nPlain supports: ${Object.keys(KNOWN_PACKAGES).join(', ')}.\n\nExample:\n  use express`
  );
}

function ensureBuiltin(context, moduleName) {
  if (context.requires.has(moduleName)) return;
  context.requires.add(moduleName);
  const declaration = BUILTIN_DECLARATIONS[moduleName];
  if (declaration && !context.pendingPrelude.includes(declaration)) {
    context.pendingPrelude.push(declaration);
  }
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

    case 'FunctionDeclaration': {
      const params = node.params.join(', ');
      const body   = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}function ${node.name}(${params}) {\n${body}\n${indent}}`;
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
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}app.listen(${generateExpr(node.port, context)}, () => {\n${body}\n${indent}});`;
    }

    case 'RouteStatement': {
      _inRoute = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inRoute = false;
      return `${indent}app.get(${JSON.stringify(node.path)}, (req, res) => {\n${body}\n${indent}});`;
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
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inRoute = false;
      return `${indent}app.get(${JSON.stringify(node.path)}, (req, res) => {\n${body}\n${indent}});`;
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
        if (node.name === 'readFile' || node.name === 'writeFile' || node.name === 'fileExists') {
          ensureBuiltin(context, 'fs');
        } else if (node.name === 'uuid') {
          ensureBuiltin(context, 'crypto');
        }
        return STDLIB[node.name](node.args, context);
      }
      return `${node.name}(${node.args.map(arg => generateExpr(arg, context)).join(', ')})`;
    }

    default:
      throw new Error(`Unknown expression type "${node.type}".`);
  }
}

module.exports = { generate };
