// Parser: converts a token stream into an AST (Abstract Syntax Tree).

const { TOKEN } = require('./lexer');

// Statement-starting Plain keywords, used for "did you mean?" suggestions.
const STATEMENT_KEYWORDS = [
  'remember', 'show', 'if', 'make', 'give',
  'for', 'while', 'use', 'import', 'when', 'listen', 'reply', 'serve',
];

// Returns the Levenshtein edit distance between two strings.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns the closest keyword within edit distance 2, or null.
function closestKeyword(word) {
  let best = null, bestDist = Infinity;
  for (const kw of STATEMENT_KEYWORDS) {
    const d = levenshtein(word.toLowerCase(), kw);
    if (d < bestDist) { bestDist = d; best = kw; }
  }
  return bestDist <= 2 ? best : null;
}

function parse(tokens) {
  let pos = 0;

  function peek()         { return tokens[pos]; }
  function peekAt(offset) { return tokens[pos + offset] || { type: TOKEN.EOF }; }
  function advance()      { return tokens[pos++]; }

  function consume(expectedType, hint) {
    const token = tokens[pos];
    if (token.type !== expectedType) {
      throw new Error(hint || `Expected ${expectedType} but got "${token.value || token.type}".`);
    }
    return advance();
  }

  // ── Statements ─────────────────────────────────────────────────────────────

  function parseStatement() {
    const token = peek();

    if (token.type === TOKEN.REMEMBER) return parseRemember();
    if (token.type === TOKEN.SHOW)     return parseShow();
    if (token.type === TOKEN.IF)       return parseIf();
    if (token.type === TOKEN.MAKE)     return parseMake();
    if (token.type === TOKEN.GIVE)     return parseGive();
    if (token.type === TOKEN.FOR)      return parseForEach();
    if (token.type === TOKEN.WHILE)    return parseWhile();
    if (token.type === TOKEN.USE)      return parseUse();
    if (token.type === TOKEN.IMPORT)   return parseImport();
    if (token.type === TOKEN.WHEN)     return parseRoute();
    if (token.type === TOKEN.LISTEN)   return parseListen();
    if (token.type === TOKEN.REPLY)    return parseReply();
    if (token.type === TOKEN.SERVE)    return parseServeFolder();

    if (token.type === TOKEN.EOF) return null;

    // Statements starting with an identifier: call, becomes, index/member becomes
    if (token.type === TOKEN.IDENTIFIER) {
      const expr = parsePrimary();

      if (peek().type === TOKEN.BECOMES) {
        advance();
        const value = parseExpression();
        return { type: 'BecomeStatement', target: expr, value };
      }

      if (expr.type === 'CallExpression') {
        return { type: 'ExpressionStatement', expression: expr };
      }

      const word = expr.type === 'Identifier' ? expr.name : token.value;
      const suggestion = closestKeyword(word);
      if (suggestion) {
        throw new Error(`Unknown keyword "${word}". Did you mean "${suggestion}"?`);
      }
      throw new Error(`Unexpected word "${word}". This is not a valid statement in Plain.`);
    }

    throw new Error(`Unexpected keyword "${token.value}".`);
  }

  // remember <name> as <value>
  // remember <name> as\n  <key> is <val>\n...\ndone   (object literal)
  function parseRemember() {
    consume(TOKEN.REMEMBER);
    const name = consume(
      TOKEN.IDENTIFIER,
      'Expected a variable name after "remember".\n\nExample:\n  remember age as 16'
    ).value;
    consume(
      TOKEN.AS,
      'Expected keyword "as" after the variable name.\n\nExample:\n  remember age as 16'
    );

    // Object literal: next token is IDENTIFIER followed by IS
    if (peek().type === TOKEN.IDENTIFIER && peekAt(1).type === TOKEN.IS) {
      return { type: 'RememberStatement', name, value: parseObjectLiteral() };
    }

    const value = parseExpression();
    return { type: 'RememberStatement', name, value };
  }

  function parseShow() {
    consume(TOKEN.SHOW);
    const value = parseExpression();
    return { type: 'ShowStatement', value };
  }

  // make name(params) ... done
  function parseMake() {
    consume(TOKEN.MAKE);
    const name = consume(
      TOKEN.IDENTIFIER,
      'Expected a function name after "make".\n\nExample:\n  make greet()\n    show "Hello"\n  done'
    ).value;
    consume(TOKEN.LPAREN, `Expected "(" after function name "${name}".`);
    const params = parseParamList();
    consume(TOKEN.RPAREN, 'Expected ")" to close the parameter list.');
    const body = parseBody(`function "${name}"`);
    return { type: 'FunctionDeclaration', name, params, body };
  }

  function parseParamList() {
    const params = [];
    if (peek().type === TOKEN.RPAREN) return params;
    params.push(consume(TOKEN.IDENTIFIER, 'Expected a parameter name.').value);
    while (peek().type === TOKEN.COMMA) {
      advance();
      params.push(consume(TOKEN.IDENTIFIER, 'Expected a parameter name after ",".').value);
    }
    return params;
  }

  function parseGive() {
    consume(TOKEN.GIVE);
    const value = parseExpression();
    return { type: 'GiveStatement', value };
  }

  // for each <item> in <collection> ... done
  function parseForEach() {
    consume(TOKEN.FOR);
    consume(TOKEN.EACH, 'Expected "each" after "for".\n\nExample:\n  for each item in players\n    show item\n  done');
    const item = consume(TOKEN.IDENTIFIER, 'Expected an item name after "each".').value;
    consume(TOKEN.IN, `Expected "in" after "${item}".\n\nExample:\n  for each item in players`);
    const collection = parseExpression();
    const body = parseBody('"for each" loop');
    return { type: 'ForEachStatement', item, collection, body };
  }

  // while <left> <comparison> <right> ... done
  function parseWhile() {
    consume(TOKEN.WHILE);
    const left     = parseExpression();
    const operator = parseComparison();
    const right    = parseExpression();
    const body     = parseBody('"while" loop');
    return { type: 'WhileStatement', left, operator, right, body };
  }

  // import "./file.pln"
  function parseImport() {
    consume(TOKEN.IMPORT);
    const filePath = consume(
      TOKEN.STRING,
      'Expected a file path string after "import".\n\nExample:\n  import "./math.pln"'
    ).value;
    return { type: 'ImportStatement', path: filePath };
  }

  // use <module>
  function parseUse() {
    consume(TOKEN.USE);
    const module = consume(TOKEN.IDENTIFIER, 'Expected a module name after "use".\n\nExample:\n  use express').value;
    return { type: 'UseStatement', module };
  }

  // when someone visits "<path>" ... done
  function parseRoute() {
    consume(TOKEN.WHEN);
    consume(TOKEN.SOMEONE, 'Expected "someone" after "when".\n\nExample:\n  when someone visits "/"\n    reply "Hello"\n  done');
    consume(TOKEN.VISITS,  'Expected "visits" after "someone".\n\nExample:\n  when someone visits "/"');
    const routePath = consume(TOKEN.STRING, 'Expected a route path string after "visits".\n\nExample:\n  when someone visits "/"').value;
    const body = parseBody('route');
    return { type: 'RouteStatement', path: routePath, body };
  }

  // listen on <port> ... done
  function parseListen() {
    consume(TOKEN.LISTEN);
    consume(TOKEN.ON, 'Expected "on" after "listen".\n\nExample:\n  listen on 3000\n    show "Running"\n  done');
    const port = parseExpression();
    const body = parseBody('"listen" block');
    return { type: 'ListenStatement', port, body };
  }

  // reply <expr>
  // reply json\n  <key> is <val>\n...\ndone
  function parseReply() {
    consume(TOKEN.REPLY);
    if (peek().type === TOKEN.JSON_KW) {
      advance(); // consume json
      const properties = [];
      while (peek().type !== TOKEN.DONE) {
        if (peek().type === TOKEN.EOF) {
          throw new Error('Expected keyword "done" to close "reply json" block before end of file.');
        }
        const key = consume(TOKEN.IDENTIFIER, 'Expected a property name.').value;
        consume(TOKEN.IS, `Expected "is" after property name "${key}".`);
        const value = parseExpression();
        properties.push({ key, value });
      }
      advance(); // consume DONE
      return { type: 'ReplyJsonStatement', properties };
    }
    const value = parseExpression();
    return { type: 'ReplyStatement', value };
  }

  // serve folder "<path>"
  function parseServeFolder() {
    consume(TOKEN.SERVE);
    consume(TOKEN.FOLDER, 'Expected "folder" after "serve".\n\nExample:\n  serve folder "public"');
    const folder = consume(TOKEN.STRING, 'Expected a folder path string after "serve folder".\n\nExample:\n  serve folder "public"').value;
    return { type: 'ServeFolderStatement', folder };
  }

  // ── Conditions ─────────────────────────────────────────────────────────────

  function parseIf() {
    consume(TOKEN.IF);
    const left     = parseExpression();
    const operator = parseComparison();
    const right    = parseExpression();

    const consequent = [];
    while (peek().type !== TOKEN.OTHERWISE && peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error('Expected keyword "done" before end of file to close the "if" block.');
      }
      const stmt = parseStatement();
      if (stmt) consequent.push(stmt);
    }

    let alternate = null;
    if (peek().type === TOKEN.OTHERWISE) {
      advance();
      alternate = [];
      while (peek().type !== TOKEN.DONE) {
        if (peek().type === TOKEN.EOF) {
          throw new Error('Expected keyword "done" before end of file to close the "otherwise" block.');
        }
        const stmt = parseStatement();
        if (stmt) alternate.push(stmt);
      }
    }

    advance(); // consume DONE
    return { type: 'IfStatement', left, operator, right, consequent, alternate };
  }

  // is | is greater than | is less than
  function parseComparison() {
    consume(TOKEN.IS, 'Expected a comparison after the value. Use "is", "is greater than", or "is less than".');
    if (peek().type === TOKEN.GREATER) {
      advance();
      consume(TOKEN.THAN, 'Expected "than" after "greater". Use: is greater than');
      return '>';
    }
    if (peek().type === TOKEN.LESS) {
      advance();
      consume(TOKEN.THAN, 'Expected "than" after "less". Use: is less than');
      return '<';
    }
    return '===';
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  function parseBody(context) {
    const body = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(`Expected keyword "done" to close the ${context} before end of file.`);
      }
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    advance(); // consume DONE
    return body;
  }

  // ── Expressions ────────────────────────────────────────────────────────────

  // expression → primary ('+' primary)*
  function parseExpression() {
    let left = parsePrimary();
    while (peek().type === TOKEN.PLUS) {
      advance();
      const right = parsePrimary();
      left = { type: 'BinaryExpression', operator: '+', left, right };
    }
    return left;
  }

  // primary → atom (postfix)*
  function parsePrimary() {
    let node = parseAtom();
    while (true) {
      if (peek().type === TOKEN.LBRACKET) {
        advance();
        const index = parseExpression();
        consume(TOKEN.RBRACKET, 'Expected "]" to close the index.');
        node = { type: 'IndexExpression', object: node, index };
      } else if (peek().type === TOKEN.DOT) {
        advance();
        const property = consume(TOKEN.IDENTIFIER, 'Expected a property name after ".".').value;
        node = { type: 'MemberExpression', object: node, property };
      } else {
        break;
      }
    }
    return node;
  }

  // atom → STRING | NUMBER | '[' ... ']' | IDENTIFIER '(' args ')' | IDENTIFIER
  function parseAtom() {
    const token = peek();

    if (token.type === TOKEN.STRING)   { advance(); return { type: 'StringLiteral',  value: token.value }; }
    if (token.type === TOKEN.NUMBER)   { advance(); return { type: 'NumberLiteral',  value: token.value }; }
    if (token.type === TOKEN.LBRACKET) { return parseArrayLiteral(); }

    if (token.type === TOKEN.IDENTIFIER) {
      if (peekAt(1).type === TOKEN.LPAREN) return parseCallExpression();
      advance();
      return { type: 'Identifier', name: token.value };
    }

    throw new Error(
      `Expected a value (a word, number, string, or array) but got "${token.value || token.type}".`
    );
  }

  // [ expr, expr, ... ]
  function parseArrayLiteral() {
    consume(TOKEN.LBRACKET);
    const elements = [];
    while (peek().type !== TOKEN.RBRACKET) {
      if (peek().type === TOKEN.EOF) {
        throw new Error('Expected "]" to close the array before end of file.');
      }
      elements.push(parseExpression());
      if (peek().type === TOKEN.COMMA) advance();
    }
    consume(TOKEN.RBRACKET, 'Expected "]" to close the array.');
    return { type: 'ArrayLiteral', elements };
  }

  // Object literal body: key is value  ...  done
  function parseObjectLiteral() {
    const properties = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error('Expected keyword "done" to close the object literal before end of file.');
      }
      const key = consume(TOKEN.IDENTIFIER, 'Expected a property name.').value;
      consume(TOKEN.IS, `Expected "is" after property name "${key}".\n\nExample:\n  name is "Ayokunle"`);
      const value = parseExpression();
      properties.push({ key, value });
    }
    advance(); // consume DONE
    return { type: 'ObjectLiteral', properties };
  }

  // name(arg, arg, ...)
  function parseCallExpression() {
    const name = advance().value;
    consume(TOKEN.LPAREN, `Expected "(" after function name "${name}".`);
    const args = parseArgList();
    consume(TOKEN.RPAREN, 'Expected ")" to close the argument list.');
    return { type: 'CallExpression', name, args };
  }

  function parseArgList() {
    const args = [];
    if (peek().type === TOKEN.RPAREN) return args;
    if (peek().type === TOKEN.EOF) {
      throw new Error('Expected ")" to close the argument list before end of file.');
    }
    args.push(parseExpression());
    while (peek().type === TOKEN.COMMA) {
      advance();
      if (peek().type === TOKEN.EOF) {
        throw new Error('Expected ")" to close the argument list before end of file.');
      }
      args.push(parseExpression());
    }
    return args;
  }

  // ── Program ────────────────────────────────────────────────────────────────

  const body = [];
  while (peek().type !== TOKEN.EOF) {
    const stmt = parseStatement();
    if (stmt) body.push(stmt);
  }
  return { type: 'Program', body };
}

module.exports = { parse };
