#!/usr/bin/env node
// CLI: reads a .pln file, compiles it, and executes the resulting JavaScript

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { generate } = require('./generator');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node cli.js <file.pln>');
  process.exit(1);
}

const source = fs.readFileSync(path.resolve(filePath), 'utf8');

const tokens = tokenize(source);
const ast = parse(tokens);
const js = generate(ast);

// Write generated JS to a temp file and execute it
const tmpFile = path.join(__dirname, '_plain_out.js');
fs.writeFileSync(tmpFile, js, 'utf8');

try {
  execSync(`node ${tmpFile}`, { stdio: 'inherit' });
} finally {
  fs.unlinkSync(tmpFile);
}
