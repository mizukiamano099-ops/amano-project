// canonicalizer.js
//
// AST（parser.js の出力）を IR（中間表現）に変換する。
// IR_SPEC.md に準拠し、不要な情報を削除し、
// import 展開済みのすべての AST を統合した一つの IR に変換する。
// 
// 出力フォーマットの例：
// {
//   meta: { version: "2.2", ... },
//   entities: [
//     {
//       name: "User",
//       fields: [
//         { name: "id", type: "String", required: true },
//         { name: "age", type: "Int", required: false },
//       ]
//     }
//   ],
//   relations: [
//     { from: "User", to: "Book", rel: "hasMany" }
//   ]
// }

function canonicalize(ast) {
  const ir = {
    meta: ast.meta || {},
    entities: [],
    relations: []
  };

  // ----------------------------
  // 1. Entity ノードの正規化
  // ----------------------------
  for (const node of ast.nodes) {
    if (node.type === "Entity") {
      const entity = {
        name: node.name,
        fields: []
      };

      // Field ノードを抽出
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

  // ----------------------------
  // 2. Relation ノードの正規化
  // ----------------------------
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

module.exports = { canonicalize };
