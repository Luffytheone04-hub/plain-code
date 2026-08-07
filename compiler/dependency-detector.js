
// Runtime dependency detection for Plain source files.
//
// This module only inspects source/AST data. It never installs packages or
// checks the filesystem, so it can be reused by the CLI, editors, and tools.

const { builtinModules } = require('module');
const { tokenize } = require('./lexer');
const { parse } = require('./parser');

// Plain's friendly module names mapped to the npm packages they require.
const PACKAGE_MAP = Object.freeze({
  express: 'express',
  sqlite: 'better-sqlite3',
  fs: 'fs',
  path: 'path',
});

const BUILTIN_MODULES = new Set(builtinModules);

function isBuiltinModule(name) {
  return BUILTIN_MODULES.has(name) || BUILTIN_MODULES.has(`node:${name}`);
}

function visit(node, onUse) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) visit(item, onUse);
    return;
  }

  if (node.type === 'UseStatement') {
    onUse(node.module);
  } else if (node.type === 'WebAppStatement') {
    // The `web app` shorthand creates an Express application.
    onUse('express');
  } else if (node.type === 'DatabaseStatement') {
    // The `database` shorthand uses `better-sqlite3` under the hood.
    onUse('sqlite');
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') visit(value, onUse);
  }
}

/**
 * Return the unique npm packages required by Plain `use` statements
 * `web app` and `database` shorthand blocks.
 *
 * @param {string|object} source Plain source text or a parsed Plain AST
 * @returns {string[]} package names in first-seen order
 */
function detectDependencies(source) {
  const ast = typeof source === 'string'
    ? parse(tokenize(source))
    : source;
  const dependencies = new Set();

  // Only the resolved npm package decides whether a dependency is real.
  // Plain's friendly module names (e.g. sqlite) must not be mistaken for Node
  // built-ins just because Node ships a module with the same name.
  const addPackage = (moduleName) => {
    const packageName = PACKAGE_MAP[moduleName] || moduleName;
    if (!isBuiltinModule(packageName)) {
      dependencies.add(packageName);
    }
  };

  visit(ast, addPackage);

  // Additional check for the `database "..."` shorthand when the source is a string.
  // This ensures detection even if the parser does not produce a DatabaseStatement node.
  if (typeof source === 'string') {
    // Look for patterns like: database "file.db" or database 'file.db'
    // We use a simple regex to catch the shorthand.
    if (/database\s+["']/.test(source)) {
      addPackage('sqlite');
    }
  }

  return [...dependencies];
}

module.exports = {
  detectDependencies,
  isBuiltinModule,
  PACKAGE_MAP,
};