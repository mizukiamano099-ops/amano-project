// src/compiler/canonicalizer.js
//
// AST -> IR への「正規化 / 構造統一」モジュール。
// 役割：パーサが吐いた AST（任意の形）を IR_SPEC.md に沿った
//       中間表現（IR）へ変換し、不要情報の除去／整形／型正規化を行う。
// 出力 IR のフォーマット（例）:
// {
//   type: 'IRDocument',
//   meta: { ... },
//   nodes: [{ id, type, attrs: {...} }, ...],
//   edges: [{ id, from, to, rel, attrs: {...} }, ...],
//   schemas: { optional per-node-type schema info },
//   warnings: [],
//   errors: []
// }
//
// ここでは実用的な処理（id自動付与、日付/uuid の型化、number/integer正規化、oneOf/anyOf/allOfの簡易処理）を実装します.

const util = require('util');

/**
 * メイン関数：parse()の出力 AST を受け取り、IR に変換する。
 * @param {object} ast - parser の出力（先に parse() を実行した AST）
 * @param {object} opts - オプション（strict, defaults, canonicalizeNumbers 等）
 * @returns {object} ir - 正規化された IR
 */
function canonicalize(ast, opts = {}) {
  const strict = !!opts.strict;

  const result = {
    type: 'IRDocument',
    meta: Object.assign({}, ast.meta || {}, opts.meta || {}),
    nodes: [],
    edges: [],
    schemas: ast.schemas || {},
    warnings: [],
    errors: []
  };

  // node の正規化パイプライン
  const idSet = new Set();
  for (const n of ast.nodes || []) {
    try {
      const nn = normalizeNode(n, result);
      // ID 重複チェック（自動解決 or エラー）
      if (!nn.id) {
        nn.id = generateId('node');
        result.warnings.push(`ノードに id が無かったため自動生成: ${nn.id}`);
      }
      if (idSet.has(nn.id)) {
        // strict モードならエラー
        const msg = `ノード id の重複: ${nn.id}`;
        if (strict) throw new Error(msg);
        // 非 strict なら自動ユニーク化
        const old = nn.id;
        nn.id = generateId(nn.id);
        result.warnings.push(`${msg} → 自動解決: ${old} -> ${nn.id}`);
      }
      idSet.add(nn.id);
      result.nodes.push(nn);
    } catch (e) {
      result.errors.push(`node 正規化失敗: ${e.message}`);
      if (strict) throw e;
    }
  }

  // edge の正規化（参照先存在チェックなど）
  for (const e of ast.edges || []) {
    try {
      const ee = normalizeEdge(e, result);
      // from/to が存在するかチェック
      if (!ee.from || !ee.to) {
        const msg = `エッジの from/to が不足: ${JSON.stringify(e)}`;
        if (strict) throw new Error(msg);
        result.warnings.push(msg);
      } else {
        if (!idSet.has(ee.from)) {
          result.warnings.push(`エッジの from が未定義のノード参照: ${ee.from}`);
        }
        if (!idSet.has(ee.to)) {
          result.warnings.push(`エッジの to が未定義のノード参照: ${ee.to}`);
        }
      }
      // id がなければ自動付与
      if (!ee.id) ee.id = generateId('edge');
      result.edges.push(ee);
    } catch (err) {
      result.errors.push(`edge 正規化失敗: ${err.message}`);
      if (strict) throw err;
    }
  }

  // 属性レベルでの正規化（数値の canonical, timestamp 型検出, enum 配列化 等）
  for (const n of result.nodes) {
    n.attrs = normalizeAttrs(n.attrs || {}, result);
  }
  for (const e of result.edges) {
    e.attrs = normalizeAttrs(e.attrs || {}, result);
  }

  // oneOf/anyOf/allOf の簡易処理
  handleUnionKeywords(result);

  // semantic-level checks: name collisions, reserved names, etc.
  performSemanticChecks(result);

  return result;
}

/**
 * ノード正規化：外形を制御し、attrs の正規化は別関数へ委譲。
 * @param {object} n
 * @param {object} doc
 */
function normalizeNode(n, doc) {
  // 想定される入力例：{ id, type, attrs, name, ... }
  const out = {};
  out.id = n.id || n.name || null;
  out.type = (n.type || n.kind || 'unknown').toString();
  // attrs は n.attrs があればそのまま、無ければ残りのプロパティを吸収
  out.attrs = n.attrs && typeof n.attrs === 'object' ? deepClone(n.attrs) : {};
  // 吸収パターン
  for (const k of Object.keys(n)) {
    if (!['id', 'name', 'type', 'kind', 'attrs'].includes(k)) {
      if (!(k in out.attrs)) out.attrs[k] = deepClone(n[k]);
    }
  }
  return out;
}

/**
 * エッジ正規化
 */
function normalizeEdge(e, doc) {
  const out = {};
  out.id = e.id || null;
  out.from = e.from || e.src || e.source || null;
  out.to = e.to || e.dst || e.target || null;
  out.rel = e.rel || e.relType || e.type || 'related';
  out.attrs = e.attrs && typeof e.attrs === 'object' ? deepClone(e.attrs) : {};
  return out;
}

/**
 * 属性の正規化処理
 * - number/int の正規化
 * - ISO8601判定 -> type: 'date-time'
 * - UUID 判定 -> type: 'uuid'
 * - enum の配列化
 */
function normalizeAttrs(attrs, doc) {
  const out = {};
  for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    // 文字列型の特別判定
    if (typeof v === 'string') {
      // ISO8601（ざっくり）: YYYY-MM-DDThh:mm:ssZ or with offset
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[\+\-]\d{2}:\d{2})?$/.test(v)) {
        out[k] = { type: 'date-time', value: v };
        continue;
      }
      // UUIDv4 簡易チェック
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
        out[k] = { type: 'uuid', value: v };
        continue;
      }
      // 長さ制約があり得る場合はヒントを残す
      out[k] = { type: 'string', value: v, maxLengthHint: Math.max(32, v.length) };
      continue;
    }
    // 数値
    if (typeof v === 'number') {
      if (Number.isInteger(v)) {
        out[k] = { type: 'integer', value: v };
      } else {
        out[k] = { type: 'number', value: v };
      }
      continue;
    }
    // 配列
    if (Array.isArray(v)) {
      out[k] = { type: 'array', value: v.slice() };
      continue;
    }
    // オブジェクト（ネスト）
    if (v && typeof v === 'object') {
      // special union handling likely here, but keep as object
      out[k] = { type: 'object', value: deepClone(v) };
      continue;
    }
    // boolean / null / undefined
    if (typeof v === 'boolean') {
      out[k] = { type: 'boolean', value: v };
      continue;
    }
    if (v === null) {
      out[k] = { type: 'null', value: null };
      continue;
    }
    // fallback
    out[k] = { type: typeof v, value: v };
  }
  return out;
}

/**
 * oneOf/anyOf/allOf に対する簡易処理
 *  - anyOf -> union 型のマーク
 *  - oneOf -> 最初の候補を採用（保守的）＋警告
 *  - allOf -> マージ可能ならマージ
 */
function handleUnionKeywords(doc) {
  for (const n of doc.nodes) {
    for (const [k, v] of Object.entries(n.attrs)) {
      if (!v || v.type !== 'object' || !v.value) continue;
      const obj = v.value;
      if (typeof obj !== 'object') continue;
      if (Array.isArray(obj.oneOf)) {
        // oneOf の最初を採用（より正確な処理は後段で）
        n.attrs[k] = { type: detectObjType(obj.oneOf[0]), value: obj.oneOf[0] };
        doc.warnings.push(`oneOf を簡易解決（最初を採用）: node=${n.id} attr=${k}`);
      } else if (Array.isArray(obj.anyOf)) {
        n.attrs[k] = { type: 'union', value: obj.anyOf.slice() };
        doc.warnings.push(`anyOf を union マーク: node=${n.id} attr=${k}`);
      } else if (Array.isArray(obj.allOf)) {
        // マージ可能なオブジェクトのみマージ
        const candidates = obj.allOf.filter(x => x && typeof x === 'object');
        if (candidates.length > 0) {
          const merged = Object.assign({}, ...candidates);
          n.attrs[k] = { type: 'object', value: merged };
          doc.warnings.push(`allOf をマージ: node=${n.id} attr=${k}`);
        }
      }
    }
  }
}

/**
 * 簡易セマンティックチェック
 * - 名前の衝突
 * - 予約語使用
 * - 関係性の循環（軽度の検出）
 */
function performSemanticChecks(doc) {
  const nameMap = new Map();
  for (const n of doc.nodes) {
    const name = (n.attrs && n.attrs.name && n.attrs.name.value) || n.id;
    if (nameMap.has(name)) {
      doc.warnings.push(`ノード名の衝突検出: ${name}`);
    } else {
      nameMap.set(name, n.id);
    }
  }

  // 片方向の軽い循環検出（深さ2程度）
  for (const e of doc.edges) {
    for (const e2 of doc.edges) {
      if (e.from === e2.to && e.to === e2.from && e.from !== e.to) {
        doc.warnings.push(`双方向エッジ検出（相互参照）: ${e.from} <-> ${e.to}`);
      }
    }
  }
}

/* ------------------------------
   ヘルパー関数群
   ------------------------------ */

/** 深い clone */
function deepClone(x) {
  return JSON.parse(JSON.stringify(x));
}

/** 文字列から推測して型名を返す（簡易） */
function detectObjType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  return typeof val;
}

/** ID 自動生成 */
let idCounter = 0;
function generateId(prefix = 'id') {
  idCounter++;
  return `${prefix}_${Date.now().toString(36)}_${(idCounter).toString(36)}`;
}

module.exports = { canonicalize };
