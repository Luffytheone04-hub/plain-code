// Lexer: converts Plain source text into a stream of tokens.

const TOKEN = {
  // Core keywords
  REMEMBER:   'REMEMBER',
  SHOW:       'SHOW',
  AS:         'AS',
  IF:         'IF',
  OTHERWISE:  'OTHERWISE',
  DONE:       'DONE',
  IS:         'IS',
  GREATER:    'GREATER',
  LESS:       'LESS',
  THAN:       'THAN',
  MAKE:       'MAKE',
  GIVE:       'GIVE',
  BECOMES:    'BECOMES',
  FOR:        'FOR',
  EACH:       'EACH',
  IN:         'IN',
  WHILE:      'WHILE',
  USE:        'USE',
  // v0.3 — runtime keywords
  WHEN:       'WHEN',
  SOMEONE:    'SOMEONE',
  VISITS:     'VISITS',
  LISTEN:     'LISTEN',
  ON:         'ON',
  REPLY:      'REPLY',
  JSON_KW:    'JSON_KW',
  SERVE:      'SERVE',
  FOLDER:     'FOLDER',
  // Punctuation
  LPAREN:     'LPAREN',
  RPAREN:     'RPAREN',
  LBRACKET:   'LBRACKET',
  RBRACKET:   'RBRACKET',
  COMMA:      'COMMA',
  DOT:        'DOT',
  PLUS:       'PLUS',
  // Literals & identifiers
  IDENTIFIER: 'IDENTIFIER',
  STRING:     'STRING',
  NUMBER:     'NUMBER',
  // End of input
  EOF:        'EOF',
};

const KEYWORDS = {
  remember:  TOKEN.REMEMBER,
  show:      TOKEN.SHOW,
  as:        TOKEN.AS,
  if:        TOKEN.IF,
  otherwise: TOKEN.OTHERWISE,
  done:      TOKEN.DONE,
  is:        TOKEN.IS,
  greater:   TOKEN.GREATER,
  less:      TOKEN.LESS,
  than:      TOKEN.THAN,
  make:      TOKEN.MAKE,
  give:      TOKEN.GIVE,
  becomes:   TOKEN.BECOMES,
  for:       TOKEN.FOR,
  each:      TOKEN.EACH,
  in:        TOKEN.IN,
  while:     TOKEN.WHILE,
  use:       TOKEN.USE,
  when:      TOKEN.WHEN,
  someone:   TOKEN.SOMEONE,
  visits:    TOKEN.VISITS,
  listen:    TOKEN.LISTEN,
  on:        TOKEN.ON,
  reply:     TOKEN.REPLY,
  json:      TOKEN.JSON_KW,
  serve:     TOKEN.SERVE,
  folder:    TOKEN.FOLDER,
};

function tokenize(source) {
  const tokens = [];
  let i = 0;

  while (i < source.length) {
    // Skip whitespace
    if (/\s/.test(source[i])) { i++; continue; }

    // Single-line comment: skip to end of line
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    // String literal
    if (source[i] === '"') {
      let str = '';
      i++; // skip opening quote
      while (i < source.length && source[i] !== '"') str += source[i++];
      if (i >= source.length) {
        throw new Error('Unterminated string: the closing " is missing.');
      }
      i++; // skip closing quote
      tokens.push({ type: TOKEN.STRING, value: str });
      continue;
    }

    // Number literal (may include decimal point)
    if (/[0-9]/.test(source[i])) {
      let num = '';
      while (i < source.length && /[0-9.]/.test(source[i])) num += source[i++];
      tokens.push({ type: TOKEN.NUMBER, value: Number(num) });
      continue;
    }

    // Word: keyword or identifier
    if (/[a-zA-Z_]/.test(source[i])) {
      let word = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) word += source[i++];
      const type = KEYWORDS[word] || TOKEN.IDENTIFIER;
      tokens.push({ type, value: word });
      continue;
    }

    // Single-character punctuation
    if (source[i] === '(') { tokens.push({ type: TOKEN.LPAREN,   value: '(' }); i++; continue; }
    if (source[i] === ')') { tokens.push({ type: TOKEN.RPAREN,   value: ')' }); i++; continue; }
    if (source[i] === '[') { tokens.push({ type: TOKEN.LBRACKET, value: '[' }); i++; continue; }
    if (source[i] === ']') { tokens.push({ type: TOKEN.RBRACKET, value: ']' }); i++; continue; }
    if (source[i] === ',') { tokens.push({ type: TOKEN.COMMA,    value: ',' }); i++; continue; }
    if (source[i] === '.') { tokens.push({ type: TOKEN.DOT,      value: '.' }); i++; continue; }
    if (source[i] === '+') { tokens.push({ type: TOKEN.PLUS,     value: '+' }); i++; continue; }

    throw new Error(
      `Unexpected character "${source[i]}" at position ${i}. Plain only uses letters, numbers, strings, and known symbols.`
    );
  }

  tokens.push({ type: TOKEN.EOF });
  return tokens;
}

module.exports = { tokenize, TOKEN };
