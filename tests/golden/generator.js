/**
 * ============================================================
 *  Golden Test Generator
 *  File: generator.js
 *  Purpose:
 *    - Load IR mock data from tests/golden/tables/
 *    - Run full compiler pipeline (lexer → parser → canonicalizer → validator)
 *    - Use ZodEmitter to generate TypeScript Zod schemas
 *    - Write output to tests/golden/output/
 * ============================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { compileIR } from "../../src/compiler/index.js"; // Compiler entry
import { ZodEmitter } from "../../src/emitters/zod/zod-emitter.js";

// Node.js の __dirname 対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ディレクトリ設定
const TABLES_DIR = path.join(__dirname, "tables");
const OUTPUT_DIR = path.join(__dirname, "output");

// 出力ディレクトリを確実に作成
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ファイル読み込み
function loadIR(fileName) {
  const filePath = path.join(TABLES_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`IR file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function main() {
  console.log("🔧 Running Golden Test Generator...");

  ensureDir(OUTPUT_DIR);

  // すべての IR テーブルを処理
  const irFiles = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith(".json"));

  for (const file of irFiles) {
    console.log(`📄 Processing IR: ${file}`);

    const ir = loadIR(file);

    // Zod エミッタを作成
    const emitter = new ZodEmitter();

    // コンパイル（IR → Zodコード）
    const code = await compileIR(ir, emitter);

    // 出力ファイル名設定
    const baseName = file.replace(".json", ".zod.ts");
    const outPath = path.join(OUTPUT_DIR, baseName);

    fs.writeFileSync(outPath, code, "utf8");

    console.log(`✨ Generated: ${outPath}`);
  }

  console.log("🟢 Golden Test Generation Complete.");
}

main();
