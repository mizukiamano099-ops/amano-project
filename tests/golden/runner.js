/**
 * ============================================================
 *  Golden Test Runner
 *  File: runner.js
 *  Purpose:
 *    - generator.js が生成した出力を読み取り、
 *      snapshots/*.ts の「ゴールデンファイル」と比較する。
 *    - 差分があれば FAIL、完全一致なら PASS とする。
 * ============================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Node.js の __dirname 対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ディレクトリ設定
const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
const OUTPUT_DIR = path.join(__dirname, "output"); // generator が書き出す

/**
 * ゴールデンファイル（正解）と生成物を比較するヘルパー関数
 */
function compareText(snapshotText, outputText) {
  // 行末の差異や余分な空行を吸収
  const norm = (s) => s.replace(/\r/g, "").trim();
  return norm(snapshotText) === norm(outputText);
}

/**
 * メイン処理
 */
async function main() {
  console.log("🔍 Running Golden Tests...");

  // 必須ディレクトリ確認
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error("❌ Error: output/ directory not found.");
    process.exit(1);
  }

  const outputFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".ts"));

  if (outputFiles.length === 0) {
    console.error("❌ Error: No output files found in tests/golden/output/");
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const file of outputFiles) {
    const snapshotPath = path.join(SNAPSHOT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    if (!fs.existsSync(snapshotPath)) {
      console.error(`❌ Snapshot not found for: ${file}`);
      failed++;
      continue;
    }

    const snapshotText = fs.readFileSync(snapshotPath, "utf8");
    const outputText = fs.readFileSync(outputPath, "utf8");

    const ok = compareText(snapshotText, outputText);

    if (ok) {
      console.log(`✅ PASS: ${file}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${file}`);
      failed++;

      console.log(`--- Snapshot (${file}) ---`);
      console.log(snapshotText);
      console.log(`--- Output (${file}) ---`);
      console.log(outputText);
    }
  }

  console.log("\n📊 Golden Test Summary");
  console.log(`   PASS: ${passed}`);
  console.log(`   FAIL: ${failed}`);

  if (failed > 0) {
    console.error("🔴 Golden Test Failed");
    process.exit(1);
  }

  console.log("🟢 All Golden Tests Passed!");
  process.exit(0);
}

// 実行
main();
