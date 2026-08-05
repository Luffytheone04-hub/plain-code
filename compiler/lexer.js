// Lexer: converts Plain source text into a stream of tokens.
// Each token includes { type, value, line, col } for diagnostic reporting.

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
  IMPORT:     'IMPORT',
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
  import:    TOKEN.IMPORT,
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
  let line = 1;
  let lineStart = 0;

  function col() { return i - lineStart + 1; }

  while (i < source.length) {
    // Skip whitespace (track newlines for line counting)
    if (/\s/.test(source[i])) {
      if (source[i] === '\n') { line++; lineStart = i + 1; }
      i++;
      continue;
    }

    // Single-line comment: skip to end of line
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    const tokenLine = line;
    const tokenCol  = col();

    // String literal
    if (source[i] === '"') {
      let str = '';
      i++; // skip opening quote
      while (i < source.length && source[i] !== '"') {
        if (source[i] === '\n') { line++; lineStart = i + 1; }
        str += source[i++];
      }
      if (i >= source.length) {
        throw new Error(
          `Line ${tokenLine}, Column ${tokenCol}: Unterminated string: the closing " is missing.`
        );
      }
      i++; // skip closing quote
      tokens.push({ type: TOKEN.STRING, value: str, line: tokenLine, col: tokenCol });
      continue;
    }

    // Number literal (may include decimal point)
    if (/[0-9]/.test(source[i])) {
      let num = '';
      while (i < source.length && /[0-9.]/.test(source[i])) num += source[i++];
      tokens.push({ type: TOKEN.NUMBER, value: Number(num), line: tokenLine, col: tokenCol });
      continue;
    }

    // Word: keyword or identifier
    if (/[a-zA-Z_]/.test(source[i])) {
      let word = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) word += source[i++];
      const type = KEYWORDS[word] || TOKEN.IDENTIFIER;
      tokens.push({ type, value: word, line: tokenLine, col: tokenCol });
      continue;
    }

    // Single-character punctuation
    if (source[i] === '(') { tokens.push({ type: TOKEN.LPAREN,   value: '(', line, col: col() }); i++; continue; }
    if (source[i] === ')') { tokens.push({ type: TOKEN.RPAREN,   value: ')', line, col: col() }); i++; continue; }
    if (source[i] === '[') { tokens.push({ type: TOKEN.LBRACKET, value: '[', line, col: col() }); i++; continue; }
    if (source[i] === ']') { tokens.push({ type: TOKEN.RBRACKET, value: ']', line, col: col() }); i++; continue; }
    if (source[i] === ',') { tokens.push({ type: TOKEN.COMMA,    value: ',', line, col: col() }); i++; continue; }
    if (source[i] === '.') { tokens.push({ type: TOKEN.DOT,      value: '.', line, col: col() }); i++; continue; }
    if (source[i] === '+') { tokens.push({ type: TOKEN.PLUS,     value: '+', line, col: col() }); i++; continue; }

    throw new Error(
      `Line ${line}, Column ${col()}: Unexpected character "${source[i]}". Plain only uses letters, numbers, strings, and known symbols.`
    );
  }

  tokens.push({ type: TOKEN.EOF, line, col: col() });
  return tokens;
}

module.exports = { tokenize, TOKEN };
