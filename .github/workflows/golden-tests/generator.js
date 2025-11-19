/**
 * Golden Table Generator
 * -----------------------
 * スキーマ（IR）を読み取り、Golden Baseline（expected output）を
 * 自動生成するスクリプト。
 *
 * このスクリプトは CI / ローカルのどちらからも呼び出される。
 */

const fs = require("fs");
const path = require("path");

/** 入力ディレクトリと出力ディレクトリ */
const CONFIG = {
  irPath: path.join(__dirname, "config.json"),            // IR / schema
  goldenOut: path.join(__dirname, "golden"),              // expected outputs
  snapshotOut: path.join(__dirname, "snapshots"),         // CI snapshot
};

/**
 * Golden Table の書式：
 * {
 *   id: string,
 *   input: any,
 *   expected: any,
 *   validators: ["zod", "pydantic", "go", "firestore"],
 * }
 */

/**
 * === Utility: Ensure directory exists ===
 */
function ensure(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * === Load IR (Intermediate Representation) ===
 */
function loadIR() {
  const t = fs.readFileSync(CONFIG.irPath, "utf8");
  return JSON.parse(t);
}

/**
 * === Golden Baseline Generator（メインロジック） ===
 *
 * IR → Golden 形式に変換。
 */
function generateGolden(ir) {
  const output = [];

  for (const schema of ir.schemas || []) {
    const id = schema.id || `schema_${schema.name}`;

    const entry = {
      id,
      input: schema.sample || {},
      expected: schema.expected || {},
      validators: ["zod", "pydantic", "go", "firestore"],
    };

    output.push(entry);
  }

  return output;
}

/**
 * === Save Golden Baselines ===
 */
function saveGolden(entries) {
  ensure(CONFIG.goldenOut);

  for (const item of entries) {
    const fp = path.join(CONFIG.goldenOut, `${item.id}.json`);
    fs.writeFileSync(fp, JSON.stringify(item, null, 2), "utf8");
  }
}

/**
 * === Save Snapshot for CI ===
 */
function saveSnapshot(entries) {
  ensure(CONFIG.snapshotOut);

  const fp = path.join(CONFIG.snapshotOut, "snapshot.json");
  fs.writeFileSync(fp, JSON.stringify(entries, null, 2), "utf8");
}

/**
 * === Main ===
 */
function main() {
  console.log("Golden Table Generator: START");

  const ir = loadIR();
  const golden = generateGolden(ir);

  saveGolden(golden);
  saveSnapshot(golden);

  console.log("Golden Table Generator: DONE");
}

main();

