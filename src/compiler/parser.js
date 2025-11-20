// src/compiler/parser.js
//
// シンプルなパーサ（構文解析器）
// lexer の出力トークン列を受け取り、IR（抽象構文木）を生成します。
// 入力は YAML 風のキー: 値構造、配列（- item）、及び簡易オブジェクトを想定しています。
// 返却される IR は以下の形を目標とします：
// {
//   type: 'Document',
//   nodes: [ { id, type, attrs: { ... } }, ... ],
//   edges: [ { from, to, rel, attrs }, ... ],
//   meta: { ... }
// }

const { tokenize } = require('./lexer');

/**
 * トークン列を保持する小さなヘルパークラス
 */
class TokenStream {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  peek(n = 0) {
    return this.tokens[this.pos + n] || { type: 'EOF', value: null };
  }
  next() {
    return this.tokens[this.pos++] || { type: 'EOF', value: null };
  }
  expect(type, value = undefined) {
    const t = this.next();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`構文解析エラー: 期待 ${type}${value ? ':'+value : ''} が行 ${t.line} col ${t.col} で得られた ${t.type}:${t.value}`);
    }
    return t;
  }
}

/**
 * 入力文字列（DSL）をパースして IR を返す
 * @param {string} input - 入力テキスト
 * @returns {object} ir - 生成された IR
 */
function parse(input) {
  // まずトークナイズ（lexer を呼ぶ）
  const tokens = tokenize(input);
  const stream = new TokenStream(tokens);

  // ドキュメントレベルの初期化
  const ir = {
    type: 'Document',
    meta: {},
    nodes: [],
    edges: []
  };

  // 主に YAML風のキー:値を読み取る単純なパーサ
  while (stream.peek().type !== 'EOF') {
    // 空行スキップ
    if (stream.peek().type === 'NEWLINE') {
      stream.next();
      continue;
    }

    // トップレベルの識別子（例：nodes:, edges:, meta:）
    const token = stream.peek();
    if (token.type === 'IDENT' && stream.peek(1).type === 'PUNC' && stream.peek(1).value === ':') {
      const key = stream.next().value; // IDENT
      stream.next(); // consume ':'
      // 値の読み取り
      if (key === 'nodes') {
        const arr = parseArrayBlock(stream);
        for (const item of arr) {
          // item はオブジェクト期待
          if (item && item.type === 'object') {
            ir.nodes.push(normalizeNode(item.value));
          }
        }
      } else if (key === 'edges') {
        const arr = parseArrayBlock(stream);
        for (const item of arr) {
          if (item && item.type === 'object') {
            ir.edges.push(normalizeEdge(item.value));
          }
        }
      } else if (key === 'meta') {
        const obj = parseInlineOrBlockObject(stream);
        ir.meta = Object.assign(ir.meta, obj);
      } else {
        // 任意キー：可能性として nodes の簡易指定など
        const val = parseInlineOrBlockObject(stream);
        ir.meta[key] = val;
      }
      continue;
    }

    // もし IDENT の後に改行や EOF が来るだけならスキップ
    // それ以外は無視可能な行とみなす
    // consume a line
    while (stream.peek().type !== 'NEWLINE' && stream.peek().type !== 'EOF') {
      stream.next();
    }
  }

  return ir;
}

/**
 * 配列ブロックを読み取る
 * 例:
 * nodes:
 *  - id: node1
 *    type: thing
 *  - id: node2
 */
function parseArrayBlock(stream) {
  const items = [];
  // 1 行の空白を許容しつつ、先頭が '-' で始まる連続を読む
  while (true) {
    // skip NEWLINEs
    if (stream.peek().type === 'NEWLINE') {
      stream.next();
      continue;
    }
    const p = stream.peek();
    if (p.type === 'PUNC' && p.value === '-') {
      stream.next(); // consume '-'
      // 次はオブジェクト（インライン or ブロック）
      const item = parseInlineOrBlockObject(stream);
      items.push({ type: item && typeof item === 'object' ? 'object' : 'value', value: item });
      // 改行または次の - を待つ
      continue;
    } else {
      break;
    }
  }
  return items;
}

/**
 * インラインオブジェクト or ブロックオブジェクトを読む。
 * - キー: 値 の連続をオブジェクトにする。
 * - 値が '[' なら配列、'{' ならオブジェクト、STRING/NUMBER/IDENT/BOOLEAN ならそのまま。
 */
function parseInlineOrBlockObject(stream) {
  // skip whitespace/newlines
  while (stream.peek().type === 'NEWLINE') stream.next();

  // もし次が IDENT + ':' の形なら、ブロックオブジェクト
  if (stream.peek().type === 'IDENT' && stream.peek(1).type === 'PUNC' && stream.peek(1).value === ':') {
    const obj = {};
    // 読めるだけキー: 値 を繰り返す
    while (stream.peek().type === 'IDENT' && stream.peek(1).type === 'PUNC' && stream.peek(1).value === ':') {
      const key = stream.next().value;
      stream.next(); // :
      // 値を読む（単純：STRING/NUMBER/BOOLEAN/IDENT または [ ... ] または { ... }）
      const val = parseValue(stream);
      obj[key] = val;
      // skip possible NEWLINE
      while (stream.peek().type === 'NEWLINE') stream.next();
    }
    return obj;
  }

  // それ以外は単一値を返す
  return parseValue(stream);
}

/**
 * 値を解析する：配列/オブジェクト/文字列/数値/識別子/ブール
 */
function parseValue(stream) {
  const t = stream.peek();
  if (t.type === 'STRING') {
    stream.next();
    return t.value;
  }
  if (t.type === 'NUMBER') {
    stream.next();
    return t.value;
  }
  if (t.type === 'BOOLEAN') {
    stream.next();
    return t.value;
  }
  if (t.type === 'NULL') {
    stream.next();
    return null;
  }
  if (t.type === 'PUNC' && t.value === '[') {
    // 配列解析
    stream.next(); // consume [
    const arr = [];
    while (stream.peek().type !== 'PUNC' || stream.peek().value !== ']') {
      const v = parseValue(stream);
      arr.push(v);
      if (stream.peek().type === 'PUNC' && stream.peek().value === ',') {
        stream.next(); // consume comma
      } else {
        // 続行
      }
    }
    stream.expect('PUNC', ']');
    return arr;
  }
  if (t.type === 'PUNC' && t.value === '{') {
    // オブジェクト解析（JSONスタイル）
    stream.next(); // consume {
    const obj = {};
    while (stream.peek().type !== 'PUNC' || stream.peek().value !== '}') {
      // key
      const keyTok = stream.next();
      if (keyTok.type !== 'STRING' && keyTok.type !== 'IDENT') {
        throw new Error(`構文解析エラー: オブジェクトのキーが期待されました (line ${keyTok.line})`);
      }
      const key = keyTok.value;
      stream.expect('PUNC', ':');
      const val = parseValue(stream);
      obj[key] = val;
      if (stream.peek().type === 'PUNC' && stream.peek().value === ',') {
        stream.next();
      } else {
        // nothing
      }
    }
    stream.expect('PUNC', '}');
    return obj;
  }

  // 最後に bare IDENT を取り出す（例: nodeId）
  if (t.type === 'IDENT') {
    stream.next();
    return t.value;
  }

  // もしここまで来ても値がない場合は null を返す
  return null;
}

/**
 * ノード情報の正規化
 * 入力オブジェクト（id, type, attrs...）を IR ノードに整形する。
 * @param {object} obj
 */
function normalizeNode(obj) {
  const node = {
    id: obj.id || obj.name || null,
    type: obj.type || obj.kind || 'unknown',
    attrs: Object.assign({}, obj.attrs || {}, {
      // よく使うキーがあれば浅くコピーする
    })
  };
  // 追加的に残りのプロパティを attrs に吸収
  for (const k of Object.keys(obj)) {
    if (!['id', 'name', 'type', 'kind', 'attrs'].includes(k)) {
      node.attrs[k] = obj[k];
    }
  }
  return node;
}

/**
 * エッジ情報の正規化
 * @param {object} obj
 */
function normalizeEdge(obj) {
  const edge = {
    from: obj.from || obj.src || obj.source || null,
    to: obj.to || obj.dst || obj.target || null,
    rel: obj.rel || obj.type || 'related',
    attrs: Object.assign({}, obj.attrs || {})
  };
  for (const k of Object.keys(obj)) {
    if (!['from', 'to', 'src', 'dst', 'target', 'rel', 'type', 'attrs'].includes(k)) {
      edge.attrs[k] = obj[k];
    }
  }
  return edge;
}

module.exports = {
  parse,
  // 便利に lexer を直接もエクスポート
  tokenize: (s) => tokenize(s)
};
