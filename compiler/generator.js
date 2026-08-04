// Generator: converts an AST into JavaScript source code

function generate(ast) {
  if (ast.type !== 'Program') {
    throw new Error(`Expected Program node, got ${ast.type}`);
  }
  return ast.body.map(s => generateStatement(s)).join('\n');
}

function generateStatement(node, indent = '') {
  if (node.type === 'RememberStatement') {
    return `${indent}const ${node.name} = ${generateExpr(node.value)};`;
  }

  if (node.type === 'ShowStatement') {
    return `${indent}console.log(${generateExpr(node.value)});`;
  }

  if (node.type === 'GiveStatement') {
    return `${indent}return ${generateExpr(node.value)};`;
  }

  if (node.type === 'ExpressionStatement') {
    return `${indent}${generateExpr(node.expression)};`;
  }

  if (node.type === 'FunctionDeclaration') {
    const params = node.params.join(', ');
    const body = node.body
      .map(s => generateStatement(s, indent + '  '))
      .join('\n');
    return `${indent}function ${node.name}(${params}) {\n${body}\n${indent}}`;
  }

  if (node.type === 'IfStatement') {
    const left  = generateExpr(node.left);
    const right = generateExpr(node.right);
    const condition = `${left} ${node.operator} ${right}`;
    const consequentBody = node.consequent
      .map(s => generateStatement(s, indent + '  '))
      .join('\n');
    let out = `${indent}if (${condition}) {\n${consequentBody}\n${indent}}`;
    if (node.alternate) {
      const alternateBody = node.alternate
        .map(s => generateStatement(s, indent + '  '))
        .join('\n');
      out += ` else {\n${alternateBody}\n${indent}}`;
    }
    return out;
  }

  throw new Error(`Unknown statement type: ${node.type}`);
}

function generateExpr(node) {
  if (node.type === 'StringLiteral') {
    return JSON.stringify(node.value);
  }

  if (node.type === 'NumberLiteral') {
    return String(node.value);
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'BinaryExpression') {
    return `${generateExpr(node.left)} ${node.operator} ${generateExpr(node.right)}`;
  }

  if (node.type === 'CallExpression') {
    const args = node.args.map(generateExpr).join(', ');
    return `${node.name}(${args})`;
  }

  throw new Error(`Unknown expression type: ${node.type}`);
}

// Keep the old name as an alias so nothing breaks
const generateValue = generateExpr;

module.exports = { generate };
