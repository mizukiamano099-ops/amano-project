/**
 * tests/golden/runner.js
 *
 * Golden Test Runner（--update フラグ対応版）
 *
 * 機能:
 *  - tests/golden/output/*.ts を tests/golden/snapshots/*.ts と比較する
 *  - 差分があれば FAIL（exit code 1）
 *  - --update を付けると、出力ファイルで snapshots を上書き（更新）する
 *  - オプション:
 *      --output <dir>     デフォルト: tests/golden/output
 *      --snapshots <dir>  デフォルト: tests/golden/snapshots
 *      --update           差分があれば snapshots を自動更新する
 *
 * 使い方:
 *   node tests/golden/runner.js
 *   node tests/golden/runner.js --update
 *   node tests/golden/runner.js --output tests/golden/out --snapshots tests/golden/snap
 *
 * 注意:
 *  - このスクリプトは Node.js 環境で動作します（fs, path を使用）。
 *  - ファイルのノーマライズは最小限（改行/末尾空白の除去）を行います。
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const opts = {
    outputDir: path.join(__dirname, "output"),
    snapshotDir: path.join(__dirname, "snapshots"),
    update: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--update") {
      opts.update = true;
    } else if (a === "--output" && i + 1 < argv.length) {
      opts.outputDir = path.resolve(process.cwd(), argv[++i]);
    } else if (a === "--snapshots" && i + 1 < argv.length) {
      opts.snapshotDir = path.resolve(process.cwd(), argv[++i]);
    } else {
      // ignore unknown
    }
  }
  return opts;
}

function normalizeText(s) {
  // CRLF を LF に、先頭末尾の空白行をトリム
  return s.replace(/\r/g, "").trim();
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    return null;
  }
}

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function updateSnapshot(snapshotPath, outputPath) {
  fs.copyFileSync(outputPath, snapshotPath);
  console.log(`   ⤴ snapshot updated: ${path.relative(process.cwd(), snapshotPath)}`);
}

function compareAndMaybeUpdate(outputPath, snapshotPath, updateFlag) {
  const outText = readFileSafe(outputPath);
  if (outText === null) return { status: "missing_output" };

  const snapText = readFileSafe(snapshotPath);

  if (snapText === null) {
    return { status: "missing_snapshot" };
  }

  const ok = normalizeText(outText) === normalizeText(snapText);
  if (ok) return { status: "match" };

  if (updateFlag) {
    // 上書き更新
    updateSnapshot(snapshotPath, outputPath);
    return { status: "updated" };
  }

  return { status: "mismatch", outText, snapText };
}

function run() {
  const opts = parseArgs(process.argv);
  console.log("🔍 Golden Test Runner");
  console.log(`   output:    ${opts.outputDir}`);
  console.log(`   snapshots: ${opts.snapshotDir}`);
  console.log(`   update:    ${opts.update}`);
  console.log("");

  // ディレクトリ確認
  if (!fs.existsSync(opts.outputDir)) {
    console.error(`❌ Output directory not found: ${opts.outputDir}`);
    process.exit(2);
  }
  if (!fs.existsSync(opts.snapshotDir)) {
    console.warn(`⚠ Snapshot directory not found, creating: ${opts.snapshotDir}`);
    ensureDirExists(opts.snapshotDir);
  }

  const outputs = fs.readdirSync(opts.outputDir).filter((f) => f.endsWith(".ts"));
  if (outputs.length === 0) {
    console.error("❌ No output files found. Run generator first.");
    process.exit(2);
  }

  let passed = 0;
  let failed = 0;
  let updated = 0;
  let missingSnapshots = 0;
  let missingOutputs = 0;

  for (const file of outputs) {
    const outputPath = path.join(opts.outputDir, file);
    const snapshotPath = path.join(opts.snapshotDir, file);

    process.stdout.write(`- Checking ${file} ... `);

    const res = compareAndMaybeUpdate(outputPath, snapshotPath, opts.update);
    if (res.status === "match") {
      console.log("✅ OK");
      passed++;
    } else if (res.status === "mismatch") {
      console.log("❌ MISMATCH");
      failed++;
      // 差分の簡易表示（先頭のみ）
      console.log("  --- snapshot (expected) head ---");
      console.log(normalizeText(res.snapText).split("\n").slice(0, 10).join("\n"));
      console.log("  --- output (generated) head ---");
      console.log(normalizeText(res.outText).split("\n").slice(0, 10).join("\n"));
      console.log("  (Use --update to accept changes)");
    } else if (res.status === "updated") {
      console.log("🟦 UPDATED (snapshot replaced)");
      updated++;
    } else if (res.status === "missing_snapshot") {
      console.log("⚠ Missing snapshot -> will create new snapshot");
      // create snapshot from output
      ensureDirExists(path.dirname(snapshotPath));
      updateSnapshot(snapshotPath, outputPath);
      missingSnapshots++;
    } else if (res.status === "missing_output") {
      console.log("⚠ Missing output (skipped)");
      missingOutputs++;
    } else {
      console.log("❓ Unknown status", res);
    }
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  MissingSnapshots(created): ${missingSnapshots}`);
  console.log(`  MissingOutputs: ${missingOutputs}`);

  if (failed > 0) {
    console.error("🔴 Golden tests failed. See mismatches above.");
    process.exit(1);
  }

  // 成功終了
  console.log("🟢 Golden tests complete.");
  process.exit(0);
}

run();
