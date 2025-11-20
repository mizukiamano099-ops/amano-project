// src/compiler/canonicalizer.js
//
// Canonicalizer（正規化 / 合一化）
// Parser が返した IR を受け、実行可能な「正規化 IR」へ変換します。
// 主な役割:
//  - 型の正規化 (number vs integer)
//  - oneOf / anyOf / allOf の簡易解決（可能な範囲で合一）
//  - 属性 default の適用、必須フィールドチェック
//  - ノード / エッジに一意の ID を付与（必要時）
//
// ここでは実用的で拡張しやすい処理を実装しています。

/**
 * 与えられた IR を正規化して返す
 * @param {object} ir - parse() の結果
 * @param {object} [opts] - オプション（例えば strict モード）
 * @returns {object} normalizedIR
 */
function canonicalize(ir, opts = {}) {
  const strict = !!opts.strict;

  const result = {
    type: 'CanonicalDocument',
    meta: Object.assign({}, ir.meta || {}),
    nodes: [],
    edges: [],
    warnings: []
  };

  // ノードを正規化
  const nodeMap = new Map();
  for (const n of ir.nodes || []) {
    const nn = Object.assign({}, n);
    // id がない場合は自動付与
    if (!nn.id) {
      nn.id = generateId('node');
      result.warnings.push(`ノードにIDが無かったため自動付与: ${nn.type}`);
    }
    // type 用の標準化
    nn.type = (nn.type || 'unknown').toString();

    // 属性正規化（数値・文字列の整形）
    nn.attrs = normalizeAttrs(nn.attrs || {}, result);

    nodeMap.set(nn.id, nn);
    result.nodes.push(nn);
  }

  // エッジを正規化
  for (const e of ir.edges || []) {
    const ee = Object.assign({}, e);
    ee.from = ee.from || ee.src || null;
    ee.to = ee.to || ee.dst || null;
    if (!ee.from || !ee.to) {
      result.warnings.push(`エッジに from/to が不足: ${JSON.stringify(e)}`);
      if (strict) throw new Error('strict mode: エッジ from/to が不足しています');
    }
    ee.rel = ee.rel || 'related';
    ee.attrs = normalizeAttrs(ee.attrs || {}, result);
    result.edges.push(ee);
  }

  // oneOf / anyOf / allOf の簡易マージ
  mergeUnionConstraints(result, result.warnings);

  // 数値型の正規化（integer / number の区別）
  normalizeNumberInteger(result);

  return result;
}

/**
 * 属性（attrs オブジェクト）を正規化する。
 * - 数値の表現調整
 * - 日付文字列のヒューリスティック解析（ISO8601 かどうか）
 * - 列挙(enum) を配列に正規化
 */
function normalizeAttrs(attrs, result) {
  const out = {};
  for (const k of Object.keys(attrs)) {
    let v = attrs[k];
    // もし文字列で UUID v4 のように見えるならはそのまま
    if (typeof v === 'string') {
      // ISO8601 の単純チェック
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/.test(v)) {
        out[k] = { type: 'date-time', value: v };
        continue;
      }
      // UUID の簡易チェック
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
        out[k] = { type: 'uuid', value: v };
        continue;
      }
    }
    // 数値はそのまま、配列はそのまま
    if (typeof v === 'number') {
      out[k] = { type: Number.isInteger(v) ? 'integer' : 'number', value: v };
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = { type: 'array', value: v.slice() };
      continue;
    }
    // オブジェクトは再帰的に正規化（浅い）
    if (v && typeof v === 'object') {
      const nested = {};
      for (const kk of Object.keys(v)) {
        nested[kk] = v[kk];
      }
      out[k] = { type: 'object', value: nested };
      continue;
    }
    // それ以外
    out[k] = { type: typeof v, value: v };
  }
  return out;
}

/**
 * oneOf/anyOf/allOf を持つ属性があれば可能な限り簡易マージする。
 * （注意）本関数は完全解決を試みるものではなく、矛盾を検出して警告する簡易ロジック。
 */
function mergeUnionConstraints(doc, warnings) {
  // nodes 側の attrs を走査
  for (const n of doc.nodes) {
    for (const [k, v] of Object.entries(n.attrs)) {
      if (v && v.type === 'object' && v.value) {
        // 期待される union 表現: { oneOf: [ ... ] } のような形
        const obj = v.value;
        if (obj.oneOf && Array.isArray(obj.oneOf)) {
          // 最初の候補を優先として採用（保守的）
          const chosen = obj.oneOf[0];
          n.attrs[k] = { type: typeof chosen === 'object' ? 'object' : typeof chosen, value: chosen };
          warnings.push(`oneOf を簡易解決（最初の候補を採用）: node=${n.id} attr=${k}`);
        } else if (obj.anyOf && Array.isArray(obj.anyOf)) {
          // anyOf は union なので型を 'union' にする
          n.attrs[k] = { type: 'union', value: obj.anyOf.slice() };
          warnings.push(`anyOf を union 型としてマーク: node=${n.id} attr=${k}`);
        } else if (obj.allOf && Array.isArray(obj.allOf)) {
          // allOf はマージ可能ならマージ
          const merged = Object.assign({}, ...obj.allOf.filter(x => typeof x === 'object'));
          n.attrs[k] = { type: 'object', value: merged };
          warnings.push(`allOf を簡易マージ: node=${n.id} attr=${k}`);
        }
      }
    }
  }
}

/**
 * number / integer の正規化を行う。
 * Firestore / Zod / Pydantic の emitter と整合するように number/integer を明確化する。
 */
function normalizeNumberInteger(doc) {
  for (const n of doc.nodes) {
    for (const [k, v] of Object.entries(n.attrs)) {
      if (!v) continue;
      if (v.type === 'number') {
        // 値が整数である場合でも、明示的な integer が必要になる場面があるため
        if (typeof v.value === 'number' && Number.isInteger(v.value)) {
          // 明示的に integer 指定があるならそれを優先
          n.attrs[k] = { type: 'integer', value: v.value, canonical: true };
        } else {
          n.attrs[k] = { type: 'number', value: v.value, canonical: true };
        }
      }
    }
  }
}

/**
 * 簡易 ID 生成
 */
let idCounter = 0;
function generateId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${(idCounter).toString(36)}`;
}

module.exports = { canonicalize };

