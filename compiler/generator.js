// Generator: converts a Plain AST into JavaScript source code.

function generate(ast) {
  if (ast.type !== 'Program') {
    throw new Error(`Expected a Program node but got "${ast.type}".`);
  }
  return ast.body.map(node => generateStatement(node)).join('\n');
}

function generateStatement(node, indent = '') {
  switch (node.type) {
    case 'RememberStatement':
      return `${indent}const ${node.name} = ${generateExpr(node.value)};`;

    case 'ShowStatement':
      return `${indent}console.log(${generateExpr(node.value)});`;

    case 'GiveStatement':
      return `${indent}return ${generateExpr(node.value)};`;

    case 'ExpressionStatement':
      return `${indent}${generateExpr(node.expression)};`;

    case 'FunctionDeclaration': {
      const params = node.params.join(', ');
      const body   = node.body.map(s => generateStatement(s, indent + '  ')).join('\n');
      return `${indent}function ${node.name}(${params}) {\n${body}\n${indent}}`;
    }

    case 'IfStatement': {
      const condition     = `${generateExpr(node.left)} ${node.operator} ${generateExpr(node.right)}`;
      const consequent    = node.consequent.map(s => generateStatement(s, indent + '  ')).join('\n');
      let out = `${indent}if (${condition}) {\n${consequent}\n${indent}}`;
      if (node.alternate) {
        const alternate = node.alternate.map(s => generateStatement(s, indent + '  ')).join('\n');
        out += ` else {\n${alternate}\n${indent}}`;
      }
      return out;
    }

    default:
      throw new Error(`Unknown statement type "${node.type}".`);
  }
}

function generateExpr(node) {
  switch (node.type) {
    case 'StringLiteral':    return JSON.stringify(node.value);
    case 'NumberLiteral':    return String(node.value);
    case 'Identifier':       return node.name;
    case 'BinaryExpression': return `${generateExpr(node.left)} ${node.operator} ${generateExpr(node.right)}`;
    case 'CallExpression':   return `${node.name}(${node.args.map(generateExpr).join(', ')})`;
    default:
      throw new Error(`Unknown expression type "${node.type}".`);
  }
}

module.exports = { generate };
