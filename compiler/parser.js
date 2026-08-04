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

    if (token.type === TOKEN.REMEMBER) {
      return parseRemember();
    }

    if (token.type === TOKEN.SHOW) {
      return parseShow();
    }

    if (token.type === TOKEN.EOF) {
      return null;
    }

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

  function parseValue() {
    const token = peek();

    if (token.type === TOKEN.STRING) {
      consume(TOKEN.STRING);
      return { type: 'StringLiteral', value: token.value };
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
