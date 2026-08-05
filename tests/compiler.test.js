// Tests for the Plain compiler

const path = require('path');
const { tokenize, TOKEN } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { generate } = require('../compiler/generator');
const { bundle, resolveDependencies } = require('../compiler/bundler');

// Helper: bundle a fixture file and return the generated JS
function bundleFixture(name) {
  return bundle(path.join(__dirname, 'fixtures', name));
}

// Helper: expect a bundle to throw with a message matching substr
function bundleThrows(label, fixtureName, substr) {
  test(label, () => {
    try {
      bundleFixture(fixtureName);
      throw new Error('expected an error but none was thrown');
    } catch (e) {
      if (!e.message.toLowerCase().includes(substr.toLowerCase())) {
        throw new Error(`Expected error to include "${substr}" but got: ${e.message}`);
      }
    }
  });
}

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

test('remember string compiles to let', () => {
  assert(compile('remember name as "Ayokunle"'), 'let name = "Ayokunle";');
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
    'let name = "Ayokunle";\nconsole.log(name);'
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

// ── Day 3: make / give / function calls ──────────────────────────────────────

console.log('\nDay 3 — make / give / function calls');

test('tokenizes make and give keywords', () => {
  const tokens = tokenize('make give');
  if (tokens[0].type !== TOKEN.MAKE) throw new Error('make wrong');
  if (tokens[1].type !== TOKEN.GIVE) throw new Error('give wrong');
});

test('tokenizes parentheses and comma', () => {
  const tokens = tokenize('( , )');
  if (tokens[0].type !== TOKEN.LPAREN) throw new Error('( wrong');
  if (tokens[1].type !== TOKEN.COMMA)  throw new Error(', wrong');
  if (tokens[2].type !== TOKEN.RPAREN) throw new Error(') wrong');
});

test('tokenizes plus', () => {
  const tokens = tokenize('+');
  if (tokens[0].type !== TOKEN.PLUS) throw new Error('+ wrong');
});

test('no-param function compiles to JS function', () => {
  const src = 'make greet()\n    show "Hello"\ndone';
  const js = compile(src);
  if (!js.includes('function greet()')) throw new Error('missing function declaration');
  if (!js.includes('console.log("Hello")')) throw new Error('missing body');
});

test('function with params compiles correctly', () => {
  const src = 'make add(a, b)\n    give a + b\ndone';
  const js = compile(src);
  if (!js.includes('function add(a, b)')) throw new Error('missing params');
  if (!js.includes('return a + b'))       throw new Error('missing return');
});

test('give compiles to return', () => {
  const src = 'make double(x)\n    give x + x\ndone';
  const js = compile(src);
  if (!js.includes('return x + x')) throw new Error('missing return');
});

test('bare function call compiles to call statement', () => {
  const src = 'make greet()\n    show "Hello"\ndone\ngreet()';
  const js = compile(src);
  if (!js.includes('greet();')) throw new Error('missing call statement');
});

test('function call as argument to show', () => {
  const src = 'make add(a, b)\n    give a + b\ndone\nshow add(5, 7)';
  const js = compile(src);
  if (!js.includes('console.log(add(5, 7))')) throw new Error('missing show call');
});

test('day3 example: greet and add end-to-end', () => {
  const src = [
    'make greet()',
    '    show "Hello"',
    'done',
    'greet()',
    'make add(a, b)',
    '    give a + b',
    'done',
    'show add(5, 7)',
  ].join('\n');
  const js = compile(src);
  if (!js.includes('function greet()'))   throw new Error('missing greet');
  if (!js.includes('greet();'))           throw new Error('missing greet call');
  if (!js.includes('function add(a, b)')) throw new Error('missing add');
  if (!js.includes('return a + b'))       throw new Error('missing return');
  if (!js.includes('console.log(add(5, 7))')) throw new Error('missing show add');
});

test('throws on missing done in function', () => {
  try {
    compile('make greet()\n    show "Hello"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── Error messages (Phase 2) ──────────────────────────────────────────────────

console.log('\nPhase 2 — Error messages');

function throws(name, src, expectedFragment) {
  test(name, () => {
    try {
      compile(src);
      throw new Error('should have thrown');
    } catch (e) {
      if (!e.message.toLowerCase().includes(expectedFragment.toLowerCase())) {
        throw new Error(
          `Expected message to include "${expectedFragment}", got:\n        ${e.message}`
        );
      }
    }
  });
}

// Missing "done"
throws(
  'missing done in if block mentions "done"',
  'remember x as 1\nif x is 1\n  show "oops"',
  'done'
);

throws(
  'missing done in otherwise block mentions "done"',
  'remember x as 1\nif x is 1\n  show "a"\notherwise\n  show "b"',
  'done'
);

throws(
  'missing done in function mentions "done"',
  'make greet()\n  show "Hello"',
  'done'
);

// Unexpected "otherwise"
throws(
  'unexpected "otherwise" at top level gives helpful message',
  'otherwise',
  'otherwise'
);

// Unknown / misspelled keyword with "did you mean"
throws(
  'misspelled "remembr" suggests "remember"',
  'remembr name as "Ayokunle"',
  'did you mean'
);

throws(
  'misspelled "shwo" suggests "show"',
  'shwo "Hello"',
  'did you mean'
);

// Missing identifier after "remember"
throws(
  'missing variable name after "remember"',
  'remember as 16',
  'variable name'
);

// Missing value after "as"
throws(
  'missing value after "as"',
  'remember age as',
  'value'
);

// Unterminated string
throws(
  'unterminated string',
  'show "hello',
  'unterminated'
);

// Invalid comparison
throws(
  'invalid comparison keyword gives helpful message',
  'remember x as 1\nif x bigger 1\n  show "a"\ndone',
  'comparison'
);

// Unexpected end of file (bare expression)
throws(
  'unexpected end of file in expression',
  'remember x as',
  'value'
);

// Invalid function declaration — missing name
throws(
  'missing function name after "make"',
  'make ()\n  show "hi"\ndone',
  'function name'
);

// Invalid function call — missing closing paren
throws(
  'missing closing paren in function call',
  'make greet()\n  show "hi"\ndone\ngreet(',
  '")"'
);

// Invalid return (give) — missing value
throws(
  'give with no value',
  'make f()\n  give\ndone',
  'value'
);

// ── v0.2 — Arrays ────────────────────────────────────────────────────────────

console.log('\nv0.2 — Arrays');

test('tokenizes [ and ]', () => {
  const tokens = tokenize('[ ]');
  if (tokens[0].type !== TOKEN.LBRACKET) throw new Error('[ wrong');
  if (tokens[1].type !== TOKEN.RBRACKET) throw new Error('] wrong');
});

test('array literal compiles to JS array', () => {
  const src = 'remember players as ["Haaland", "Foden", "Rodri"]';
  const js = compile(src);
  if (!js.includes('["Haaland", "Foden", "Rodri"]')) throw new Error('missing array literal');
});

test('array index compiles to bracket access', () => {
  const src = 'remember players as ["Haaland", "Foden"]\nshow players[0]';
  const js = compile(src);
  if (!js.includes('players[0]')) throw new Error('missing index access');
});

test('array index assignment (becomes) compiles correctly', () => {
  const src = 'remember players as ["Haaland", "Foden"]\nplayers[1] becomes "Palmer"';
  const js = compile(src);
  if (!js.includes('players[1] = "Palmer"')) throw new Error('missing index assignment');
});

test('length() compiles to .length', () => {
  const src = 'remember a as [1, 2, 3]\nshow length(a)';
  const js = compile(src);
  if (!js.includes('(a).length')) throw new Error('missing .length');
});

test('throws on unclosed array bracket', () => {
  try {
    compile('remember a as [1, 2');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.includes(']')) throw e;
  }
});

// ── v0.2 — Objects ───────────────────────────────────────────────────────────

console.log('\nv0.2 — Objects');

test('tokenizes dot', () => {
  const tokens = tokenize('user.name');
  if (tokens[1].type !== TOKEN.DOT) throw new Error('. wrong');
});

test('object literal compiles to JS object', () => {
  const src = 'remember user as\n  name is "Ayokunle"\n  age is 17\ndone';
  const js = compile(src);
  if (!js.includes('"name": "Ayokunle"')) throw new Error('missing name property');
  if (!js.includes('"age": 17'))          throw new Error('missing age property');
});

test('property access compiles to dot notation', () => {
  const src = 'remember user as\n  name is "Ayokunle"\ndone\nshow user.name';
  const js = compile(src);
  if (!js.includes('user.name')) throw new Error('missing member access');
});

test('property assignment (becomes) compiles correctly', () => {
  const src = 'remember user as\n  age is 17\ndone\nuser.age becomes 18';
  const js = compile(src);
  if (!js.includes('user.age = 18')) throw new Error('missing member assignment');
});

test('throws on unclosed object literal', () => {
  try {
    compile('remember user as\n  name is "Ayokunle"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.2 — becomes (reassignment) ────────────────────────────────────────────

console.log('\nv0.2 — becomes');

test('simple becomes compiles to assignment', () => {
  const src = 'remember age as 16\nage becomes 17';
  const js = compile(src);
  if (!js.includes('age = 17')) throw new Error('missing assignment');
});

test('remember compiles to let (supports reassignment)', () => {
  const src = 'remember x as 1';
  const js = compile(src);
  if (!js.includes('let x = 1')) throw new Error('expected let');
});

// ── v0.2 — Loops ─────────────────────────────────────────────────────────────

console.log('\nv0.2 — Loops');

test('tokenizes for / each / in keywords', () => {
  const tokens = tokenize('for each item in players');
  if (tokens[0].type !== TOKEN.FOR)        throw new Error('for wrong');
  if (tokens[1].type !== TOKEN.EACH)       throw new Error('each wrong');
  if (tokens[2].type !== TOKEN.IDENTIFIER) throw new Error('item wrong');
  if (tokens[3].type !== TOKEN.IN)         throw new Error('in wrong');
});

test('for each compiles to for-of loop', () => {
  const src = 'remember players as ["a", "b"]\nfor each player in players\n  show player\ndone';
  const js = compile(src);
  if (!js.includes('for (const player of players)')) throw new Error('missing for-of');
  if (!js.includes('console.log(player)'))           throw new Error('missing body');
});

test('throws on missing done in for each', () => {
  try {
    compile('remember a as [1]\nfor each x in a\n  show x');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.2 — While ─────────────────────────────────────────────────────────────

console.log('\nv0.2 — While');

test('tokenizes while keyword', () => {
  const tokens = tokenize('while');
  if (tokens[0].type !== TOKEN.WHILE) throw new Error('while wrong');
});

test('while loop compiles to JS while', () => {
  const src = 'remember age as 0\nwhile age is less than 18\n  age becomes age + 1\ndone';
  const js = compile(src);
  if (!js.includes('while (age < 18)'))   throw new Error('missing while condition');
  if (!js.includes('age = age + 1'))      throw new Error('missing body');
});

test('while with is compiles to === condition', () => {
  const src = 'remember x as 0\nwhile x is 0\n  x becomes 1\ndone';
  const js = compile(src);
  if (!js.includes('while (x === 0)')) throw new Error('missing while ===');
});

test('throws on missing done in while', () => {
  try {
    compile('remember x as 0\nwhile x is less than 5\n  x becomes x + 1');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.2 — Standard library ───────────────────────────────────────────────────

console.log('\nv0.2 — Standard library');

test('uppercase() compiles to toUpperCase()', () => {
  const js = compile('show uppercase("hello")');
  if (!js.includes('.toUpperCase()')) throw new Error('missing toUpperCase');
});

test('lowercase() compiles to toLowerCase()', () => {
  const js = compile('show lowercase("HELLO")');
  if (!js.includes('.toLowerCase()')) throw new Error('missing toLowerCase');
});

test('random() compiles to Math.random()', () => {
  const js = compile('show random()');
  if (!js.includes('Math.random()')) throw new Error('missing Math.random');
});

test('round() compiles to Math.round()', () => {
  const js = compile('show round(3)');
  if (!js.includes('Math.round(3)')) throw new Error('missing Math.round');
});

// ── v0.2 — Imports ────────────────────────────────────────────────────────────

console.log('\nv0.2 — Imports');

test('tokenizes use keyword', () => {
  const tokens = tokenize('use express');
  if (tokens[0].type !== TOKEN.USE) throw new Error('use wrong');
});

test('use express compiles to require', () => {
  const js = compile('use express');
  if (!js.includes("require('express')")) throw new Error('missing require express');
});

test('use fs compiles to require', () => {
  const js = compile('use fs');
  if (!js.includes("require('fs')")) throw new Error('missing require fs');
});

test('multiple known imports compile', () => {
  const js = compile('use express\nuse fs');
  if (!js.includes("require('express')")) throw new Error('missing express');
  if (!js.includes("require('fs')"))      throw new Error('missing fs');
});

// ── v0.3 — Runtime package system ────────────────────────────────────────────

console.log('\nv0.3 — Runtime packages');

test('use sqlite compiles to require better-sqlite3', () => {
  const js = compile('use sqlite');
  if (!js.includes("require('better-sqlite3')")) throw new Error('missing sqlite require');
});

test('use path compiles to require path', () => {
  const js = compile('use path');
  if (!js.includes("require('path')")) throw new Error('missing path require');
});

throws(
  'unknown package gives friendly error',
  'use math',
  'unknown package'
);

// ── v0.3 — Express runtime ───────────────────────────────────────────────────

console.log('\nv0.3 — Express runtime');

test('tokenizes when / someone / visits keywords', () => {
  const tokens = tokenize('when someone visits "/"');
  if (tokens[0].type !== TOKEN.WHEN)    throw new Error('when wrong');
  if (tokens[1].type !== TOKEN.SOMEONE) throw new Error('someone wrong');
  if (tokens[2].type !== TOKEN.VISITS)  throw new Error('visits wrong');
});

test('tokenizes listen / on keywords', () => {
  const tokens = tokenize('listen on 3000');
  if (tokens[0].type !== TOKEN.LISTEN) throw new Error('listen wrong');
  if (tokens[1].type !== TOKEN.ON)     throw new Error('on wrong');
});

test('tokenizes reply keyword', () => {
  const tokens = tokenize('reply');
  if (tokens[0].type !== TOKEN.REPLY) throw new Error('reply wrong');
});

test('tokenizes json keyword', () => {
  const tokens = tokenize('json');
  if (tokens[0].type !== TOKEN.JSON_KW) throw new Error('json wrong');
});

test('tokenizes serve / folder keywords', () => {
  const tokens = tokenize('serve folder "public"');
  if (tokens[0].type !== TOKEN.SERVE)  throw new Error('serve wrong');
  if (tokens[1].type !== TOKEN.FOLDER) throw new Error('folder wrong');
});

test('listen on port compiles to app.listen', () => {
  const src = 'listen on 3000\n  show "Running"\ndone';
  const js = compile(src);
  if (!js.includes('app.listen(3000')) throw new Error('missing app.listen');
  if (!js.includes('console.log("Running")')) throw new Error('missing body');
});

test('route compiles to app.get', () => {
  const src = 'when someone visits "/"\n  reply "Hello"\ndone';
  const js = compile(src);
  if (!js.includes('app.get("/",'))   throw new Error('missing app.get');
  if (!js.includes('(req, res) =>'))  throw new Error('missing callback');
  if (!js.includes('res.send("Hello")')) throw new Error('missing reply');
});

test('reply compiles to res.send', () => {
  const src = 'when someone visits "/"\n  reply "Hi"\ndone';
  const js = compile(src);
  if (!js.includes('res.send("Hi")')) throw new Error('missing res.send');
});

test('reply json compiles to res.json', () => {
  const src = 'when someone visits "/api"\n  reply json\n    status is "ok"\n  done\ndone';
  const js = compile(src);
  if (!js.includes('res.json({'))                  throw new Error('missing res.json');
  if (!js.includes('"status": "ok"'))              throw new Error('missing property');
});

test('serve folder compiles to app.use(express.static)', () => {
  const src = 'serve folder "public"';
  const js = compile(src);
  if (!js.includes('app.use(express.static("public"))')) throw new Error('missing static');
});

test('request identifier remaps to req inside route', () => {
  const src = 'when someone visits "/"\n  show request.method\ndone';
  const js = compile(src);
  if (!js.includes('req.method')) throw new Error('missing req.method');
});

test('response identifier remaps to res inside route', () => {
  const src = 'when someone visits "/"\n  show response\ndone';
  const js = compile(src);
  if (!js.includes('console.log(res)')) throw new Error('missing res');
});

test('multiple routes compile independently', () => {
  const src = [
    'when someone visits "/"\n  reply "Home"\ndone',
    'when someone visits "/about"\n  reply "About"\ndone',
  ].join('\n');
  const js = compile(src);
  if (!js.includes('app.get("/",'))      throw new Error('missing / route');
  if (!js.includes('app.get("/about",')) throw new Error('missing /about route');
});

test('throws on missing done in route', () => {
  try {
    compile('when someone visits "/"\n  reply "Hello"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.3 — SQLite runtime ────────────────────────────────────────────────────

console.log('\nv0.3 — SQLite runtime');

test('sqlite() call compiles to new Database()', () => {
  const src = 'use sqlite\nremember db as sqlite("app.db")';
  const js = compile(src);
  if (!js.includes('new Database("app.db")')) throw new Error('missing new Database');
});

// ── Summary ──────────────────────────────────────────────────────────────────

// ── v0.4.1 — Multi-file Package System ───────────────────────────────────────

console.log('\nv0.4.1 — Multi-file imports');

test('tokenizes import keyword', () => {
  const tokens = tokenize('import "./math.pln"');
  if (tokens[0].type !== TOKEN.IMPORT) throw new Error('import token wrong');
  if (tokens[1].type !== TOKEN.STRING) throw new Error('path token wrong');
  if (tokens[1].value !== './math.pln') throw new Error('path value wrong');
});

test('import parses to ImportStatement', () => {
  const tokens = tokenize('import "./math.pln"');
  const ast    = parse(tokens);
  const node   = ast.body[0];
  if (node.type !== 'ImportStatement')   throw new Error('wrong node type');
  if (node.path !== './math.pln')        throw new Error('wrong path');
});

test('ImportStatement generates no output', () => {
  const js = generate(parse(tokenize('import "./math.pln"')));
  if (js.trim() !== '') throw new Error('import should generate empty string');
});

test('simple import — imported file compiles first', () => {
  const js = bundleFixture('uses_math.pln');
  // PI must be declared before it is used in show
  const piIdx   = js.indexOf('let PI');
  const showIdx = js.indexOf('console.log(PI)');
  if (piIdx === -1)     throw new Error('PI not declared');
  if (showIdx === -1)   throw new Error('show PI missing');
  if (piIdx > showIdx)  throw new Error('PI declared after show — wrong order');
});

test('simple import — output contains imported code', () => {
  const js = bundleFixture('uses_math.pln');
  if (!js.includes('let PI = 3.14'))  throw new Error('PI missing');
  if (!js.includes('let TAU = 6.28')) throw new Error('TAU missing');
});

test('two imports — both files included in output', () => {
  const js = bundleFixture('uses_both.pln');
  if (!js.includes('let PI'))        throw new Error('PI missing');
  if (!js.includes('function double')) throw new Error('double missing');
});

test('nested imports — deepest dependency compiled first', () => {
  const js = bundleFixture('nested_a.pln');
  // nested_c defines deepValue, must appear before nested_b and nested_a output
  const deepIdx = js.indexOf('let deepValue');
  const aIdx    = js.indexOf('"a loaded"');
  const bIdx    = js.indexOf('"b loaded"');
  if (deepIdx === -1) throw new Error('deepValue missing');
  if (bIdx === -1)    throw new Error('b loaded missing');
  if (aIdx === -1)    throw new Error('a loaded missing');
  if (deepIdx > bIdx) throw new Error('deepValue should come before b');
  if (bIdx > aIdx)    throw new Error('b should come before a');
});

test('duplicate imports — code included exactly once', () => {
  const js = bundleFixture('duplicate_a.pln');
  // PI should appear only once in the output
  const firstIdx  = js.indexOf('let PI');
  const secondIdx = js.indexOf('let PI', firstIdx + 1);
  if (firstIdx === -1)  throw new Error('PI not declared at all');
  if (secondIdx !== -1) throw new Error('PI declared more than once — duplicate import not de-duped');
});

test('diamond imports — shared file included exactly once', () => {
  const js = bundleFixture('diamond_top.pln');
  const firstIdx  = js.indexOf('let sharedValue');
  const secondIdx = js.indexOf('let sharedValue', firstIdx + 1);
  if (firstIdx === -1)  throw new Error('sharedValue missing');
  if (secondIdx !== -1) throw new Error('sharedValue declared twice — diamond not handled');
  if (!js.includes('"left"'))  throw new Error('left missing');
  if (!js.includes('"right"')) throw new Error('right missing');
  if (!js.includes('"top"'))   throw new Error('top missing');
});

bundleThrows(
  'circular imports give friendly error',
  'circular_a.pln',
  'circular'
);

bundleThrows(
  'circular import error mentions the file name',
  'circular_a.pln',
  'circular_a'
);

test('missing imported file gives friendly error', () => {
  const tokens = tokenize('import "./does_not_exist.pln"');
  const ast = parse(tokens);
  // Write a temp entry file referencing a non-existent file
  const tmpPath = path.join(__dirname, 'fixtures', 'missing_import_entry.pln');
  require('fs').writeFileSync(tmpPath, 'import "./no_such_file_xyz.pln"\n');
  try {
    bundle(tmpPath);
    require('fs').unlinkSync(tmpPath);
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    require('fs').unlinkSync(tmpPath);
    if (!e.message.toLowerCase().includes('cannot find')) {
      throw new Error(`Expected "cannot find" in error but got: ${e.message}`);
    }
  }
});

test('import path preserved correctly in AST', () => {
  const ast = parse(tokenize('import "./sub/module.pln"'));
  if (ast.body[0].path !== './sub/module.pln') throw new Error('wrong path');
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
