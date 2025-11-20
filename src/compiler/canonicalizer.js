// canonicalizer.js
export function canonicalize(ast) {
  const ir = {
    meta: ast.meta || {},
    entities: [],
    relations: []
  };

  for (const node of ast.nodes) {
    if (node.type === "Entity") {
      const entity = {
        name: node.name,
        fields: []
      };

      for (const child of node.children || []) {
        if (child.type === "Field") {
          entity.fields.push({
            name: child.name,
            type: child.dataType,
            required: !!child.required
          });
        }
      }

      ir.entities.push(entity);
    }
  }

  for (const node of ast.nodes) {
    if (node.type === "Relation") {
      ir.relations.push({
        from: node.from,
        to: node.to,
        rel: node.relationType
      });
    }
  }

  return ir;
}
