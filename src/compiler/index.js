// -----------------------------------------------------------------------------
// index.js (ESM)
// コンパイラのエントリポイント。
// lexer → parser → canonicalizer → validator → emitter
// -----------------------------------------------------------------------------

import { canonicalize } from "./canonicalizer.js";
import { validateIR } from "./validator.js";
import { parse } from "./parser.js";
import { tokenize } from "./lexer.js";

// Emitter
import { ZodEmitter } from "../emitters/zod/zod-emitter.js";

// 今後増えるエミッタをここに登録する
const EMITTERS = {
  zod: ZodEmitter,
};

// -----------------------------------------------------------------------------
// import 解決（DSL ファイル用）
// -----------------------------------------------------------------------------
import fs from "fs";
import path from "path";

export function resolveImports(filePath, visited = new Set()) {
  const abs = path.resolve(filePath);

  if (visited.has(abs)) {
    throw new Error(`循環 import が検出されました: ${abs}`);
  }
  visited.add(abs);

  const dir = path.dirname(abs);
  const text = fs.readFileSync(abs, "utf8");
  const lines = text.split(/\r?\n/);

  let out = [];

  for (const line of lines) {
    const m = line.match(/^\s*@import\s+"(.+?)"\s*;/);
    if (m) {
      const importPath = path.resolve(dir, m[1]);
      const imported = resolveImports(importPath, visited);
      out.push(imported);
    } else {
      out.push(line);
    }
  }

  return out.join("\n");
}

// -----------------------------------------------------------------------------
// compileIR（Golden Test/CLI用）
// ir: JSON IR
// emitterType: "zod" など
// -----------------------------------------------------------------------------
export async function compileIR(ir, emitterType = "zod") {
  if (!EMITTERS[emitterType]) {
    throw new Error(`Emitter '${emitterType}' が存在しません。`);
  }

  // 1️⃣ IR 検証
  validateIR(ir);

  // 2️⃣ Emitter 生成
  const emitter = new EMITTERS[emitterType]();

  // 3️⃣ コード生成
  const result = emitter.emit(ir);

  return result;
}

// -----------------------------------------------------------------------------
// compile(sourceFile, emitterType)
// DSL ファイルを読み込んで実行する CLI 用
// -----------------------------------------------------------------------------
export async function compile(sourceFile, emitterType = "zod") {
  const source = resolveImports(sourceFile);

  // 1. 字句解析
  const tokens = tokenize(source);

  // 2. パース → AST
  const ast = parse(tokens);

  // 3. AST → IR
  const ir = canonicalize(ast);

  // 4. IR 検証
  validateIR(ir);

  // 5. 出力
  return compileIR(ir, emitterType);
}
