#!/usr/bin/env node
// CLI: compile and run Plain (.pln) files.
//
// Usage:
//   plain run   <file.pln>   compile and execute
//   plain build <file.pln>   compile to JavaScript (outputs <file>.js)
//   plain new   [name]       scaffold a new Plain project
//   plain version            print the compiler version
//   plain help               print this help text

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { tokenize } = require('./lexer');
const { parse }    = require('./parser');
const { generate } = require('./generator');
const { bundle, resolveDependencies } = require('./bundler');

const VERSION = '0.4.1';

const HELP = `
Plain v${VERSION} — Intent-Oriented Programming Language

Usage:
  plain run   <file.pln>   Compile and execute a Plain program
  plain build <file.pln>   Compile to JavaScript without running
  plain new   [name]       Create a new Plain project
  plain version            Print the compiler version
  plain help               Print this help text

Examples:
  plain run hello.pln
  plain run app.pln        (resolves imports automatically)
  plain build hello.pln
  plain new myapp
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
  let files;
  stage('Resolving imports', () => {
    files = resolveDependencies(path.resolve(filePath));
  });
  stage('Building dependency graph', () => files);
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

function cmdNew(projectName) {
  const name    = projectName || 'my-plain-app';
  const dir     = path.resolve(name);

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
npm install
plain run app.pln
\`\`\`

Then open http://localhost:3000 in your browser.
`);

  console.log(`✓ Created project "${name}"`);
  console.log(`\nNext steps:\n  cd ${name}\n  npm install\n  plain run app.pln`);
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
  case 'new':     cmdNew(fileArg);   break;
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
