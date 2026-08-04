// Generator: converts a Plain AST into JavaScript source code.

// Built-in stdlib functions: Plain name → JS code generator.
// These compile directly to JS equivalents with no runtime dependency.
const STDLIB = {
  length:    (args) => `(${generateExpr(args[0])}).length`,
  uppercase: (args) => `(${generateExpr(args[0])}).toUpperCase()`,
  lowercase: (args) => `(${generateExpr(args[0])}).toLowerCase()`,
  random:    (_args) => `Math.random()`,
  round:     (args) => `Math.round(${generateExpr(args[0])})`,
};

function generate(ast) {
  if (ast.type !== 'Program') {
    throw new Error(`Expected a Program node but got "${ast.type}".`);
  }
  return ast.body.map(node => generateStatement(node)).join('\n');
}

function generateStatement(node, indent = '') {
  switch (node.type) {
    case 'RememberStatement':
      return `${indent}let ${node.name} = ${generateExpr(node.value)};`;

    case 'ShowStatement':
      return `${indent}console.log(${generateExpr(node.value)});`;

    case 'GiveStatement':
      return `${indent}return ${generateExpr(node.value)};`;

    case 'BecomeStatement':
      return `${indent}${generateLValue(node.target)} = ${generateExpr(node.value)};`;

    case 'ExpressionStatement':
      return `${indent}${generateExpr(node.expression)};`;

    case 'UseStatement':
      return `${indent}// use ${node.module} (runtime not yet available)`;

    case 'FunctionDeclaration': {
      const params = node.params.join(', ');
      const body   = node.body.map(s => generateStatement(s, indent + '  ')).join('\n');
      return `${indent}function ${node.name}(${params}) {\n${body}\n${indent}}`;
    }

    case 'IfStatement': {
      const condition  = `${generateExpr(node.left)} ${node.operator} ${generateExpr(node.right)}`;
      const consequent = node.consequent.map(s => generateStatement(s, indent + '  ')).join('\n');
      let out = `${indent}if (${condition}) {\n${consequent}\n${indent}}`;
      if (node.alternate) {
        const alternate = node.alternate.map(s => generateStatement(s, indent + '  ')).join('\n');
        out += ` else {\n${alternate}\n${indent}}`;
      }
      return out;
    }

    case 'ForEachStatement': {
      const body = node.body.map(s => generateStatement(s, indent + '  ')).join('\n');
      return `${indent}for (const ${node.item} of ${generateExpr(node.collection)}) {\n${body}\n${indent}}`;
    }

    case 'WhileStatement': {
      const condition = `${generateExpr(node.left)} ${node.operator} ${generateExpr(node.right)}`;
      const body      = node.body.map(s => generateStatement(s, indent + '  ')).join('\n');
      return `${indent}while (${condition}) {\n${body}\n${indent}}`;
    }

    default:
      throw new Error(`Unknown statement type "${node.type}".`);
  }
}

// Generates a valid JS assignment target (left-hand side of =).
function generateLValue(node) {
  if (node.type === 'Identifier')      return node.name;
  if (node.type === 'IndexExpression') return `${generateExpr(node.object)}[${generateExpr(node.index)}]`;
  if (node.type === 'MemberExpression') return `${generateExpr(node.object)}.${node.property}`;
  throw new Error(`Invalid assignment target "${node.type}".`);
}

function generateExpr(node) {
  switch (node.type) {
    case 'StringLiteral':    return JSON.stringify(node.value);
    case 'NumberLiteral':    return String(node.value);
    case 'Identifier':       return node.name;
    case 'BinaryExpression': return `${generateExpr(node.left)} ${node.operator} ${generateExpr(node.right)}`;

    case 'ArrayLiteral': {
      const elements = node.elements.map(generateExpr).join(', ');
      return `[${elements}]`;
    }

    case 'ObjectLiteral': {
      const props = node.properties
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value)}`)
        .join(', ');
      return `{ ${props} }`;
    }

    case 'IndexExpression':
      return `${generateExpr(node.object)}[${generateExpr(node.index)}]`;

    case 'MemberExpression':
      return `${generateExpr(node.object)}.${node.property}`;

    case 'CallExpression': {
      if (STDLIB[node.name]) return STDLIB[node.name](node.args);
      return `${node.name}(${node.args.map(generateExpr).join(', ')})`;
    }

    default:
      throw new Error(`Unknown expression type "${node.type}".`);
  }
}

module.exports = { generate };
