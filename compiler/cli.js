#!/usr/bin/env node
// CLI: reads a .pln file, compiles it to JavaScript, and executes it.

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { tokenize } = require('./lexer');
const { parse }    = require('./parser');
const { generate } = require('./generator');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node cli.js <file.pln>');
  process.exit(1);
}

const source = fs.readFileSync(path.resolve(filePath), 'utf8');

function stage(label, fn) {
  try {
    const result = fn();
    console.log(`✓ ${label}`);
    return result;
  } catch (err) {
    console.error(`✗ ${label} failed\n`);
    console.error(err.message);
    process.exit(1);
  }
}

const tokens = stage('Lexing',               () => tokenize(source));
const ast    = stage('Parsing',              () => parse(tokens));
                stage('Building AST',        () => ast); // AST is built during parsing
const js     = stage('Generating JavaScript',() => generate(ast));

// Write the generated JavaScript to a temp file
const tmpFile = path.join(__dirname, '_plain_out.js');
fs.writeFileSync(tmpFile, js, 'utf8');

console.log('');

stage('Running', () => {
  try {
    execSync(`node ${tmpFile}`, { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

console.log('\nCompilation successful.');
