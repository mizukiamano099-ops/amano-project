// src/compiler/validator.js
//
// IR のスキーマ検証 & セマンティック検証モジュール。
// - スキーマレベル（必須フィールド、型の整合性）の検査
// - セマンティクス（ノード重複、エッジ先参照存在、数値レンジ、enum制約など）
// - 出力: { valid: boolean, errors: [], warnings: [] }
//
// この実装は堅牢な Validator の最小実装であり、プロジェクトの要件に合わせて
// ルールの追加・調整が可能です（例: number / integer の min/max チェック、pattern チェックなど）

/**
 * validateIR
 * @param {object} ir - canonicalizer が出力する IR
 * @param {object} opts - { strict: bool, semanticRules: {...} }
 * @returns {object} result - { valid, errors, warnings }
 */
function validateIR(ir, opts = {}) {
  const strict = !!opts.strict;
  const result = { valid: true, errors: [], warnings: [] };

  if (!ir || typeof ir !== 'object') {
    result.errors.push('IR が不正です（空またはオブジェクトではありません）。');
    result.valid = false;
    return result;
  }

  // 基本的な構造チェック
  if (!Array.isArray(ir.nodes)) {
    result.errors.push('IR.nodes が配列ではありません。');
  }
  if (!Array.isArray(ir.edges)) {
    result.errors.push('IR.edges が配列ではありません。');
  }
  if (result.errors.length) {
    result.valid = false;
    return result;
  }

  // ノード id の一意性チェック
  const idMap = new Map();
  for (const n of ir.nodes) {
    if (!n.id) {
      result.errors.push(`ノードに id がありません: ${JSON.stringify(n)}`);
      continue;
    }
    if (idMap.has(n.id)) {
      result.errors.push(`ノード id の重複: ${n.id}`);
    } else {
      idMap.set(n.id, n);
    }
    // 基本的な型チェック（type は文字列であること）
    if (typeof n.type !== 'string') {
      result.warnings.push(`ノード type が文字列ではありません: ${n.id}`);
    }
    // attrs はオブジェクトであるべき
    if (!n.attrs || typeof n.attrs !== 'object') {
      result.warnings.push(`ノード attrs がオブジェクトではありません: ${n.id}`);
    }
  }

  // エッジの from/to が存在するかチェック
  for (const e of ir.edges) {
    if (!e.id) {
      result.warnings.push(`エッジに id がないものがあります（自動付与推奨）: ${JSON.stringify(e)}`);
    }
    if (!e.from || !e.to) {
      result.errors.push(`エッジに from/to が指定されていません: ${JSON.stringify(e)}`);
      continue;
    }
    if (!idMap.has(e.from)) {
      result.errors.push(`エッジの from が未定義ノードを参照しています: ${e.from}`);
    }
    if (!idMap.has(e.to)) {
      result.errors.push(`エッジの to が未定義ノードを参照しています: ${e.to}`);
    }
  }

  // 属性レベルのセマンティックチェック（候補）
  // - 数値の min/max が attrs に指定されている場合、該当フィールド値の存在と範囲確認
  for (const n of ir.nodes) {
    for (const [k, v] of Object.entries(n.attrs || {})) {
      // v は canonicalizer によって { type, value, ... } の形であることを想定
      if (!v || typeof v !== 'object') continue;
      if (v.type === 'integer' || v.type === 'number') {
        // もし min/max が同じ属性オブジェクト内にある場合チェック（例: attrs.temperature.min）
        // ここでは簡易に attrs 内の `k_min` / `k_max` という命名規則で探す
        const minKey = `${k}_min`;
        const maxKey = `${k}_max`;
        if (n.attrs[minKey] && typeof n.attrs[minKey].value === 'number') {
          if (typeof v.value !== 'number' || v.value < n.attrs[minKey].value) {
            result.errors.push(`ノード ${n.id} の属性 ${k} が min 制約を満たしていません。value=${v.value} min=${n.attrs[minKey].value}`);
          }
        }
        if (n.attrs[maxKey] && typeof n.attrs[maxKey].value === 'number') {
          if (typeof v.value !== 'number' || v.value > n.attrs[maxKey].value) {
            result.errors.push(`ノード ${n.id} の属性 ${k} が max 制約を満たしていません。value=${v.value} max=${n.attrs[maxKey].value}`);
          }
        }
      }
      // enum 形式の検査：attrs に `${k}_enum` が配列であればチェック
      const enumKey = `${k}_enum`;
      if (n.attrs[enumKey] && Array.isArray(n.attrs[enumKey].value)) {
        const allowed = n.attrs[enumKey].value;
        if (!allowed.includes(v.value)) {
          result.errors.push(`ノード ${n.id} の属性 ${k} の値 ${v.value} は enum 制約に合致しません。allowed=${JSON.stringify(allowed)}`);
        }
      }
      // date-time 型の形式チェック（より厳密に）
      if (v.type === 'date-time') {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[\+\-]\d{2}:\d{2})?$/.test(v.value)) {
          result.warnings.push(`ノード ${n.id} の属性 ${k} の date-time 形式が曖昧です: ${v.value}`);
        }
      }
    }
  }

  // 最終判定
  if (result.errors.length > 0) result.valid = false;

  // Strict モードなら警告をエラーに昇格
  if (strict && result.warnings.length > 0) {
    result.errors.push(...result.warnings);
    result.warnings = [];
    result.valid = result.errors.length === 0;
  }

  return result;
}

module.exports = { validateIR };
