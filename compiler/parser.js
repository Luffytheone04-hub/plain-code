// Parser: converts a token stream into an AST

const { TOKEN } = require('./lexer');

function parse(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
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

  function parseStatement() {
    const token = peek();

    if (token.type === TOKEN.REMEMBER)  return parseRemember();
    if (token.type === TOKEN.SHOW)      return parseShow();
    if (token.type === TOKEN.IF)        return parseIf();
    if (token.type === TOKEN.EOF)       return null;

    throw new Error(`Unexpected token: ${token.type} ("${token.value}")`);
  }

  function parseRemember() {
    consume(TOKEN.REMEMBER);
    const name = consume(TOKEN.IDENTIFIER).value;
    consume(TOKEN.AS);
    const value = parseValue();
    return { type: 'RememberStatement', name, value };
  }

  function parseShow() {
    consume(TOKEN.SHOW);
    const value = parseValue();
    return { type: 'ShowStatement', value };
  }

  // Parses: if <value> <comparison> <value> ... done
  //         if <value> <comparison> <value> ... otherwise ... done
  function parseIf() {
    consume(TOKEN.IF);
    const left = parseValue();
    const operator = parseComparison();
    const right = parseValue();

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

  // Parses: is | is greater than | is less than
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

  function parseValue() {
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
      consume(TOKEN.IDENTIFIER);
      return { type: 'Identifier', name: token.value };
    }

    throw new Error(`Expected a value but got ${token.type} ("${token.value}")`);
  }

  const body = [];
  while (peek().type !== TOKEN.EOF) {
    const stmt = parseStatement();
    if (stmt) body.push(stmt);
  }

  return { type: 'Program', body };
}

module.exports = { parse };
