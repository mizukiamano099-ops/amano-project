/**
 * Golden Test Runner
 * ------------------------
 * - ZodEmitter の出力とスナップショットの比較を行う
 * - `--update` フラグでスナップショットを自動更新
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// CLI パイプライン（既存）
import { compileIR } from "../../src/cli/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------
// 設定
// -------------------------
const INPUT_IR = path.join(__dirname, "tables/schema_zod_test.json");
const SNAPSHOT_FILE = path.join(
  __dirname,
  "snapshots/schema_zod_test.zod.ts"
);

// -------------------------
// コマンドライン引数
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
  const generatedCode = await compileIR(ir, "zod"); // emitterType: zod

  const existingSnapshot = readSnapshot();

  if (UPDATE_MODE) {
    console.log("[GoldenTest] --update mode enabled");
    console.log("[GoldenTest] Writing new snapshot →", SNAPSHOT_FILE);
    writeSnapshot(generatedCode);
    console.log("[GoldenTest] Snapshot updated successfully.");
    return;
  }

  // -------------------------
  // 比較モード（差分あり → エラー）
  // -------------------------
  if (!existingSnapshot) {
    console.error("[GoldenTest] ERROR: Snapshot file does not exist.");
    console.error("           Run with --update to create it:");
    console.error("           node runner.js --update");
    process.exit(1);
  }

  if (existingSnapshot.trim() !== generatedCode.trim()) {
    console.error("[GoldenTest] ❌ Snapshot mismatch detected!");
    console.error("Run with: node runner.js --update");
    process.exit(1);
  }

  console.log("[GoldenTest] ✅ Snapshot match! No differences.");
})();
