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

  if (node.type === 'UseStatement') onUse(node.module);

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') visit(value, onUse);
  }
}

/**
 * Return the unique npm packages required by Plain `use` statements.
 *
 * @param {string|object} source Plain source text or a parsed Plain AST
 * @returns {string[]} package names in first-seen order
 */
function detectDependencies(source) {
  const ast = typeof source === 'string'
    ? parse(tokenize(source))
    : source;
  const dependencies = new Set();

  visit(ast, (moduleName) => {
    const packageName = PACKAGE_MAP[moduleName] || moduleName;
    if (!isBuiltinModule(moduleName) && !isBuiltinModule(packageName)) {
      dependencies.add(packageName);
    }
  });

  return [...dependencies];
}

module.exports = {
  detectDependencies,
  isBuiltinModule,
  PACKAGE_MAP,
};