#!/usr/bin/env node
// CLI: compile and run Plain (.pln) files.
//
// Usage:
//   plain run   <file.pln>   compile and execute
//   plain build <file.pln>   compile to JavaScript (outputs <file>.js)
//   plain version            print the compiler version
//   plain help               print this help text

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { tokenize } = require('./lexer');
const { parse }    = require('./parser');
const { generate } = require('./generator');

const VERSION = '0.2.0';

const HELP = `
Plain v${VERSION} — Intent-Oriented Programming Language

Usage:
  plain run   <file.pln>   Compile and execute a Plain program
  plain build <file.pln>   Compile to JavaScript without running
  plain version            Print the compiler version
  plain help               Print this help text

Examples:
  plain run hello.pln
  plain build hello.pln
`.trim();

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function compile(filePath) {
  const source = fs.readFileSync(path.resolve(filePath), 'utf8');
  const tokens = stage('Lexing',               () => tokenize(source));
  const ast    = stage('Parsing',              () => parse(tokens));
                 stage('Building AST',         () => ast);
  const js     = stage('Generating JavaScript',() => generate(ast));
  return js;
}

// ── Commands ─────────────────────────────────────────────────────────────────

function cmdRun(filePath) {
  if (!filePath) {
    console.error('Usage: plain run <file.pln>');
    process.exit(1);
  }
  const js = compile(filePath);
  console.log('');
  const tmpFile = path.join(__dirname, '_plain_out.js');
  fs.writeFileSync(tmpFile, js, 'utf8');
  try {
    execSync(`node ${tmpFile}`, { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmpFile);
  }
  console.log('\nCompilation successful.');
}

function cmdBuild(filePath) {
  if (!filePath) {
    console.error('Usage: plain build <file.pln>');
    process.exit(1);
  }
  const js = compile(filePath);
  const outPath = filePath.replace(/\.pln$/, '.js');
  fs.writeFileSync(path.resolve(outPath), js, 'utf8');
  console.log(`\nOutput written to ${outPath}`);
}

function cmdVersion() {
  console.log(`Plain v${VERSION}`);
}

function cmdHelp() {
  console.log(HELP);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const [, , command, fileArg] = process.argv;

switch (command) {
  case 'run':     cmdRun(fileArg);   break;
  case 'build':   cmdBuild(fileArg); break;
  case 'version': cmdVersion();      break;
  case 'help':    cmdHelp();         break;
  default:
    // Backwards-compatible: treat the first arg as a file to run directly
    if (command && command.endsWith('.pln')) {
      cmdRun(command);
    } else {
      console.error(`Unknown command: "${command}". Run "plain help" for usage.`);
      process.exit(1);
    }
}
