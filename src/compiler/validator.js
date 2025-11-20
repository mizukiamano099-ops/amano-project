// validator.js
export function validateIR(ir) {
  const errors = [];
  const warnings = [];

  const allowedTypes = ["String", "Int", "Float", "Bool", "ID", "Timestamp"];
  const entityMap = new Map();

  for (const e of ir.entities) {
    if (entityMap.has(e.name)) {
      errors.push(`エンティティ名が重複: ${e.name}`);
    } else {
      entityMap.set(e.name, e);
    }
  }

  for (const e of ir.entities) {
    const fieldSet = new Set();

    for (const f of e.fields) {
      if (fieldSet.has(f.name)) {
        errors.push(`エンティティ "${e.name}" に重複フィールド: ${f.name}`);
      }
      fieldSet.add(f.name);

      if (!allowedTypes.includes(f.type)) {
        errors.push(
          `エンティティ "${e.name}" のフィールド "${f.name}" の型が不明: ${f.type}`
        );
      }
    }
  }

  for (const r of ir.relations) {
    if (!entityMap.has(r.from)) {
      errors.push(`リレーションの from 参照エラー: ${r.from}`);
    }
    if (!entityMap.has(r.to)) {
      errors.push(`リレーションの to 参照エラー: ${r.to}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
