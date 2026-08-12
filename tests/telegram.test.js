// Tests for Plain v1.2 — Telegram statements, inline objects, and the
// statement-level JavaScript block.
//
// Run with: node tests/telegram.test.js
// (Standalone harness; the main suite is tests/compiler.test.js.)

const { tokenize, TOKEN } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { generate } = require('../compiler/generator');
const { format } = require('../compiler/formatter');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

function assert(actual, expected) {
  const a = actual.trim();
  const e = expected.trim();
  if (a !== e) {
    throw new Error(`Expected:\n        ${e}\n        Got:\n        ${a}`);
  }
}

function compile(source) {
  return generate(parse(tokenize(source)));
}

function tokenTypes(source) {
  return tokenize(source).map(t => t.type);
}

// ── Lexer ──────────────────────────────────────────────────────────────────

test('lexer: { } : -> are new tokens', () => {
  assert(
    JSON.stringify(tokenTypes('{ text: "hi" }')),
    JSON.stringify(['LBRACE', 'IDENTIFIER', 'COLON', 'STRING', 'RBRACE', 'EOF'])
  );
  assert(
    JSON.stringify(tokenTypes('"About" -> "about"')),
    JSON.stringify(['STRING', 'ARROW', 'STRING', 'EOF'])
  );
});

test('lexer: { } : -> carry line/col metadata', () => {
  const brace = tokenize('{')[0];
  if (brace.type !== 'LBRACE') throw new Error('expected LBRACE');
  if (brace.line !== 1 || brace.col !== 1) throw new Error('bad position');
});

// ── Parser ─────────────────────────────────────────────────────────────────

test('parser: when someone sends command block', () => {
  const ast = parse(tokenize('when someone sends "/start"\n  reply "hi"\ndone'));
  const stmt = ast.body[0];
  if (stmt.type !== 'TelegramCommandStatement') throw new Error('not TelegramCommandStatement');
  if (stmt.command !== '/start') throw new Error('wrong command');
  if (stmt.isPattern) throw new Error('should not be a pattern');
  if (stmt.body.length !== 1 || stmt.body[0].type !== 'ReplyStatement') {
    throw new Error('wrong body');
  }
});

test('parser: when someone sends matching pattern block', () => {
  const ast = parse(tokenize('when someone sends matching "/echo (.+)"\n  reply "echo"\ndone'));
  const stmt = ast.body[0];
  if (stmt.type !== 'TelegramCommandStatement') throw new Error('not TelegramCommandStatement');
  if (!stmt.isPattern) throw new Error('should be a pattern');
});

test('parser: when someone clicks callback block', () => {
  const ast = parse(tokenize('when someone clicks "about"\n  reply "About Plain"\ndone'));
  const stmt = ast.body[0];
  if (stmt.type !== 'TelegramCallbackStatement') throw new Error('not TelegramCallbackStatement');
  if (stmt.data !== 'about') throw new Error('wrong data');
});

test('parser: route shorthand still works (when someone visits)', () => {
  const ast = parse(tokenize('when someone visits "/"\n  reply "hi"\ndone'));
  if (ast.body[0].type !== 'RouteStatement') throw new Error('not RouteStatement');
});

test('parser: reply with buttons block', () => {
  const ast = parse(tokenize([
    'reply "Choose" with buttons',
    '  "About" -> "about"',
    'done',
  ].join('\n')));
  const stmt = ast.body[0];
  if (stmt.type !== 'ReplyWithButtonsStatement') throw new Error('not ReplyWithButtonsStatement');
  if (stmt.value.value !== 'Choose') throw new Error('wrong value');
  if (stmt.buttons.length !== 1) throw new Error('wrong row count');
  if (stmt.buttons[0][0].text !== 'About' || stmt.buttons[0][0].data !== 'about') {
    throw new Error('wrong button');
  }
});

test('parser: buttons rows split across blank lines', () => {
  const ast = parse(tokenize([
    'reply "Menu" with buttons',
    '  "A" -> "a", "B" -> "b"',
    '',
    '  "C" -> "c"',
    'done',
  ].join('\n')));
  const stmt = ast.body[0];
  if (stmt.buttons.length !== 2) throw new Error('expected 2 rows');
  if (stmt.buttons[0].length !== 2) throw new Error('first row should have 2 buttons');
  if (stmt.buttons[1].length !== 1) throw new Error('second row should have 1 button');
});

test('parser: start telegram bot', () => {
  const ast = parse(tokenize('start telegram bot'));
  if (ast.body[0].type !== 'TelegramStartStatement') throw new Error('not TelegramStartStatement');
});

test('parser: start still parses a port', () => {
  const ast = parse(tokenize('start 3000'));
  if (ast.body[0].type !== 'StartStatement') throw new Error('not StartStatement');
});

test('parser: inline object literal', () => {
  const ast = parse(tokenize('remember data as { text: "hi", n: 2 }'));
  const stmt = ast.body[0];
  if (stmt.type !== 'RememberStatement') throw new Error('not RememberStatement');
  if (stmt.value.type !== 'InlineObjectLiteral') throw new Error('not InlineObjectLiteral');
  if (stmt.value.properties.length !== 2) throw new Error('wrong property count');
});

test('parser: statement-level javascript block', () => {
  const ast = parse(tokenize('javascript\n  console.log("x")\ndone'));
  const stmt = ast.body[0];
  if (stmt.type !== 'JavaScriptBlock') throw new Error('not JavaScriptBlock');
  if (stmt.name !== null) throw new Error('statement-level block should have no name');
  if (!stmt.body.includes('console.log')) throw new Error('body missing');
});

// ── Generator ──────────────────────────────────────────────────────────────

test('generate: telegram command emits BOT.onCommand', () => {
  const js = compile('when someone sends "/start"\n  reply "hi"\ndone');
  if (!js.includes('BOT.onCommand("/start", async (ctx) => {')) {
    throw new Error(`missing onCommand:\n${js}`);
  }
  if (!js.includes('await Telegram.sendMessage(ctx.chatId, "hi");')) {
    throw new Error('reply did not become Telegram.sendMessage');
  }
});

test('generate: telegram pattern emits BOT.onPattern', () => {
  const js = compile('when someone sends matching "/echo (.+)"\n  reply "echo"\ndone');
  if (!js.includes('BOT.onPattern(new RegExp("/echo (.+)", \'i\'), async (ctx) => {')) {
    throw new Error(`missing onPattern:\n${js}`);
  }
});

test('generate: telegram callback emits BOT.onCallback', () => {
  const js = compile('when someone clicks "about"\n  reply "About"\ndone');
  if (!js.includes('BOT.onCallback("about", async (ctx) => {')) {
    throw new Error(`missing onCallback:\n${js}`);
  }
});

test('generate: reply with buttons includes keyboard rows', () => {
  const js = compile([
    'when someone sends "/menu"',
    '  reply "Choose" with buttons',
    '    "About" -> "about", "Help" -> "help"',
    '  done',
    'done',
  ].join('\n'));
  if (!js.includes('await Telegram.sendMessage(ctx.chatId, "Choose", [["About","about"],["Help","help"]]);')) {
    throw new Error(`missing buttons send:\n${js}`);
  }
});

test('generate: bot token call binds BOT', () => {
  const js = compile('bot "0123456789:TEST"\nstart telegram bot');
  if (!js.includes('BOT = await createTelegramBot("0123456789:TEST");')) {
    throw new Error(`missing bot binding:\n${js}`);
  }
  if (!js.includes('await BOT.start();')) {
    throw new Error('missing BOT.start()');
  }
});

test('generate: inline object literal renders { key: value }', () => {
  const js = compile('remember data as { text: "hi", n: 2 }\nshow data');
  if (!js.includes('let data = { "text": "hi", "n": 2 };')) {
    throw new Error(`bad inline object output:\n${js}`);
  }
});

test('generate: synchronous statement-level javascript block emits its body directly', () => {
  const js = compile('javascript\n  console.log("x")\ndone');
  if (js.includes('await (async () => {')) throw new Error(`sync block should not be wrapped:\n${js}`);
  if (!js.includes('console.log("x")')) throw new Error(`body missing:\n${js}`);
});

test('generate: statement-level javascript block with top-level await keeps the async wrapper', () => {
  const js = compile('javascript\n  const data = await fetch(url)\ndone');
  if (!js.includes('await (async () => {')) throw new Error(`async block lost its wrapper:\n${js}`);
  if (!js.includes('await fetch(url)')) throw new Error('await missing from body');
});

// ── Formatter ──────────────────────────────────────────────────────────────

test('format: telegram blocks indent', () => {
  const out = format([
    'when someone sends "/start"',
    'reply "hi"',
    'done',
    'when someone clicks "about"',
    'reply "About"',
    'done',
  ].join('\n'));
  const lines = out.trim().split('\n');
  if (lines[0] !== 'when someone sends "/start"') throw new Error('bad first line');
  if (lines[1] !== '    reply "hi"') throw new Error('reply not indented');
  if (lines[2] !== 'done') throw new Error('done not dedented');
});

test('format: reply with buttons block indents button rows', () => {
  const out = format([
    'reply "Choose" with buttons',
    '"About" -> "about"',
    'done',
  ].join('\n'));
  const lines = out.trim().split('\n');
  if (lines[1] !== '    "About" -> "about"') throw new Error(`button row not indented: ${lines[1]}`);
  if (lines[2] !== 'done') throw new Error('done not dedented');
});

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
