// index.js
//
// コンパイラのエントリポイント。
// compile(sourceCode, emitterType) を公開し、
// lexer → parser → canonicalizer → validator → emitter
// のフルパイプラインを実行する。

const { tokenize } = require("./lexer");
const { parse } = require("./parser");
const { canonicalize } = require("./canonicalizer");
const { validateIR } = require("./validator");
const fs = require("fs");
const path = require("path");

// -----------------------------------------------------
// import 解決用プリプロセッサ
// -----------------------------------------------------
function resolveImports(filePath, visited = new Set()) {
  const abs = path.resolve(filePath);
  if (visited.has(abs)) {
    throw new Error("循環 import が検出されました: " + abs);
  }
  visited.add(abs);

  const dir = path.dirname(abs);
  const text = fs.readFileSync(abs, "utf8");
  const lines = text.split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    const m = line.match(/^\s*@import\s+["'](.+?)["']/);
    if (m) {
      const target = m[1];
      const targetPath = path.isAbsolute(target)
        ? target
        : path.join(dir, target);

      if (!fs.existsSync(targetPath)) {
        throw new Error(`import 先が存在しません: ${targetPath}`);
      }

      out.push(resolveImports(targetPath, visited));
    } else {
      out.push(line);
    }
  }

  return out.join("\n");
}

// -----------------------------------------------------
// メインコンパイル関数
// -----------------------------------------------------
async function compile(sourceCode, emitterType = null) {
  // lexer: tokenize
  const tokens = tokenize(sourceCode);

  // parser: AST生成
  const ast = parse(sourceCode);

  // canonicalizer: AST → IR
  const ir = canonicalize(ast);

  // validator: IR検証
  const validation = validateIR(ir);
  if (!validation.valid) {
    throw new Error(
      "IR 検証エラー:\n" + validation.errors.map(e => " - " + e).join("\n")
    );
  }

  // emitter: 必要ならコード生成
  if (emitterType) {
    const emitterPath = path.resolve(
      __dirname,
      "..",
      "emitters",
      emitterType,
      `${emitterType}-emitter.js`
    );

    if (!fs.existsSync(emitterPath)) {
      throw new Error("指定されたエミッタが存在しません: " + emitterPath);
    }

    const emitter = require(emitterPath);
    if (typeof emitter.emit !== "function") {
      throw new Error("emitter は emit(ir) を export する必要があります");
    }

    const generated = await emitter.emit(ir);
    return { ir, generated };
  }

  return { ir };
}

module.exports = {
  compile,
  resolveImports
};
