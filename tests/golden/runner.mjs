/**
 * Golden Test Runner (ESM)
 * ------------------------------------------
 * - compileIR() の出力とスナップショット比較
 * - `--update` でスナップショット更新
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// compileIR の取得（絶対パス解決）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/compiler/index.js への絶対パス
const compilerPath = path.resolve(
  __dirname,
  "../../src/compiler/index.js"
);
const { compileIR } = await import(compilerPath);

// -------------------------
// 設定
// -------------------------
const INPUT_IR = path.join(__dirname, "tables/schema_zod_test.json");
const SNAPSHOT_FILE = path.join(
  __dirname,
  "snapshots/schema_zod_test.zod.ts"
);

// -------------------------
// CLI Options
// -------------------------
const args = process.argv.slice(2);
const UPDATE_MODE = args.includes("--update") || args.includes("-u");

// -------------------------
// Utility
// -------------------------
function readJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

function writeSnapshot(content) {
  fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, content, "utf-8");
}

function readSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return null;
  return fs.readFileSync(SNAPSHOT_FILE, "utf-8");
}

// -------------------------
// 実行
// -------------------------
(async () => {
  console.log("[GoldenTest] Loading IR:", INPUT_IR);

  const ir = readJSON(INPUT_IR);

  console.log("[GoldenTest] Generating output via compileIR()");
  const generatedCode = await compileIR(ir, "zod");

  const existingSnapshot = readSnapshot();

  if (UPDATE_MODE) {
    console.log("[GoldenTest] --update mode enabled");
    console.log("[GoldenTest] Writing new snapshot →", SNAPSHOT_FILE);
    writeSnapshot(generatedCode);
    console.log("[GoldenTest] Snapshot updated successfully.");
    return;
  }

  if (!existingSnapshot) {
    console.error("[GoldenTest] ERROR: Snapshot does not exist.");
    console.error("Run with:");
    console.error("  node runner.mjs --update");
    process.exit(1);
  }

  if (existingSnapshot.trim() !== generatedCode.trim()) {
    console.error("[GoldenTest] ❌ Snapshot mismatch detected!");
    console.error("Run:");
    console.error("  node runner.mjs --update");
    process.exit(1);
  }

  console.log("[GoldenTest] ✅ Snapshot match! No differences.");
})();
