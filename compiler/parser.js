// Parser: converts a token stream into an AST (Abstract Syntax Tree).

const { TOKEN } = require('./lexer');

// All statement-level Plain keywords, used for "did you mean?" suggestions.
const STATEMENT_KEYWORDS = ['remember', 'show', 'if', 'make', 'give', 'otherwise', 'done'];

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

// Returns the closest keyword if within edit distance 2, otherwise null.
function closestKeyword(word) {
  let best = null;
  let bestDist = Infinity;
  for (const kw of STATEMENT_KEYWORDS) {
    const d = levenshtein(word.toLowerCase(), kw);
    if (d < bestDist) { bestDist = d; best = kw; }
  }
  return bestDist <= 2 ? best : null;
}

function parse(tokens) {
  let pos = 0;

  function peek()           { return tokens[pos]; }
  function peekAt(offset)   { return tokens[pos + offset] || { type: TOKEN.EOF }; }
  function advance()        { return tokens[pos++]; }

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

    // Bare function call as a statement: name(...)
    if (token.type === TOKEN.IDENTIFIER && peekAt(1).type === TOKEN.LPAREN) {
      return { type: 'ExpressionStatement', expression: parseCallExpression() };
    }

    if (token.type === TOKEN.EOF) return null;

    // Unknown or misspelled keyword — give a helpful message
    if (token.type === TOKEN.IDENTIFIER) {
      const suggestion = closestKeyword(token.value);
      if (suggestion) {
        throw new Error(
          `Unknown keyword "${token.value}". Did you mean "${suggestion}"?`
        );
      }
      throw new Error(
        `Unexpected word "${token.value}". This is not a valid statement in Plain.`
      );
    }

    throw new Error(`Unexpected keyword "${token.value}".`);
  }

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
      'Expected a function name after "make".\n\nExample:\n  make greet()\n      show "Hello"\n  done'
    ).value;
    consume(TOKEN.LPAREN, `Expected "(" after function name "${name}".`);
    const params = parseParamList();
    consume(TOKEN.RPAREN, 'Expected ")" to close the parameter list.');

    const body = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(
          `Expected keyword "done" to close the function "${name}" before end of file.`
        );
      }
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    advance(); // consume DONE
    return { type: 'FunctionDeclaration', name, params, body };
  }

  function parseParamList() {
    const params = [];
    if (peek().type === TOKEN.RPAREN) return params;
    params.push(consume(TOKEN.IDENTIFIER, 'Expected a parameter name.').value);
    while (peek().type === TOKEN.COMMA) {
      advance(); // consume comma
      params.push(consume(TOKEN.IDENTIFIER, 'Expected a parameter name after ",".').value);
    }
    return params;
  }

  function parseGive() {
    consume(TOKEN.GIVE);
    const value = parseExpression();
    return { type: 'GiveStatement', value };
  }

  // ── Conditions ─────────────────────────────────────────────────────────────

  // if <expr> <comparison> <expr>  [body]  [otherwise [body]]  done
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
      advance(); // consume OTHERWISE
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

  // ── Expressions ────────────────────────────────────────────────────────────

  // expression → primary ('+' primary)*
  function parseExpression() {
    let left = parsePrimary();
    while (peek().type === TOKEN.PLUS) {
      advance(); // consume +
      const right = parsePrimary();
      left = { type: 'BinaryExpression', operator: '+', left, right };
    }
    return left;
  }

  // primary → STRING | NUMBER | IDENTIFIER '(' args ')' | IDENTIFIER
  function parsePrimary() {
    const token = peek();

    if (token.type === TOKEN.STRING) {
      advance();
      return { type: 'StringLiteral', value: token.value };
    }

    if (token.type === TOKEN.NUMBER) {
      advance();
      return { type: 'NumberLiteral', value: token.value };
    }

    if (token.type === TOKEN.IDENTIFIER) {
      if (peekAt(1).type === TOKEN.LPAREN) return parseCallExpression();
      advance();
      return { type: 'Identifier', name: token.value };
    }

    throw new Error(
      `Expected a value (a word, number, or string) but got "${token.value || token.type}".`
    );
  }

  // name(arg, arg, ...)
  function parseCallExpression() {
    const name = advance().value; // consume IDENTIFIER
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
