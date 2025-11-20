/**
 * Golden Test Runner
 * -------------------
 * generator.js が生成したスナップショットを、
 * snapshots/ 以下の「ゴールデンファイル」と比較するテストランナー。
 *
 * - ディレクトリ: tests/golden/
 * - 入力: tables/*.json  (IR mock)
 * - 生成物: out/*.ts     (Zod emitter の生成結果)
 * - 比較対象: snapshots/*.ts
 *
 * 実行方法:
 *   node tests/golden/runner.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname);
const TABLE_DIR = path.join(ROOT, "tables");
const OUT_DIR = path.join(ROOT, "out");
const SNAPSHOT_DIR = path.join(ROOT, "snapshots");
const GENERATOR = path.join(ROOT, "generator.js");

// 出力ディレクトリがなければ作成
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

/**
 * ゴールデンファイル比較関数
 */
function compareFiles(generatedPath, goldenPath) {
  const generated = fs.readFileSync(generatedPath, "utf8").trim();
  const golden = fs.readFileSync(goldenPath, "utf8").trim();

  return generated === golden;
}

/**
 * テストケース実行
 */
function runTests() {
  console.log("=== Running Golden Tests ===");

  const cases = fs
    .readdirSync(TABLE_DIR)
    .filter((f) => f.endsWith(".json"));

  if (cases.length === 0) {
    console.error("No test cases found in tests/golden/tables");
    process.exit(1);
  }

  let failed = 0;

  for (const testCase of cases) {
    const name = testCase.replace(".json", "");
    const inputPath = path.join(TABLE_DIR, testCase);
    const outPath = path.join(OUT_DIR, `${name}.zod.ts`);
    const snapshotPath = path.join(SNAPSHOT_DIR, `${name}.zod.ts`);

    console.log(`\n--- Test Case: ${name} ---`);

    // generator.js を実行してコードを生成
    try {
      execSync(`node ${GENERATOR} ${inputPath} ${outPath}`, {
        stdio: "inherit",
      });
    } catch (err) {
      console.error("❌ Error executing generator.js:", err);
      failed++;
      continue;
    }

    // スナップショットの存在確認
    if (!fs.existsSync(snapshotPath)) {
      console.error(`❌ Missing snapshot: ${snapshotPath}`);
      failed++;
      continue;
    }

    // 差分比較
    const ok = compareFiles(outPath, snapshotPath);
    if (ok) {
      console.log("✅ PASSED");
    } else {
      console.log("❌ FAILED");
      console.log(`Generated:  ${outPath}`);
      console.log(`Expected:   ${snapshotPath}`);
      failed++;
    }
  }

  console.log("\n=== Golden Tests Completed ===");
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} test(s)`);
    process.exit(1);
  } else {
    console.log("🎉 All tests passed!");
    process.exit(0);
  }
}

// 実行
runTests();
