// Generator: converts an AST into JavaScript source code

function generate(ast) {
  if (ast.type !== 'Program') {
    throw new Error(`Expected Program node, got ${ast.type}`);
  }
  return ast.body.map(s => generateStatement(s)).join('\n');
}

function generateStatement(node, indent = '') {
  if (node.type === 'RememberStatement') {
    return `${indent}const ${node.name} = ${generateValue(node.value)};`;
  }

  if (node.type === 'ShowStatement') {
    return `${indent}console.log(${generateValue(node.value)});`;
  }

  if (node.type === 'IfStatement') {
    const left  = generateValue(node.left);
    const right = generateValue(node.right);
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

function generateValue(node) {
  if (node.type === 'StringLiteral') {
    return JSON.stringify(node.value);
  }

  if (node.type === 'NumberLiteral') {
    return String(node.value);
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  throw new Error(`Unknown value type: ${node.type}`);
}

module.exports = { generate };
