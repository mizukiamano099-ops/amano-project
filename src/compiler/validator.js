// validator.js
//
// IR（中間表現）のスキーマ検証およびセマンティクス（意味論）検証。
// 
// 役割：
//   1. エンティティ名の重複チェック
//   2. フィールド名の重複チェック
//   3. リレーションの参照整合性チェック
//   4. データ型の存在チェック
//
// 出力：
// { valid: true|false, errors: [], warnings: [] }

function validateIR(ir) {
  const errors = [];
  const warnings = [];

  const allowedTypes = ["String", "Int", "Float", "Bool", "ID", "Timestamp"];

  const entityMap = new Map();

  // -------------------------------------------------
  // 1. エンティティ名の重複チェック
  // -------------------------------------------------
  for (const e of ir.entities) {
    if (entityMap.has(e.name)) {
      errors.push(`エンティティ名が重複: ${e.name}`);
    } else {
      entityMap.set(e.name, e);
    }
  }

  // -------------------------------------------------
  // 2. フィールド名の重複チェック & 型チェック
  // -------------------------------------------------
  for (const e of ir.entities) {
    const fieldSet = new Set();

    for (const f of e.fields) {
      // フィールド重複
      if (fieldSet.has(f.name)) {
        errors.push(`エンティティ "${e.name}" に重複フィールド: ${f.name}`);
      }
      fieldSet.add(f.name);

      // 型チェック
      if (!allowedTypes.includes(f.type)) {
        errors.push(
          `エンティティ "${e.name}" のフィールド "${f.name}" の型が不明: ${f.type}`
        );
      }
    }
  }

  // -------------------------------------------------
  // 3. リレーション参照チェック
  // -------------------------------------------------
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

module.exports = { validateIR };
