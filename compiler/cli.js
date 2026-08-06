#!/usr/bin/env node
// CLI: compile and run Plain (.pln) files.
//
// Usage:
//   plain run    <file.pln>   compile and execute
//   plain build  <file.pln>   compile to JavaScript (outputs <file>.js)
//   plain check  <file.pln>   check syntax only (no JS generated, no execution)
//   plain fmt    <file.pln>   format a Plain file in-place
//   plain new    [name]       scaffold a new Plain project
//   plain init               create plain.json in the current directory
//   plain install            install dependencies from plain.json
//   plain add    <package>   install a package and add it to plain.json
//   plain remove <package>   uninstall a package and remove it from plain.json
//   plain update             update all installed packages
//   plain version            print the compiler version
//   plain help               print this help text

const fs   = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const { tokenize } = require('./lexer');
const { parse }    = require('./parser');
const { generate } = require('./generator');
const { bundle, resolveDependencies } = require('./bundler');
const { format }   = require('./formatter');

const VERSION = '1.0.0';

// ── Terminal colours (disabled when stdout is not a TTY) ──────────────────────

const HAS_COLOR = Boolean(process.stdout.isTTY);
function _c(code, text) { return HAS_COLOR ? `\x1b[${code}m${text}\x1b[0m` : text; }
const clrGreen  = (t) => _c('32', t);
const clrRed    = (t) => _c('31', t);
const clrYellow = (t) => _c('33', t);
const clrCyan   = (t) => _c('36', t);
const clrBold   = (t) => _c('1',  t);
const clrDim    = (t) => _c('2',  t);

function warn(message) {
  console.warn(clrYellow(`⚠  Warning: ${message}`));
}

const HELP = `
Plain v${VERSION} — Intent-Oriented Programming Language

Commands

  plain run    <file.pln>   Compile and execute a Plain program
  plain build  <file.pln>   Compile to JavaScript without running
  plain check  <file.pln>   Check syntax only (no output, no execution)
  plain fmt    <file.pln>   Format a Plain file in-place
  plain new    [name]       Create a new Plain project
  plain init               Create a plain.json in the current directory
  plain install            Install dependencies listed in plain.json
  plain add    <package>   Install a package and add it to plain.json
  plain remove <package>   Remove a package from plain.json and uninstall it
  plain update             Update all installed npm packages
  plain version            Print the compiler version
  plain help               Print this help text

v1.0 Language Features

  Comparisons:  is above, is below, is at least, is at most,
                is not, is empty, is not empty, contains,
                starts with, ends with, between … and
  Alias:        for every … in …  (same as for each)
  Web:          web app / route "…" … done / start <port>
  Database:     database "…" / query … done / insert … done
  Stdlib:       print, readFile, writeFile, fileExists, sleep,
                time, date, jsonEncode, jsonDecode, env, exit, uuid

Examples:
  plain run hello.pln
  plain build app.pln
  plain check app.pln
  plain fmt app.pln
  plain new myapp
  plain init
  plain add express
  plain remove express
`.trim();

// ── Package-name validation ───────────────────────────────────────────────────

// Accept standard npm package names including scoped packages (@org/pkg).
// Rejects anything that could be used for shell injection or path traversal.
function isValidPackageName(name) {
  return typeof name === 'string' && /^(@[a-z0-9-_.]+\/)?[a-z0-9-_.]+$/i.test(name);
}

// ── plain.json helpers ────────────────────────────────────────────────────────

const PLAIN_JSON = 'plain.json';

function readPlainJson() {
  const jsonPath = path.resolve(PLAIN_JSON);
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error(`plain.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

function writePlainJson(data) {
  fs.writeFileSync(path.resolve(PLAIN_JSON), JSON.stringify(data, null, 4) + '\n', 'utf8');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stage(label, fn) {
  const t0 = Date.now();
  try {
    const result = fn();
    const ms = Date.now() - t0;
    console.log(`${clrGreen('✓')} ${label}${ms > 50 ? clrDim(` (${ms}ms)`) : ''}`);
    return result;
  } catch (err) {
    console.error(`${clrRed('✗')} ${label} failed\n`);
    console.error(err.message);
    process.exit(1);
  }
}

// Map Plain package names to their npm package names (same as the compiler's
// KNOWN_PACKAGES in generator.js).
const PLAIN_TO_NPM = {
  express: 'express',
  sqlite:  'better-sqlite3',
  path:    'path',
  fs:      'fs',
};

// Returns the npm package name for a Plain `use` package name, or null if
// it is a built-in Node.js module that needs no installation.
const NODE_BUILTINS = new Set(['fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'events', 'stream', 'util', 'buffer']);

function npmNameFor(plainPkg) {
  return PLAIN_TO_NPM[plainPkg] || plainPkg;
}

function isBuiltin(npmPkg) {
  return NODE_BUILTINS.has(npmPkg);
}

// Check whether an npm package is installed in the nearest node_modules.
function isInstalled(npmPkg) {
  if (isBuiltin(npmPkg)) return true;
  try {
    require.resolve(npmPkg, { paths: [process.cwd()] });
    return true;
  } catch (_) {
    return false;
  }
}

// Extract `use <pkg>` statements from an AST.
function getUsedPackages(ast) {
  return ast.body
    .filter(n => n.type === 'UseStatement')
    .map(n => n.module);
}

// Validate that all npm packages referenced by `use` statements are installed.
function validateDependencies(files) {
  const missing = [];
  for (const { ast } of files) {
    for (const plainPkg of getUsedPackages(ast)) {
      const npm = npmNameFor(plainPkg);
      if (!isBuiltin(npm) && !isInstalled(npm)) {
        missing.push({ plainPkg, npm });
      }
    }
  }
  if (missing.length > 0) {
    const lines = missing.map(({ plainPkg, npm }) => {
      const hint = plainPkg === npm
        ? `plain add ${npm}`
        : `plain add ${npm}`;
      return `  Package "${npm}" is not installed.\n  Run: ${hint}`;
    });
    throw new Error(`Missing dependencies:\n\n${lines.join('\n\n')}`);
  }
}

function compile(filePath) {
  let files;
  stage('Resolving imports', () => {
    files = resolveDependencies(path.resolve(filePath));
  });
  stage('Building dependency graph', () => files);
  stage('Validating dependencies', () => validateDependencies(files));
  const js = stage('Generating JavaScript', () =>
    files.map(({ ast }) => generate(ast)).filter(s => s.trim()).join('\n')
  );
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
    execFileSync(process.execPath, [tmpFile], { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmpFile);
  }
  console.log('\nDone.');
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

function cmdNew(projectName) {
  const name = projectName || 'my-plain-app';
  const dir  = path.resolve(name);

  if (fs.existsSync(dir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(dir);
  fs.mkdirSync(path.join(dir, 'public'));

  // app.pln — starter Express app
  fs.writeFileSync(path.join(dir, 'app.pln'), `use express

remember app as express()

serve folder "public"

when someone visits "/"
    reply "Hello from Plain!"
done

when someone visits "/api/status"
    reply json
        status is "ok"
        version is "1.0"
    done
done

listen on 3000
    show "Server running at http://localhost:3000"
done
`);

  // plain.json
  fs.writeFileSync(path.join(dir, PLAIN_JSON), JSON.stringify({
    name,
    version: '0.1.0',
    entry: 'app.pln',
    dependencies: {
      express: '^4.18.2',
    },
  }, null, 4) + '\n');

  // package.json
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name,
    version: '1.0.0',
    description: `A Plain v${VERSION} application`,
    main: 'app.js',
    scripts: {
      start: 'plain run app.pln',
      build: 'plain build app.pln && node app.js',
    },
    dependencies: {
      express: '^4.18.2',
    },
  }, null, 2) + '\n');

  // README.md
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}

A Plain v${VERSION} application.

## Getting started

\`\`\`bash
plain install
plain run app.pln
\`\`\`

Then open http://localhost:3000 in your browser.
`);

  console.log(`✓ Created project "${name}"`);
  console.log(`\nNext steps:\n  cd ${name}\n  plain install\n  plain run app.pln`);
}

function cmdInit() {
  const jsonPath = path.resolve(PLAIN_JSON);
  if (fs.existsSync(jsonPath)) {
    console.log('Project already initialized.');
    return;
  }
  const name = path.basename(process.cwd());
  writePlainJson({
    name,
    version: '0.1.0',
    entry: 'app.pln',
  });
  console.log(`✓ Created ${PLAIN_JSON}`);
}

function cmdInstall() {
  const config = readPlainJson();
  if (!config) {
    console.error(`No ${PLAIN_JSON} found. Run "plain init" first.`);
    process.exit(1);
  }
  const deps = config.dependencies || {};
  const packages = Object.keys(deps);
  if (packages.length === 0) {
    console.log('No dependencies to install.');
    return;
  }
  // Install every package declared in plain.json.dependencies by name,
  // so this works even in projects that have no package.json yet.
  console.log('Installing dependencies...');
  try {
    execFileSync('npm', ['install', ...packages], { stdio: 'inherit', cwd: process.cwd() });
    console.log('\n✓ Dependencies installed.');
  } catch (e) {
    console.error('npm install failed.');
    process.exit(1);
  }
}

function cmdAdd(packageName) {
  if (!packageName) {
    console.error('Usage: plain add <package>');
    process.exit(1);
  }
  if (!isValidPackageName(packageName)) {
    console.error(`Invalid package name: "${packageName}".`);
    process.exit(1);
  }
  const config = readPlainJson();
  if (!config) {
    console.error(`No ${PLAIN_JSON} found. Run "plain init" first.`);
    process.exit(1);
  }

  if (!config.dependencies) config.dependencies = {};

  if (config.dependencies[packageName]) {
    console.log(`"${packageName}" is already listed in ${PLAIN_JSON}.`);
  }

  console.log(`Installing ${packageName}...`);
  try {
    // Use execFileSync with an argument array — no shell, no injection risk.
    execFileSync('npm', ['install', packageName], { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`Failed to install "${packageName}".`);
    process.exit(1);
  }

  // Read the installed version from node_modules/<pkg>/package.json.
  let version = '*';
  try {
    const pkgMeta = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'node_modules', packageName, 'package.json'), 'utf8')
    );
    if (pkgMeta.version) version = `^${pkgMeta.version}`;
  } catch (_) { /* leave '*' if metadata is unreadable */ }

  config.dependencies[packageName] = version;
  writePlainJson(config);
  console.log(`✓ Added "${packageName}" to ${PLAIN_JSON}.`);
}

function cmdRemove(packageName) {
  if (!packageName) {
    console.error('Usage: plain remove <package>');
    process.exit(1);
  }
  if (!isValidPackageName(packageName)) {
    console.error(`Invalid package name: "${packageName}".`);
    process.exit(1);
  }
  const config = readPlainJson();
  if (!config) {
    console.error(`No ${PLAIN_JSON} found. Run "plain init" first.`);
    process.exit(1);
  }

  if (!config.dependencies || !config.dependencies[packageName]) {
    console.log(`"${packageName}" is not listed in ${PLAIN_JSON}.`);
  } else {
    delete config.dependencies[packageName];
    writePlainJson(config);
  }

  console.log(`Uninstalling ${packageName}...`);
  try {
    // Use execFileSync with an argument array — no shell, no injection risk.
    execFileSync('npm', ['uninstall', packageName], { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`Failed to uninstall "${packageName}".`);
    process.exit(1);
  }
  console.log(`✓ Removed "${packageName}" from ${PLAIN_JSON}.`);
}

function cmdUpdate() {
  console.log('Updating packages...');
  try {
    execFileSync('npm', ['update'], { stdio: 'inherit', cwd: process.cwd() });
    console.log('\n✓ Packages updated.');
  } catch (e) {
    console.error('npm update failed.');
    process.exit(1);
  }
}

// Check syntax of a Plain file without generating JavaScript or executing.
function cmdCheck(filePath) {
  if (!filePath) {
    console.error('Usage: plain check <file.pln>');
    process.exit(1);
  }
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const t0 = Date.now();
  try {
    resolveDependencies(absPath);
    const ms = Date.now() - t0;
    console.log(`${clrGreen('✓')} ${filePath} — no errors found.${clrDim(` (${ms}ms)`)}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

// Format a Plain file in-place.
function cmdFmt(filePath) {
  if (!filePath) {
    console.error('Usage: plain fmt <file.pln>');
    process.exit(1);
  }
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const source    = fs.readFileSync(absPath, 'utf8');
  const formatted = format(source);
  if (source === formatted) {
    console.log(`${clrDim('–')} ${filePath} — already formatted.`);
  } else {
    fs.writeFileSync(absPath, formatted, 'utf8');
    console.log(`${clrGreen('✓')} Formatted ${filePath}`);
  }
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
  case 'run':     cmdRun(fileArg);        break;
  case 'build':   cmdBuild(fileArg);      break;
  case 'check':   cmdCheck(fileArg);      break;
  case 'fmt':     cmdFmt(fileArg);        break;
  case 'new':     cmdNew(fileArg);        break;
  case 'init':    cmdInit();              break;
  case 'install': cmdInstall();           break;
  case 'add':     cmdAdd(fileArg);        break;
  case 'remove':  cmdRemove(fileArg);     break;
  case 'update':  cmdUpdate();            break;
  case 'version': cmdVersion();           break;
  case 'help':    cmdHelp();              break;
  default:
    // Backwards-compatible: treat the first arg as a file to run directly
    if (command && command.endsWith('.pln')) {
      cmdRun(command);
    } else {
      console.error(`Unknown command: "${command}". Run "plain help" for usage.`);
      process.exit(1);
    }
}
