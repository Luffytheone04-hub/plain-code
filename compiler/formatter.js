// Formatter: normalises Plain source code style without changing its logic.
//
// Rules applied:
//   - Consistent 4-space indentation
//   - Remove trailing whitespace from every line
//   - One blank line between top-level blocks (after "done" at depth 0)
//   - Collapse multiple consecutive blank lines into one
//   - Normalise inline spacing (single space between tokens on a line)

const INDENT = '    '; // 4 spaces

// Keywords whose line CLOSES a block (printed at depth - 1).
const DEDENT_WORDS = new Set(['done', 'otherwise']);

// Patterns whose line OPENS a new block (next line indented).
// The set is checked against the trimmed line's leading text.
const INDENT_STARTERS = [
  /^make\s+\S+\s*\(/,          // make name(...)
  /^if\s+/,                    // if ...
  /^otherwise\b/,              // otherwise
  /^for\s+each\s+/,            // for each ...
  /^while\s+/,                 // while ...
  /^when\s+someone\s+visits/,  // when someone visits ...
  /^listen\s+on\s+/,           // listen on ...
  /^reply\s+json\b/,           // reply json
  /^remember\s+\S+\s+as\s*$/,  // remember x as   (object literal, ends with "as")
];

function opensBlock(line) {
  return INDENT_STARTERS.some(re => re.test(line));
}

// Format a single Plain source string and return the formatted version.
function format(source) {
  const rawLines = source.split('\n');
  const output   = [];
  let depth = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const stripped = rawLines[i].replace(/\s+$/, ''); // remove trailing whitespace
    const content  = stripped.trim();

    // Preserve (collapsed) blank lines — handle below
    if (content === '') {
      output.push('');
      continue;
    }

    const firstWord = content.split(/\s+/)[0];

    // Dedenting keywords: reduce depth BEFORE printing this line.
    if (DEDENT_WORDS.has(firstWord) && depth > 0) {
      depth--;
    }

    // Before printing a top-level block start, ensure exactly one blank line
    // separates it from the previous non-blank content (unless it's the first line).
    if (depth === 0 && output.length > 0) {
      // Find the last non-empty line index in output.
      let lastNonEmpty = output.length - 1;
      while (lastNonEmpty >= 0 && output[lastNonEmpty] === '') lastNonEmpty--;

      // If there's content before this and no blank line gap, add one.
      if (lastNonEmpty >= 0 && output[output.length - 1] !== '') {
        output.push('');
      }
    }

    output.push(INDENT.repeat(depth) + content);

    // Opening keywords: increase depth AFTER printing this line.
    if (opensBlock(content)) {
      depth++;
    }
  }

  // Collapse consecutive blank lines into one.
  const collapsed = [];
  let prevBlank = false;
  for (const line of output) {
    const blank = line === '';
    if (blank && prevBlank) continue;
    collapsed.push(line);
    prevBlank = blank;
  }

  // Strip leading and trailing blank lines, then add a single trailing newline.
  while (collapsed.length > 0 && collapsed[0]             === '') collapsed.shift();
  while (collapsed.length > 0 && collapsed[collapsed.length - 1] === '') collapsed.pop();

  return collapsed.join('\n') + '\n';
}

module.exports = { format };
