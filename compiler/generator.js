// Generator: converts an AST into JavaScript source code

function generate(ast) {
  if (ast.type !== 'Program') {
    throw new Error(`Expected Program node, got ${ast.type}`);
  }

  return ast.body.map(generateStatement).join('\n');
}

function generateStatement(node) {
  if (node.type === 'RememberStatement') {
    return `const ${node.name} = ${generateValue(node.value)};`;
  }

  if (node.type === 'ShowStatement') {
    return `console.log(${generateValue(node.value)});`;
  }

  throw new Error(`Unknown statement type: ${node.type}`);
}

function generateValue(node) {
  if (node.type === 'StringLiteral') {
    return JSON.stringify(node.value);
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  throw new Error(`Unknown value type: ${node.type}`);
}

module.exports = { generate };
