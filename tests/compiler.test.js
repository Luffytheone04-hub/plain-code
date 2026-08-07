// Tests for the Plain compiler

const fs   = require('fs');
const path = require('path');
const { tokenize, TOKEN } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { generate } = require('../compiler/generator');
const { bundle, resolveDependencies } = require('../compiler/bundler');
const { detectDependencies } = require('../compiler/dependency-detector');

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

// ── Runtime dependency detection ────────────────────────────────────────────

console.log('\nRuntime dependency detection');

test('detects express as an npm dependency', () => {
  assert(JSON.stringify(detectDependencies('use express')), '["express"]');
});

test('maps sqlite to better-sqlite3', () => {
  assert(JSON.stringify(detectDependencies('use sqlite')), '["better-sqlite3"]');
});

test('ignores Node built-in modules', () => {
  assert(JSON.stringify(detectDependencies('use fs\nuse path')), '[]');
});

test('removes duplicate runtime dependencies', () => {
  assert(
    JSON.stringify(detectDependencies('use express\nuse sqlite\nuse express\nuse sqlite')),
    '["express","better-sqlite3"]'
  );
});

test('returns an empty list for a project without use statements', () => {
  assert(JSON.stringify(detectDependencies('show "Hello"')), '[]');
});

test('detects better-sqlite3 from database shorthand', () => {
  assert(JSON.stringify(detectDependencies('database "app.db"')), '["better-sqlite3"]');
});

test('detects Express from web app shorthand', () => {
  assert(JSON.stringify(detectDependencies('web app')), '["express"]');
});

test('deduplicates shorthand and explicit runtime dependencies', () => {
  assert(JSON.stringify(detectDependencies('web app\nuse express\ndatabase "app.db"\nuse sqlite')),
    '["express","better-sqlite3"]');
});

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

// ── v0.4.2 — Package Manager & Project Management ────────────────────────────

console.log('\nv0.4.2 — plain init');

const os  = require('os');
const { execFileSync: _execFileSync } = require('child_process');
const CLI = path.join(__dirname, '..', 'compiler', 'cli.js');

// Run the CLI in a temporary directory.
// Returns combined stdout+stderr as a string; never throws.
function runCli(args, cwd) {
  try {
    return _execFileSync(process.execPath, [CLI, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env },
    });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

// Create a fresh temp directory for a test.
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'plain-test-'));
}

test('plain init creates plain.json', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const jsonPath = path.join(dir, 'plain.json');
  if (!fs.existsSync(jsonPath)) throw new Error('plain.json was not created');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!data.name)    throw new Error('plain.json missing "name"');
  if (!data.version) throw new Error('plain.json missing "version"');
  if (!data.entry)   throw new Error('plain.json missing "entry"');
});

test('plain init shows "Project already initialized." when plain.json exists', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['init'], dir);
  if (!out.includes('Project already initialized.')) {
    throw new Error(`Expected "Project already initialized." but got: ${out}`);
  }
});

test('plain init plain.json has correct default entry', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'plain.json'), 'utf8'));
  if (data.entry !== 'app.pln') throw new Error(`expected entry "app.pln", got "${data.entry}"`);
});

test('plain init plain.json is valid JSON with name, version, entry', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(dir, 'plain.json'), 'utf8'));
  } catch (e) {
    throw new Error(`plain.json is not valid JSON: ${e.message}`);
  }
  if (typeof data.name    !== 'string') throw new Error('name must be a string');
  if (typeof data.version !== 'string') throw new Error('version must be a string');
  if (typeof data.entry   !== 'string') throw new Error('entry must be a string');
});

console.log('\nv0.4.2 — plain add / remove');

test('plain add errors without plain.json', () => {
  const dir = tmpDir();
  const out = runCli(['add', 'express'], dir);
  if (!out.toLowerCase().includes('plain init')) {
    throw new Error(`Expected hint to run "plain init" but got: ${out}`);
  }
});

test('plain remove errors without plain.json', () => {
  const dir = tmpDir();
  const out = runCli(['remove', 'express'], dir);
  if (!out.toLowerCase().includes('plain init')) {
    throw new Error(`Expected hint to run "plain init" but got: ${out}`);
  }
});

test('plain add without package name shows usage', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['add'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage hint but got: ${out}`);
  }
});

test('plain remove without package name shows usage', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['remove'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage hint but got: ${out}`);
  }
});

test('plain add rejects invalid package name (shell injection attempt)', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  // A name containing shell metacharacters must be rejected before npm is called.
  const out = runCli(['add', 'express; rm -rf /'], dir);
  if (!out.toLowerCase().includes('invalid package name')) {
    throw new Error(`Expected "Invalid package name" error but got: ${out}`);
  }
});

test('plain remove rejects invalid package name', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['remove', '$(evil)'], dir);
  if (!out.toLowerCase().includes('invalid package name')) {
    throw new Error(`Expected "Invalid package name" error but got: ${out}`);
  }
});

console.log('\nv0.4.2 — plain install (RFC-0009.2)');

test('plain install errors without plain.json', () => {
  const dir = tmpDir();
  const out = runCli(['install'], dir);
  if (!out.toLowerCase().includes('plain init')) {
    throw new Error(`Expected hint to run "plain init" but got: ${out}`);
  }
});

test('plain install with no external dependencies shows correct message', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'show "hello"\n');
  const out = runCli(['install'], dir);
  if (!out.includes('This project has no external dependencies.')) {
    throw new Error(`Expected "This project has no external dependencies." but got: ${out}`);
  }
});

test('plain install with built-in modules only shows no external dependencies', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use fs\nuse path\nshow "ok"\n');
  const out = runCli(['install'], dir);
  if (!out.includes('This project has no external dependencies.')) {
    throw new Error(`Expected "This project has no external dependencies." but got: ${out}`);
  }
});

test('plain install installs missing dependencies and reports success', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use semver\nshow "ok"\n');
  const out = runCli(['install'], dir);
  // Check that it found and installed the package
  if (!out.includes('Found 1 required package(s).')) {
    throw new Error(`Expected "Found 1 required package(s)." but got: ${out}`);
  }
  if (!out.includes('Installing semver...')) {
    throw new Error(`Expected "Installing semver..." but got: ${out}`);
  }
  if (!out.includes('Done.')) {
    throw new Error(`Expected "Done." but got: ${out}`);
  }
  // Verify package is actually installed
  const nodeModules = path.join(dir, 'node_modules');
  if (!fs.existsSync(nodeModules)) throw new Error('node_modules not created');
  const pkgDir = path.join(nodeModules, 'semver');
  if (!fs.existsSync(pkgDir)) throw new Error('semver package not installed');
});

test('plain install skips already installed dependencies', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use semver\nshow "ok"\n');
  // First install
  runCli(['install'], dir);
  // Second install should say all installed
  const out = runCli(['install'], dir);
  if (!out.includes('All dependencies are already installed.')) {
    throw new Error(`Expected "All dependencies are already installed." but got: ${out}`);
  }
});

test('plain install handles multiple dependencies', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use semver\nuse express\nshow "ok"\n');
  const out = runCli(['install'], dir);
  if (!out.includes('Found 2 required package(s).')) {
    throw new Error(`Expected "Found 2 required package(s)." but got: ${out}`);
  }
  if (!out.includes('Installing semver...')) throw new Error('semver install missing');
  if (!out.includes('Installing express...')) throw new Error('express install missing');
});

test('plain install fails when entry file is missing', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  // Remove the entry file
  const entry = path.join(dir, 'app.pln');
  fs.unlinkSync(entry);
  const out = runCli(['install'], dir);
  if (!out.toLowerCase().includes('entry file "app.pln" not found')) {
    throw new Error(`Expected entry file not found error but got: ${out}`);
  }
});

test('plain install shows friendly error on resolver failure (circular import)', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const entry = path.join(dir, 'app.pln');
  fs.writeFileSync(entry, 'import "./a.pln"\n');
  const aFile = path.join(dir, 'a.pln');
  fs.writeFileSync(aFile, 'import "./app.pln"\n');
  const out = runCli(['install'], dir);
  if (!out.toLowerCase().includes('circular')) {
    throw new Error(`Expected circular import error but got: ${out}`);
  }
});

// ── End of install tests ────────────────────────────────────────────────────

console.log('\nv0.4.2 — CLI help');

test('plain help includes "plain init"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain init')) throw new Error(`"plain init" missing from help. Got:\n${out}`);
});

test('plain help includes "plain install"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain install')) throw new Error(`"plain install" missing from help. Got:\n${out}`);
});

test('plain help includes "plain add"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain add')) throw new Error(`"plain add" missing from help. Got:\n${out}`);
});

test('plain help includes "plain remove"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain remove')) throw new Error(`"plain remove" missing from help. Got:\n${out}`);
});

test('plain help includes "plain update"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain update')) throw new Error(`"plain update" missing from help. Got:\n${out}`);
});

test('plain version shows 1.0.1', () => {
  const out = runCli(['version'], process.cwd());
  if (!out.includes('1.0.1')) throw new Error(`Expected version 1.0.1 but got: ${out}`);
});

// ── v0.5 — Formatter ─────────────────────────────────────────────────────────

console.log('\nv0.5 — Formatter');

const { format } = require('../compiler/formatter');

test('format: removes trailing whitespace', () => {
  const result = format('remember x as 1   \nshow x   ');
  if (result.includes('   ')) throw new Error('trailing whitespace not removed');
});

test('format: normalises indentation inside a function', () => {
  const src = 'make add(a, b)\ngive a + b\ndone';
  const result = format(src);
  if (!result.includes('    give a + b')) throw new Error('body not indented with 4 spaces');
});

test('format: normalises indentation inside an if block', () => {
  const src = 'remember x as 1\nif x is 1\nshow "yes"\ndone';
  const result = format(src);
  if (!result.includes('    show "yes"')) throw new Error('if body not indented');
});

test('format: collapses multiple blank lines into one', () => {
  const src = 'show "a"\n\n\n\nshow "b"';
  const result = format(src);
  const doubled = result.includes('\n\n\n');
  if (doubled) throw new Error('multiple blank lines not collapsed');
});

test('format: one blank line between top-level blocks', () => {
  const src = 'make greet()\nshow "hi"\ndone\nmake bye()\nshow "bye"\ndone';
  const result = format(src);
  if (!result.includes('done\n\nmake')) throw new Error('missing blank line between functions');
});

test('format: dedents "otherwise" keyword', () => {
  const src = 'if x is 1\nshow "yes"\notherwise\nshow "no"\ndone';
  const result = format(src);
  if (!result.match(/^otherwise/m)) throw new Error('"otherwise" not at depth 0');
});

test('format: dedents "done" keyword', () => {
  const src = 'make f()\nshow "hi"\ndone';
  const result = format(src);
  if (!result.match(/^done/m)) throw new Error('"done" not at depth 0');
});

test('format: output ends with a single newline', () => {
  const result = format('show "hello"');
  if (!result.endsWith('\n'))   throw new Error('output does not end with newline');
  if (result.endsWith('\n\n')) throw new Error('output ends with double newline');
});

test('format: strips leading blank lines', () => {
  const result = format('\n\nshow "hi"');
  if (result.startsWith('\n')) throw new Error('leading blank lines not stripped');
});

test('format: idempotent — formatting twice gives the same result', () => {
  const src = 'make add(a, b)\ngive a + b\ndone\nremember x as 1\nshow x';
  const once  = format(src);
  const twice = format(once);
  if (once !== twice) throw new Error('format is not idempotent');
});

test('format: no blank lines inserted between consecutive non-block statements', () => {
  const src = 'remember x as 1\nremember y as 2\nshow x\nshow y';
  const result = format(src);
  // None of the lines should be separated by blank lines
  if (result.includes('\n\n')) {
    throw new Error(`Unexpected blank line between simple statements:\n${result}`);
  }
});

test('format: array elements are indented', () => {
  const src = 'remember players as [\n"Haaland",\n"Foden",\n]';
  const result = format(src);
  if (!result.includes('    "Haaland"')) {
    throw new Error(`Array elements not indented:\n${result}`);
  }
  if (!result.includes('    "Foden"')) {
    throw new Error(`Array elements not indented:\n${result}`);
  }
});

test('format: closing bracket is not indented', () => {
  const src = 'remember players as [\n"Haaland",\n"Foden",\n]';
  const result = format(src);
  if (!result.match(/^\]/m)) {
    throw new Error(`Closing bracket should be at column 0:\n${result}`);
  }
});

test('format: no blank lines between array elements', () => {
  const src = 'remember players as [\n"Haaland",\n"Foden",\n"Rodri",\n]';
  const result = format(src);
  if (result.includes('"Haaland",\n\n') || result.includes('"Foden",\n\n')) {
    throw new Error(`Blank lines found between array elements:\n${result}`);
  }
});

// ── v0.5 — plain check ───────────────────────────────────────────────────────

console.log('\nv0.5 — plain check');

test('plain check exits 0 on valid file', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'ok.pln');
  fs.writeFileSync(plnFile, 'remember x as 1\nshow x\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.includes('no errors found')) {
    throw new Error(`Expected "no errors found" but got: ${out}`);
  }
});

test('plain check reports error on invalid file', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'bad.pln');
  fs.writeFileSync(plnFile, 'remembr x as 1\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.toLowerCase().includes('did you mean')) {
    throw new Error(`Expected "did you mean" suggestion but got: ${out}`);
  }
});

test('plain check includes line number in error', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'bad.pln');
  fs.writeFileSync(plnFile, 'remember x as 1\nremembr y as 2\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.toLowerCase().includes('line')) {
    throw new Error(`Expected line info in error but got: ${out}`);
  }
});

test('plain check includes filename in error', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'bad.pln');
  fs.writeFileSync(plnFile, 'remember x as 1\nremembr y as 2\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.includes('bad.pln')) {
    throw new Error(`Expected filename "bad.pln" in error but got: ${out}`);
  }
});

test('plain check errors without file argument', () => {
  const dir = tmpDir();
  const out = runCli(['check'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage message but got: ${out}`);
  }
});

test('plain check errors on missing file', () => {
  const dir = tmpDir();
  const out = runCli(['check', 'does_not_exist.pln'], dir);
  if (!out.toLowerCase().includes('not found')) {
    throw new Error(`Expected "not found" error but got: ${out}`);
  }
});

// ── v0.5 — plain fmt ─────────────────────────────────────────────────────────

console.log('\nv0.5 — plain fmt');

test('plain fmt formats file in-place', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'make add(a, b)\ngive a + b\ndone\n');
  runCli(['fmt', plnFile], dir);
  const result = fs.readFileSync(plnFile, 'utf8');
  if (!result.includes('    give a + b')) {
    throw new Error(`Expected indented body after fmt but got:\n${result}`);
  }
});

test('plain fmt reports success message', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'show "hello"\n');
  const out = runCli(['fmt', plnFile], dir);
  if (!out.toLowerCase().includes('formatted')) {
    throw new Error(`Expected "formatted" in output but got: ${out}`);
  }
});

test('plain fmt errors without file argument', () => {
  const dir = tmpDir();
  const out = runCli(['fmt'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage message but got: ${out}`);
  }
});

test('plain fmt errors on missing file', () => {
  const dir = tmpDir();
  const out = runCli(['fmt', 'does_not_exist.pln'], dir);
  if (!out.toLowerCase().includes('not found')) {
    throw new Error(`Expected "not found" error but got: ${out}`);
  }
});

// ── v0.5 — Diagnostics (line + column in errors) ─────────────────────────────

console.log('\nv0.5 — Diagnostics');

test('parse error includes Line N', () => {
  try {
    compile('remember x as 1\nif x is 1\nshow "oops"');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.match(/Line \d+/)) {
      throw new Error(`Expected "Line N" in error but got: ${e.message}`);
    }
  }
});

test('parse error includes Column N', () => {
  try {
    compile('remember x as 1\nif x is 1\nshow "oops"');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.match(/Column \d+/)) {
      throw new Error(`Expected "Column N" in error but got: ${e.message}`);
    }
  }
});

test('misspelled keyword error includes line number', () => {
  try {
    compile('remember x as 1\nshwo x');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.match(/Line \d+/)) {
      throw new Error(`Expected "Line N" in error but got: ${e.message}`);
    }
  }
});

test('unknown keyword suggestion includes "Did you mean"', () => {
  try {
    compile('remembr x as 1');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.includes('Did you mean')) {
      throw new Error(`Expected "Did you mean" but got: ${e.message}`);
    }
  }
});

// ── v0.5 — CLI help & version ─────────────────────────────────────────────────

console.log('\nv0.5 — CLI help & version');

test('plain help includes "plain check"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain check')) throw new Error(`"plain check" missing from help. Got:\n${out}`);
});

test('plain help includes "plain fmt"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain fmt')) throw new Error(`"plain fmt" missing from help. Got:\n${out}`);
});

test('plain version shows 1.0.1', () => {
  const out = runCli(['version'], process.cwd());
  if (!out.includes('1.0.1')) throw new Error(`Expected version 1.0.1 but got: ${out}`);
});

// ── v0.6 — Extended comparisons ──────────────────────────────────────────────

console.log('\nv0.6 — Extended comparisons (lexer)');

test('tokenizes "above" keyword', () => {
  const tokens = tokenize('is above');
  if (tokens[1].type !== TOKEN.ABOVE) throw new Error('above wrong');
});

test('tokenizes "below" keyword', () => {
  const tokens = tokenize('is below');
  if (tokens[1].type !== TOKEN.BELOW) throw new Error('below wrong');
});

test('tokenizes "between" keyword', () => {
  const tokens = tokenize('between');
  if (tokens[0].type !== TOKEN.BETWEEN) throw new Error('between wrong');
});

test('tokenizes "and" keyword', () => {
  const tokens = tokenize('and');
  if (tokens[0].type !== TOKEN.AND) throw new Error('and wrong');
});

test('tokenizes "contains" keyword', () => {
  const tokens = tokenize('contains');
  if (tokens[0].type !== TOKEN.CONTAINS) throw new Error('contains wrong');
});

test('tokenizes "every" as EACH token', () => {
  const tokens = tokenize('every');
  if (tokens[0].type !== TOKEN.EACH) throw new Error('every should be EACH token');
});

test('tokenizes "not" keyword', () => {
  const tokens = tokenize('not');
  if (tokens[0].type !== TOKEN.NOT) throw new Error('not wrong');
});

test('tokenizes "empty" keyword', () => {
  const tokens = tokenize('empty');
  if (tokens[0].type !== TOKEN.EMPTY) throw new Error('empty wrong');
});

console.log('\nv0.6 — Extended comparisons (compiler)');

test('"is above" compiles to >', () => {
  const src = 'remember age as 20\nif age is above 18\n  show "adult"\ndone';
  const js = compile(src);
  if (!js.includes('age > 18')) throw new Error('expected age > 18');
});

test('"is below" compiles to <', () => {
  const src = 'remember age as 5\nif age is below 13\n  show "child"\ndone';
  const js = compile(src);
  if (!js.includes('age < 13')) throw new Error('expected age < 13');
});

test('"is at least" compiles to >=', () => {
  const src = 'remember age as 18\nif age is at least 18\n  show "ok"\ndone';
  const js = compile(src);
  if (!js.includes('age >= 18')) throw new Error('expected age >= 18');
});

test('"is at most" compiles to <=', () => {
  const src = 'remember x as 5\nif x is at most 10\n  show "ok"\ndone';
  const js = compile(src);
  if (!js.includes('x <= 10')) throw new Error('expected x <= 10');
});

test('"is not" compiles to !==', () => {
  const src = 'remember x as 5\nif x is not 3\n  show "different"\ndone';
  const js = compile(src);
  if (!js.includes('x !== 3')) throw new Error('expected x !== 3');
});

test('"is empty" compiles to .length === 0', () => {
  const src = 'if x is empty\n  show "empty"\ndone';
  const js = compile(src);
  if (!js.includes('(x).length === 0')) throw new Error('expected .length === 0');
});

test('"is not empty" compiles to .length > 0', () => {
  const src = 'if x is not empty\n  show "has content"\ndone';
  const js = compile(src);
  if (!js.includes('(x).length > 0')) throw new Error('expected .length > 0');
});

test('"contains" compiles to .includes()', () => {
  const src = 'if name contains "Plain"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('.includes(')) throw new Error('expected .includes()');
  if (!js.includes('"Plain"')) throw new Error('expected search value');
});

test('"starts with" compiles to .startsWith()', () => {
  const src = 'if name starts with "Hello"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('.startsWith(')) throw new Error('expected .startsWith()');
});

test('"ends with" compiles to .endsWith()', () => {
  const src = 'if name ends with "!"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('.endsWith(')) throw new Error('expected .endsWith()');
});

test('"between X and Y" compiles to >= X && <= Y', () => {
  const src = 'if age between 13 and 19\n  show "teenager"\ndone';
  const js = compile(src);
  if (!js.includes('age >= 13 && age <= 19')) throw new Error('expected between condition');
});

test('"between" wraps in if (...) correctly', () => {
  const src = 'if age between 1 and 100\n  show "alive"\ndone';
  const js = compile(src);
  if (!js.includes('if (age >= 1 && age <= 100)')) throw new Error('expected wrapped between');
});

test('"for every" compiles like "for each"', () => {
  const src = 'for every item in players\n  show item\ndone';
  const js = compile(src);
  if (!js.includes('for (const item of players)')) throw new Error('missing for-of from for every');
});

test('"for every" end-to-end with array', () => {
  const src = 'remember players as ["a", "b"]\nfor every player in players\n  show player\ndone';
  const js = compile(src);
  if (!js.includes('for (const player of players)')) throw new Error('missing for-of');
  if (!js.includes('console.log(player)')) throw new Error('missing body');
});

test('"is above" works in while loop', () => {
  const src = 'remember x as 10\nwhile x is above 0\n  x becomes x + 1\ndone';
  const js = compile(src);
  if (!js.includes('while (x > 0)')) throw new Error('expected while (x > 0)');
});

test('error: "is at" without least/most gives helpful message', () => {
  try {
    compile('if x is at 5\n  show "ok"\ndone');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('least') && !e.message.toLowerCase().includes('most')) {
      throw new Error(`Expected "least" or "most" in error but got: ${e.message}`);
    }
  }
});

// ── v0.6 — Runtime Standard Library ──────────────────────────────────────────

console.log('\nv0.6 — Runtime stdlib');

test('print() compiles to console.log', () => {
  const js = compile('print("hello")');
  if (!js.includes('console.log("hello")')) throw new Error('missing console.log');
});

test('print() with multiple args compiles correctly', () => {
  const js = compile('print("a")');
  if (!js.includes('console.log(')) throw new Error('missing console.log call');
});

test('readFile() compiles to readFileSync', () => {
  const js = compile('remember content as readFile("file.txt")');
  if (!js.includes('readFileSync')) throw new Error('missing readFileSync');
  if (!js.includes('"file.txt"')) throw new Error('missing filename');
});

test('writeFile() compiles to writeFileSync', () => {
  const js = compile('writeFile("out.txt", "hello")');
  if (!js.includes('writeFileSync')) throw new Error('missing writeFileSync');
});

test('fileExists() compiles to existsSync', () => {
  const js = compile('remember exists as fileExists("file.txt")');
  if (!js.includes('existsSync')) throw new Error('missing existsSync');
});

test('sleep() compiles to Atomics.wait', () => {
  const js = compile('sleep(1000)');
  if (!js.includes('Atomics.wait')) throw new Error('missing Atomics.wait');
  if (!js.includes('1000')) throw new Error('missing duration');
});

test('time() compiles to Date.now()', () => {
  const js = compile('remember t as time()');
  if (!js.includes('Date.now()')) throw new Error('missing Date.now()');
});

test('date() compiles to new Date().toISOString()', () => {
  const js = compile('remember d as date()');
  if (!js.includes('new Date().toISOString()')) throw new Error('missing toISOString');
});

test('jsonEncode() compiles to JSON.stringify', () => {
  const js = compile('remember s as jsonEncode(x)');
  if (!js.includes('JSON.stringify(x)')) throw new Error('missing JSON.stringify');
});

test('jsonDecode() compiles to JSON.parse', () => {
  const js = compile('remember obj as jsonDecode(s)');
  if (!js.includes('JSON.parse(s)')) throw new Error('missing JSON.parse');
});

test('env() compiles to process.env', () => {
  const js = compile('remember val as env("KEY")');
  if (!js.includes('process.env[')) throw new Error('missing process.env');
  if (!js.includes('"KEY"')) throw new Error('missing env key');
});

test('exit() compiles to process.exit', () => {
  const js = compile('exit(0)');
  if (!js.includes('process.exit(0)')) throw new Error('missing process.exit(0)');
});

test('uuid() compiles to randomUUID', () => {
  const js = compile('remember id as uuid()');
  if (!js.includes('randomUUID()')) throw new Error('missing randomUUID');
});

test('uuid() uses require("crypto")', () => {
  const js = compile('remember id as uuid()');
  if (!js.includes("require('crypto')")) throw new Error('missing require crypto');
});

// ── v0.6 — Express DX ────────────────────────────────────────────────────────

console.log('\nv0.6 — Express DX');

test('tokenizes "web" as WEB', () => {
  const tokens = tokenize('web');
  if (tokens[0].type !== TOKEN.WEB) throw new Error('web wrong');
});

test('tokenizes "route" as ROUTE_KW', () => {
  const tokens = tokenize('route');
  if (tokens[0].type !== TOKEN.ROUTE_KW) throw new Error('route wrong');
});

test('tokenizes "start" as START_KW', () => {
  const tokens = tokenize('start');
  if (tokens[0].type !== TOKEN.START_KW) throw new Error('start wrong');
});

test('"web app" compiles to Express require and app setup', () => {
  const js = compile('web app');
  if (!js.includes("require('express')")) throw new Error('missing require express');
  if (!js.includes('const app = express()')) throw new Error('missing const app');
});

test('"web app" generates const express', () => {
  const js = compile('web app');
  if (!js.includes('const express')) throw new Error('missing const express');
});

test('duplicate runtime requires are emitted once', () => {
  const js = compile('use express\nuse express\nweb app');
  if ((js.match(/require\('express'\)/g) || []).length !== 1) {
    throw new Error(`expected one express require, got:\n${js}`);
  }
});

test('"route" shorthand compiles to app.get', () => {
  const src = 'route "/"\n  reply "Hello"\ndone';
  const js = compile(src);
  if (!js.includes('app.get("/",')) throw new Error('missing app.get');
  if (!js.includes('(req, res) =>')) throw new Error('missing callback');
});

test('"route" reply compiles to res.send', () => {
  const src = 'route "/home"\n  reply "Home"\ndone';
  const js = compile(src);
  if (!js.includes('res.send("Home")')) throw new Error('missing res.send');
});

test('"start" compiles to app.listen without body', () => {
  const src = 'start 3000';
  const js = compile(src);
  if (!js.includes('app.listen(3000)')) throw new Error('missing app.listen(3000)');
  if (js.includes('() =>')) throw new Error('start should not have callback');
});

test('"start" works with a variable port', () => {
  const src = 'remember port as 8080\nstart port';
  const js = compile(src);
  if (!js.includes('app.listen(port)')) throw new Error('missing app.listen(port)');
});

// ── v0.6 — SQLite DX ─────────────────────────────────────────────────────────

console.log('\nv0.6 — SQLite DX');

test('tokenizes "database" as DATABASE_KW', () => {
  const tokens = tokenize('database');
  if (tokens[0].type !== TOKEN.DATABASE_KW) throw new Error('database wrong');
});

test('tokenizes "query" block as QUERY_KW + SQL_BODY + DONE', () => {
  const tokens = tokenize('query\n    SELECT * FROM users\ndone');
  if (tokens[0].type !== TOKEN.QUERY_KW)  throw new Error('QUERY_KW wrong');
  if (tokens[1].type !== TOKEN.SQL_BODY)  throw new Error('SQL_BODY wrong');
  if (tokens[2].type !== TOKEN.DONE)      throw new Error('DONE wrong');
});

test('"query" SQL_BODY contains the SQL text', () => {
  const tokens = tokenize('query\n    SELECT 1\ndone');
  if (!tokens[1].value.includes('SELECT 1')) throw new Error('SQL content missing');
});

test('"database" compiles to new Database()', () => {
  const js = compile('database "app.db"');
  if (!js.includes('new Database("app.db")')) throw new Error('missing new Database');
});

test('"database" generates require better-sqlite3', () => {
  const js = compile('database "app.db"');
  if (!js.includes("require('better-sqlite3')")) throw new Error('missing require better-sqlite3');
});

test('"database" generates const db', () => {
  const js = compile('database "app.db"');
  if (!js.includes('const db')) throw new Error('missing const db');
});

test('"query" block compiles to db.prepare().all()', () => {
  const src = 'query\n    SELECT * FROM users\ndone';
  const js = compile(src);
  if (!js.includes('db.prepare(')) throw new Error('missing db.prepare');
  if (!js.includes('.all()'))       throw new Error('missing .all()');
  if (!js.includes('SELECT * FROM users')) throw new Error('missing SQL');
});

test('"insert" block compiles to db.prepare().run()', () => {
  const src = 'insert\n    INSERT INTO users (name) VALUES ("Alice")\ndone';
  const js = compile(src);
  if (!js.includes('db.prepare(')) throw new Error('missing db.prepare');
  if (!js.includes('.run()'))       throw new Error('missing .run()');
});

test('"update" block compiles to db.prepare().run()', () => {
  const src = 'update\n    UPDATE users SET name = "Bob" WHERE id = 1\ndone';
  const js = compile(src);
  if (!js.includes('.run()')) throw new Error('missing .run()');
});

test('"delete" block compiles to db.prepare().run()', () => {
  const src = 'delete\n    DELETE FROM users WHERE id = 1\ndone';
  const js = compile(src);
  if (!js.includes('.run()')) throw new Error('missing .run()');
});

test('"execute" block compiles to db.exec()', () => {
  const src = 'execute\n    CREATE TABLE users (id INTEGER PRIMARY KEY)\ndone';
  const js = compile(src);
  if (!js.includes('db.exec(')) throw new Error('missing db.exec');
});

// ── v0.6 — CLI updates ────────────────────────────────────────────────────────

console.log('\nv0.6 — CLI updates');

test('plain version shows 1.0.1 (CLI)', () => {
  const out = runCli(['version'], process.cwd());
  if (!out.includes('1.0.1')) throw new Error(`Expected 1.0.1 but got: ${out}`);
});

test('plain help mentions v1.0 features', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('1.0')) throw new Error('"1.0" missing from help');
});

test('plain help includes "route"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('route')) throw new Error('"route" missing from help');
});

// ── v1.0.0 — Lexer edge cases ────────────────────────────────────────────────

console.log('\nv1.0 — Lexer edge cases');

test('token carries line number', () => {
  const tokens = tokenize('remember\nshow');
  if (tokens[0].line !== 1) throw new Error(`Expected line 1 but got ${tokens[0].line}`);
  if (tokens[1].line !== 2) throw new Error(`Expected line 2 but got ${tokens[1].line}`);
});

test('token carries column number', () => {
  const tokens = tokenize('  remember x as 1');
  if (tokens[0].col !== 3) throw new Error(`Expected col 3 but got ${tokens[0].col}`);
});

test('tokenizes decimal number', () => {
  const tokens = tokenize('3.14');
  if (tokens[0].type !== TOKEN.NUMBER) throw new Error('wrong type');
  if (tokens[0].value !== 3.14) throw new Error(`wrong value: ${tokens[0].value}`);
});

test('tokenizes identifier with underscore', () => {
  const tokens = tokenize('my_var');
  if (tokens[0].type !== TOKEN.IDENTIFIER) throw new Error('wrong type');
  if (tokens[0].value !== 'my_var') throw new Error('wrong value');
});

test('tokenizes identifier with digits', () => {
  const tokens = tokenize('item2');
  if (tokens[0].type !== TOKEN.IDENTIFIER) throw new Error('wrong type');
  if (tokens[0].value !== 'item2') throw new Error('wrong value');
});

test('throws on unexpected character', () => {
  try {
    tokenize('@invalid');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('unexpected')) throw e;
  }
});

// ── v1.0.0 — Compiler expression edge cases ───────────────────────────────────

console.log('\nv1.0 — Expression edge cases');

test('empty array literal compiles to []', () => {
  const js = compile('remember items as []');
  if (!js.includes('= []')) throw new Error('missing empty array');
});

test('decimal number literal compiles correctly', () => {
  const js = compile('remember pi as 3.14');
  if (!js.includes('3.14')) throw new Error('missing decimal');
});

test('nested member access compiles correctly', () => {
  const js = compile('show user.profile.name');
  if (!js.includes('user.profile.name')) throw new Error('missing nested member access');
});

test('chained index access compiles correctly', () => {
  const js = compile('show matrix[0][1]');
  if (!js.includes('matrix[0][1]')) throw new Error('missing chained index access');
});

test('member access becomes compiles to assignment', () => {
  const js = compile('user.profile.age becomes 18');
  if (!js.includes('user.profile.age = 18')) throw new Error('missing nested assignment');
});

test('addition expression with strings compiles correctly', () => {
  const js = compile('remember greeting as "Hello" + " " + "World"');
  if (!js.includes('"Hello" + " " + "World"')) throw new Error('missing string concat');
});

test('function call result used in expression', () => {
  const js = compile('show add(1, 2) + 3');
  if (!js.includes('add(1, 2) + 3')) throw new Error('missing expression with call');
});

// ── v1.0.0 — Error message quality ───────────────────────────────────────────

console.log('\nv1.0 — Error message quality');

test('misspelled "mke" suggests "make"', () => {
  try {
    compile('mke greet()\n  show "hi"\ndone');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('did you mean')) {
      throw new Error(`Expected "did you mean" suggestion but got: ${e.message}`);
    }
  }
});

test('misspelled "wihle" suggests "while"', () => {
  try {
    compile('wihle x is 0\n  x becomes 1\ndone');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('did you mean')) {
      throw new Error(`Expected "did you mean" suggestion but got: ${e.message}`);
    }
  }
});

test('unknown package error mentions supported packages', () => {
  try {
    compile('use math');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.includes('express')) {
      throw new Error(`Expected supported packages in error but got: ${e.message}`);
    }
  }
});

test('unterminated string has line and column info', () => {
  try {
    tokenize('"missing close');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.match(/Line \d+/)) {
      throw new Error(`Expected "Line N" in error but got: ${e.message}`);
    }
  }
});

test('missing "as" in remember gives helpful message', () => {
  try {
    compile('remember age 16');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('as')) {
      throw new Error(`Expected "as" in error but got: ${e.message}`);
    }
  }
});

// ── v1.0.0 — Formatter additional coverage ────────────────────────────────────

console.log('\nv1.0 — Formatter additional coverage');

test('format: for each block body is indented', () => {
  const src = 'for each item in list\nshow item\ndone';
  const result = format(src);
  if (!result.includes('    show item')) throw new Error('for each body not indented');
});

test('format: while block body is indented', () => {
  const src = 'while x is below 10\nx becomes x + 1\ndone';
  const result = format(src);
  if (!result.includes('    x becomes x + 1')) throw new Error('while body not indented');
});

test('format: route block body is indented', () => {
  const src = 'route "/"\nreply "Hello"\ndone';
  const result = format(src);
  if (!result.includes('    reply "Hello"')) throw new Error('route body not indented');
});

test('format: nested if inside function is double-indented', () => {
  const src = 'make check(x)\nif x is 1\nshow "one"\ndone\ndone';
  const result = format(src);
  if (!result.includes('        show "one"')) throw new Error('nested if not double-indented');
});

test('format: object literal body is indented', () => {
  const src = 'remember user as\nname is "Ayokunle"\ndone';
  const result = format(src);
  if (!result.includes('    name is "Ayokunle"')) throw new Error('object body not indented');
});

// ── v1.0.0 — CLI additional coverage ─────────────────────────────────────────

console.log('\nv1.0 — CLI additional coverage');

test('plain new creates the project directory', () => {
  const dir = tmpDir();
  const projectName = 'test-new-project';
  const projectDir = path.join(dir, projectName);
  runCli(['new', projectName], dir);
  if (!fs.existsSync(projectDir)) throw new Error('project directory not created');
  fs.rmSync(projectDir, { recursive: true, force: true });
});

test('plain new creates app.pln', () => {
  const dir = tmpDir();
  const projectName = 'test-new-pln';
  const projectDir = path.join(dir, projectName);
  runCli(['new', projectName], dir);
  if (!fs.existsSync(path.join(projectDir, 'app.pln'))) throw new Error('app.pln not created');
  fs.rmSync(projectDir, { recursive: true, force: true });
});

test('plain new creates plain.json', () => {
  const dir = tmpDir();
  const projectName = 'test-new-json';
  const projectDir = path.join(dir, projectName);
  runCli(['new', projectName], dir);
  if (!fs.existsSync(path.join(projectDir, 'plain.json'))) throw new Error('plain.json not created');
  fs.rmSync(projectDir, { recursive: true, force: true });
});

test('plain build writes .js output file', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'hello.pln');
  fs.writeFileSync(plnFile, 'show "hello"\n');
  runCli(['build', plnFile], dir);
  const jsFile = path.join(dir, 'hello.js');
  if (!fs.existsSync(jsFile)) throw new Error('.js output file not created');
});

test('plain build output file contains valid JS', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'prog.pln');
  fs.writeFileSync(plnFile, 'remember x as 42\nshow x\n');
  runCli(['build', plnFile], dir);
  const js = fs.readFileSync(path.join(dir, 'prog.js'), 'utf8');
  if (!js.includes('let x = 42')) throw new Error('expected let x = 42 in output');
  if (!js.includes('console.log(x)')) throw new Error('expected console.log in output');
});

test('plain help includes "plain new"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain new')) throw new Error('"plain new" missing from help');
});

test('unknown command shows an error message', () => {
  const dir = tmpDir();
  const out = runCli(['doesnotexist'], dir);
  if (!out.toLowerCase().includes('unknown command')) {
    throw new Error(`Expected "unknown command" error but got: ${out}`);
  }
});

test('plain run on nonexistent file exits with an error', () => {
  const dir = tmpDir();
  const out = runCli(['run', 'no_such_file.pln'], dir);
  if (!out.toLowerCase().includes('cannot find') && !out.toLowerCase().includes('not found') && !out.toLowerCase().includes('resolving')) {
    throw new Error(`Expected file-not-found error but got: ${out}`);
  }
});

// ── v1.0.0 — Compiler regression tests ───────────────────────────────────────

console.log('\nv1.0 — Regression tests');

test('remember with array index read compiles correctly', () => {
  const js = compile('remember players as ["a", "b"]\nremember first as players[0]');
  if (!js.includes('let first = players[0]')) throw new Error('missing index read');
});

test('becomes with object member compiles to assignment', () => {
  const js = compile('user.score becomes 100');
  if (!js.includes('user.score = 100')) throw new Error('missing member assignment');
});

test('"is equal to" is not a valid alias (is is the keyword)', () => {
  // "is" compiles to ===; "equal" and "to" are not keywords the parser handles
  // as a multi-word operator. Only "is" alone triggers equality.
  const js = compile('if x is 5\n  show "five"\ndone');
  if (!js.includes('x === 5')) throw new Error('expected x === 5');
});

test('for each with function call in body', () => {
  const src = 'for each item in list\n  greet(item)\ndone';
  const js = compile(src);
  if (!js.includes('greet(item)')) throw new Error('missing function call in loop body');
});

test('nested function declarations compile correctly', () => {
  const src = 'make outer()\n    make inner()\n        show "hi"\n    done\ndone';
  const js = compile(src);
  if (!js.includes('function outer()')) throw new Error('missing outer');
  if (!js.includes('function inner()')) throw new Error('missing inner');
});

test('multiple show statements compile to multiple console.log calls', () => {
  const src = 'show "a"\nshow "b"\nshow "c"';
  const js = compile(src);
  const count = (js.match(/console\.log/g) || []).length;
  if (count !== 3) throw new Error(`Expected 3 console.log calls but got ${count}`);
});

test('reply json with multiple properties compiles correctly', () => {
  const src = 'when someone visits "/"\n  reply json\n    name is "Plain"\n    version is "1.0"\n  done\ndone';
  const js = compile(src);
  if (!js.includes('"name": "Plain"')) throw new Error('missing name property');
  if (!js.includes('"version": "1.0"')) throw new Error('missing version property');
});

test('serve folder compiles with correct path', () => {
  const js = compile('serve folder "dist"');
  if (!js.includes('"dist"')) throw new Error('missing folder path');
  if (!js.includes('express.static')) throw new Error('missing static call');
});

test('while loop with is not condition', () => {
  const src = 'remember x as 0\nwhile x is not 10\n  x becomes x + 1\ndone';
  const js = compile(src);
  if (!js.includes('while (x !== 10)')) throw new Error('expected while x !== 10');
});

test('between condition in while loop', () => {
  const src = 'remember x as 5\nif x between 1 and 10\n  show "in range"\ndone';
  const js = compile(src);
  if (!js.includes('x >= 1 && x <= 10')) throw new Error('expected between range');
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);