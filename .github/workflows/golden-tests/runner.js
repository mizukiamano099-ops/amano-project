/**
 * Multi-Validator Runner
 * -----------------------
 * Golden Baseline と現在の出力（Zod / Pydantic / Go / Firestore）を比較し、
 * diff を生成する CI / ローカル共通のランナー。
 *
 * CI 上では failing diff が snapshot-diff-generator へ渡され、
 * Golden Test PR Bot が PR コメントを更新する。
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/** ディレクトリ設定 */
const CONFIG = {
  goldenDir: path.join(__dirname, "golden"),
  snapshotDir: path.join(__dirname, "snapshots"),
  validatorsDir: path.join(__dirname, "../validators"),
  outDir: path.join(__dirname, "output"),
};

/**
 * Utility
 */
function ensure(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * --- Load Golden Baseline ---
 */
function loadGolden() {
  const files = fs.readdirSync(CONFIG.goldenDir)
    .filter(f => f.endsWith(".json"))
    .map(f => path.join(CONFIG.goldenDir, f));

  const out = [];
  for (const fp of files) {
    out.push(JSON.parse(fs.readFileSync(fp, "utf8")));
  }
  return out;
}

/**
 * --- Execute Validator ---
 * JS (Zod), Python (Pydantic), Go, Firestore Rules に対応
 */
function runValidator(type, input) {
  const vdir = CONFIG.validatorsDir;

  switch (type) {
    case "zod": {
      const fp = path.join(vdir, "zod.js");
      const p = spawnSync("node", [fp], {
        input: JSON.stringify(input),
        encoding: "utf8"
      });
      return p.stdout.trim();
    }

    case "pydantic": {
      const fp = path.join(vdir, "pydantic.py");
      const p = spawnSync("python3", [fp], {
        input: JSON.stringify(input),
        encoding: "utf8"
      });
      return p.stdout.trim();
    }

    case "go": {
      const fp = path.join(vdir, "go.go");
      const p = spawnSync("go", ["run", fp], {
        input: JSON.stringify(input),
        encoding: "utf8"
      });
      return p.stdout.trim();
    }

    case "firestore": {
      const fp = path.join(vdir, "firestore.rules.gen");
      const p = spawnSync("node", [fp], {
        input: JSON.stringify(input),
        encoding: "utf8"
      });
      return p.stdout.trim();
    }

    default:
      return `ERROR: Unknown validator ${type}`;
  }
}

/**
 * --- Compare expected vs actual ---
 */
function computeDiff(expected, actual) {
  if (expected === actual) return null;
  return { expected, actual };
}

/**
 * --- Save CI diff snapshot ---
 */
function saveDiff(id, diffs) {
  ensure(CONFIG.outDir);

  const fp = path.join(CONFIG.outDir, `${id}.diff.json`);
  fs.writeFileSync(fp, JSON.stringify(diffs, null, 2), "utf8");
}

/**
 * --- Main Runner ---
 */
function main() {
  console.log("Golden Test Runner: START");

  const golden = loadGolden();
  const results = [];

  for (const entry of golden) {
    const { id, input, expected, validators } = entry;

    const row = { id, validators: {}, diff: {} };
    let hasDiff = false;

    for (const v of validators) {
      const actual = runValidator(v, input);
      const diff = computeDiff(expected[v], actual);

      row.validators[v] = { actual };
      if (diff) {
        row.diff[v] = diff;
        hasDiff = true;
      }
    }

    if (hasDiff) {
      saveDiff(id, row.diff);
    }

    results.push(row);
  }

  const summaryPath = path.join(CONFIG.snapshotDir, "runner-output.json");
  ensure(CONFIG.snapshotDir);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), "utf8");

  console.log("Golden Test Runner: DONE");
}

main();

