// Tests for the Plain compiler (Day 1 + Day 2)

const { tokenize, TOKEN } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { generate } = require('../compiler/generator');

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

// ── Lexer ────────────────────────────────────────────────────────────────────

console.log('\nLexer');

test('tokenizes remember keyword', () => {
  const tokens = tokenize('remember');
  if (tokens[0].type !== TOKEN.REMEMBER) throw new Error('wrong type');
});

test('tokenizes show keyword', () => {
  const tokens = tokenize('show');
  if (tokens[0].type !== TOKEN.SHOW) throw new Error('wrong type');
});

test('tokenizes string literal', () => {
  const tokens = tokenize('"Hello"');
  if (tokens[0].type !== TOKEN.STRING) throw new Error('wrong type');
  if (tokens[0].value !== 'Hello') throw new Error('wrong value');
});

test('tokenizes number literal', () => {
  const tokens = tokenize('42');
  if (tokens[0].type !== TOKEN.NUMBER) throw new Error('wrong type');
  if (tokens[0].value !== 42) throw new Error('wrong value');
});

test('tokenizes if / otherwise / done keywords', () => {
  const tokens = tokenize('if otherwise done');
  if (tokens[0].type !== TOKEN.IF)        throw new Error('if wrong');
  if (tokens[1].type !== TOKEN.OTHERWISE) throw new Error('otherwise wrong');
  if (tokens[2].type !== TOKEN.DONE)      throw new Error('done wrong');
});

test('tokenizes is / greater / than / less keywords', () => {
  const tokens = tokenize('is greater than less');
  if (tokens[0].type !== TOKEN.IS)      throw new Error('is wrong');
  if (tokens[1].type !== TOKEN.GREATER) throw new Error('greater wrong');
  if (tokens[2].type !== TOKEN.THAN)    throw new Error('than wrong');
  if (tokens[3].type !== TOKEN.LESS)    throw new Error('less wrong');
});

test('throws on unterminated string', () => {
  try {
    tokenize('"oops');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.includes('Unterminated')) throw e;
  }
});

test('skips single-line comments', () => {
  const tokens = tokenize('// comment\nshow "Hi"');
  if (tokens[0].type !== TOKEN.SHOW) throw new Error('wrong token after comment');
});

// ── Day 1: remember + show ───────────────────────────────────────────────────

console.log('\nDay 1 — remember + show');

test('remember string compiles to const', () => {
  assert(compile('remember name as "Ayokunle"'), 'const name = "Ayokunle";');
});

test('show identifier compiles to console.log', () => {
  assert(compile('show name'), 'console.log(name);');
});

test('show string literal', () => {
  assert(compile('show "Hello"'), 'console.log("Hello");');
});

test('remember then show (day1 example)', () => {
  assert(
    compile('remember name as "Ayokunle"\nshow name'),
    'const name = "Ayokunle";\nconsole.log(name);'
  );
});

// ── Day 2: if / otherwise / done ─────────────────────────────────────────────

console.log('\nDay 2 — if / otherwise / done');

test('"is" compiles to ===', () => {
  const src = 'remember x as "a"\nif x is "a"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('===')) throw new Error('expected ===');
});

test('"is greater than" compiles to >', () => {
  const src = 'remember age as 16\nif age is greater than 12\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('>')) throw new Error('expected >');
});

test('"is less than" compiles to <', () => {
  const src = 'remember age as 5\nif age is less than 12\n  show "young"\ndone';
  const js = compile(src);
  if (!js.includes('<')) throw new Error('expected <');
});

test('if/otherwise/done compiles to if/else block', () => {
  const src = [
    'remember age as 16',
    'if age is greater than 12',
    '  show "Teenager"',
    'otherwise',
    '  show "Child"',
    'done',
  ].join('\n');
  const js = compile(src);
  if (!js.includes('if (age > 12)'))   throw new Error('missing if condition');
  if (!js.includes('"Teenager"'))       throw new Error('missing consequent');
  if (!js.includes('} else {'))         throw new Error('missing else');
  if (!js.includes('"Child"'))          throw new Error('missing alternate');
});

test('if without otherwise compiles to if without else', () => {
  const src = 'remember x as 5\nif x is less than 10\n  show "small"\ndone';
  const js = compile(src);
  if (!js.includes('if (x < 10)')) throw new Error('missing if');
  if (js.includes('else'))         throw new Error('unexpected else');
});

test('throws on missing done', () => {
  try {
    compile('remember x as 1\nif x is 1\n  show "oops"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
