// Lexer: converts Plain source text into a stream of tokens

const TOKEN = {
  REMEMBER: 'REMEMBER',
  SHOW: 'SHOW',
  AS: 'AS',
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  EOF: 'EOF',
};

function tokenize(source) {
  const tokens = [];
  let i = 0;

  while (i < source.length) {
    // Skip whitespace
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }

    // Single-line comment
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    // String literal
    if (source[i] === '"') {
      let str = '';
      i++; // skip opening quote
      while (i < source.length && source[i] !== '"') {
        str += source[i++];
      }
      if (i >= source.length) {
        throw new Error('Unterminated string: missing closing "');
      }
      i++; // skip closing quote
      tokens.push({ type: TOKEN.STRING, value: str });
      continue;
    }

    // Word (keyword or identifier)
    if (/[a-zA-Z_]/.test(source[i])) {
      let word = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        word += source[i++];
      }

      if (word === 'remember') {
        tokens.push({ type: TOKEN.REMEMBER, value: 'remember' });
      } else if (word === 'show') {
        tokens.push({ type: TOKEN.SHOW, value: 'show' });
      } else if (word === 'as') {
        tokens.push({ type: TOKEN.AS, value: 'as' });
      } else {
        tokens.push({ type: TOKEN.IDENTIFIER, value: word });
      }
      continue;
    }

    throw new Error(`Unexpected character: "${source[i]}" at position ${i}`);
  }

  tokens.push({ type: TOKEN.EOF });
  return tokens;
}

module.exports = { tokenize, TOKEN };
