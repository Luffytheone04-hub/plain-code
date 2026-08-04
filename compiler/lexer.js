// Lexer: converts Plain source text into a stream of tokens

const TOKEN = {
  REMEMBER: 'REMEMBER',
  SHOW: 'SHOW',
  AS: 'AS',
  IF: 'IF',
  OTHERWISE: 'OTHERWISE',
  DONE: 'DONE',
  IS: 'IS',
  GREATER: 'GREATER',
  LESS: 'LESS',
  THAN: 'THAN',
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  EOF: 'EOF',
};

const KEYWORDS = {
  remember: TOKEN.REMEMBER,
  show:     TOKEN.SHOW,
  as:       TOKEN.AS,
  if:       TOKEN.IF,
  otherwise: TOKEN.OTHERWISE,
  done:     TOKEN.DONE,
  is:       TOKEN.IS,
  greater:  TOKEN.GREATER,
  less:     TOKEN.LESS,
  than:     TOKEN.THAN,
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

    // Number literal
    if (/[0-9]/.test(source[i])) {
      let num = '';
      while (i < source.length && /[0-9.]/.test(source[i])) {
        num += source[i++];
      }
      tokens.push({ type: TOKEN.NUMBER, value: Number(num) });
      continue;
    }

    // Word (keyword or identifier)
    if (/[a-zA-Z_]/.test(source[i])) {
      let word = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        word += source[i++];
      }
      const type = KEYWORDS[word] || TOKEN.IDENTIFIER;
      tokens.push({ type, value: word });
      continue;
    }

    throw new Error(`Unexpected character: "${source[i]}" at position ${i}`);
  }

  tokens.push({ type: TOKEN.EOF });
  return tokens;
}

module.exports = { tokenize, TOKEN };
