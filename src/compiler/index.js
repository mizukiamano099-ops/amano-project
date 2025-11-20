// src/compiler/index.js
//
// Compiler pipeline のエントリポイント
// Lex -> Parse -> Canonicalize を一貫して実行するユーティリティ。
// 小さい CLI も実装しており、ファイルを読み込んで canonical IR を JSON 出力できます。

const fs = require('fs');
const path = require('path');
const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { canonicalize } = require('./canonicalizer');

/**
 * パイプライン：テキスト入力から最終正規化 IR を返す
 * @param {string} text
 * @param {object} [opts]
 */
function compileText(text, opts = {}) {
  // 1) ぱっと確認できる簡易的トークン列（デバッグ用）
  const tokens = tokenize(text);

  // 2) パース
  const ir = parse(text);

  // 3) 正規化
  const canonical = canonicalize(ir, opts);

  return { tokens, ir, canonical };
}

/**
 * ファイルからコンパイルして結果をファイルへ保存するユーティリティ
 * @param {string} inputPath
 * @param {string} outPath - JSON 出力先
 */
function compileFile(inputPath, outPath) {
  const txt = fs.readFileSync(inputPath, 'utf-8');
  const res = compileText(txt, { strict: false });
  fs.writeFileSync(outPath, JSON.stringify(res.canonical, null, 2), 'utf-8');
  return res;
}

/**
 * 簡易 CLI 実装
 * node src/compiler/index.js input.txt out.json
 */
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.log('Usage: node src/compiler/index.js <input-file> [<out-json>]');
    process.exit(1);
  }
  const input = argv[0];
  const out = argv[1] || path.basename(input, path.extname(input)) + '.canonical.json';
  try {
    const res = compileFile(input, out);
    console.log('Canonical IR written to', out);
    if (process.env.DEBUG_TOKENS === '1') {
      console.log('Tokens:', JSON.stringify(res.tokens, null, 2));
      console.log('IR:', JSON.stringify(res.ir, null, 2));
    }
  } catch (err) {
    console.error('Compile error:', err.message);
    process.exit(2);
  }
}

// エクスポート
module.exports = {
  compileText,
  compileFile
};
