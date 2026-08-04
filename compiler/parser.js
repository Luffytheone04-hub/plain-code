// Parser: converts a token stream into an AST

const { TOKEN } = require('./lexer');

function parse(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function peekAt(offset) {
    return tokens[pos + offset] || { type: TOKEN.EOF };
  }

  function consume(expectedType) {
    const token = tokens[pos];
    if (expectedType && token.type !== expectedType) {
      throw new Error(
        `Expected ${expectedType} but got ${token.type} ("${token.value}")`
      );
    }
    pos++;
    return token;
  }

  // ── Statements ─────────────────────────────────────────────────────────────

  function parseStatement() {
    const token = peek();

    if (token.type === TOKEN.REMEMBER)  return parseRemember();
    if (token.type === TOKEN.SHOW)      return parseShow();
    if (token.type === TOKEN.IF)        return parseIf();
    if (token.type === TOKEN.MAKE)      return parseMake();
    if (token.type === TOKEN.GIVE)      return parseGive();

    // Bare function call as a statement: name(...)
    if (token.type === TOKEN.IDENTIFIER && peekAt(1).type === TOKEN.LPAREN) {
      const expr = parseCallExpression();
      return { type: 'ExpressionStatement', expression: expr };
    }

    if (token.type === TOKEN.EOF) return null;

    throw new Error(`Unexpected token: ${token.type} ("${token.value}")`);
  }

  function parseRemember() {
    consume(TOKEN.REMEMBER);
    const name = consume(TOKEN.IDENTIFIER).value;
    consume(TOKEN.AS);
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
    const name = consume(TOKEN.IDENTIFIER).value;
    consume(TOKEN.LPAREN);
    const params = parseParamList();
    consume(TOKEN.RPAREN);

    const body = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error('Expected "done" to close function definition');
      }
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    consume(TOKEN.DONE);

    return { type: 'FunctionDeclaration', name, params, body };
  }

  // Comma-separated parameter names (identifiers only)
  function parseParamList() {
    const params = [];
    if (peek().type === TOKEN.RPAREN) return params;
    params.push(consume(TOKEN.IDENTIFIER).value);
    while (peek().type === TOKEN.COMMA) {
      consume(TOKEN.COMMA);
      params.push(consume(TOKEN.IDENTIFIER).value);
    }
    return params;
  }

  function parseGive() {
    consume(TOKEN.GIVE);
    const value = parseExpression();
    return { type: 'GiveStatement', value };
  }

  // ── Conditions ─────────────────────────────────────────────────────────────

  // if <expr> <comparison> <expr> ... [otherwise ...] done
  function parseIf() {
    consume(TOKEN.IF);
    const left = parseExpression();
    const operator = parseComparison();
    const right = parseExpression();

    const consequent = [];
    while (peek().type !== TOKEN.OTHERWISE && peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error('Expected "otherwise" or "done" to close "if" block');
      }
      const stmt = parseStatement();
      if (stmt) consequent.push(stmt);
    }

    let alternate = null;
    if (peek().type === TOKEN.OTHERWISE) {
      consume(TOKEN.OTHERWISE);
      alternate = [];
      while (peek().type !== TOKEN.DONE) {
        if (peek().type === TOKEN.EOF) {
          throw new Error('Expected "done" to close "otherwise" block');
        }
        const stmt = parseStatement();
        if (stmt) alternate.push(stmt);
      }
    }

    consume(TOKEN.DONE);
    return { type: 'IfStatement', left, operator, right, consequent, alternate };
  }

  // is | is greater than | is less than
  function parseComparison() {
    consume(TOKEN.IS);
    if (peek().type === TOKEN.GREATER) {
      consume(TOKEN.GREATER);
      consume(TOKEN.THAN);
      return '>';
    }
    if (peek().type === TOKEN.LESS) {
      consume(TOKEN.LESS);
      consume(TOKEN.THAN);
      return '<';
    }
    return '===';
  }

  // ── Expressions ────────────────────────────────────────────────────────────

  // expression → primary ('+' primary)*
  function parseExpression() {
    let left = parsePrimary();
    while (peek().type === TOKEN.PLUS) {
      consume(TOKEN.PLUS);
      const right = parsePrimary();
      left = { type: 'BinaryExpression', operator: '+', left, right };
    }
    return left;
  }

  // primary → STRING | NUMBER | IDENTIFIER '(' args ')' | IDENTIFIER
  function parsePrimary() {
    const token = peek();

    if (token.type === TOKEN.STRING) {
      consume(TOKEN.STRING);
      return { type: 'StringLiteral', value: token.value };
    }

    if (token.type === TOKEN.NUMBER) {
      consume(TOKEN.NUMBER);
      return { type: 'NumberLiteral', value: token.value };
    }

    if (token.type === TOKEN.IDENTIFIER) {
      if (peekAt(1).type === TOKEN.LPAREN) {
        return parseCallExpression();
      }
      consume(TOKEN.IDENTIFIER);
      return { type: 'Identifier', name: token.value };
    }

    throw new Error(`Expected a value but got ${token.type} ("${token.value}")`);
  }

  // name(arg, arg, ...)
  function parseCallExpression() {
    const name = consume(TOKEN.IDENTIFIER).value;
    consume(TOKEN.LPAREN);
    const args = parseArgList();
    consume(TOKEN.RPAREN);
    return { type: 'CallExpression', name, args };
  }

  // Comma-separated argument expressions
  function parseArgList() {
    const args = [];
    if (peek().type === TOKEN.RPAREN) return args;
    args.push(parseExpression());
    while (peek().type === TOKEN.COMMA) {
      consume(TOKEN.COMMA);
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
