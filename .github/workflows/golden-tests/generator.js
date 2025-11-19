// golden-tests/generator.js
//
// Golden Table Generator
// - IR から canonical 化された Zod/Pydantic/Firestore 各値を生成
// - validators/{validator}/runner.js を呼び出し Golden Table を生成する
// - 出力: ./golden-tests/output/*.json
//

const fs = require("fs");
const path = require("path");

async function loadValidators() {
  const validatorsDir = path.join(process.cwd(), "validators");
  const entries = fs.readdirSync(validatorsDir, { withFileTypes: true });

  const validators = entries
    .filter((e) => e.isDirectory())
    .map((dir) => ({
      name: dir.name,
      runner: path.join(validatorsDir, dir.name, "runner.js"),
    }));

  return validators;
}

// ↓ Golden Test 的に最重要：生成するデータセット（サンプル）
function buildGoldenSamples() {
  return [
    {
      name: "valid_structural_config",
      input: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2025-01-01T00:00:00Z",
        temperature: 22.5,
        pressure: 1012.8,
        mode: "AUTO",
      },
    },
    {
      name: "invalid_missing_id",
      input: {
        timestamp: "2025-01-01T00:00:00Z",
        temperature: 22.5,
        pressure: 1012.8,
        mode: "AUTO",
      },
    },
    {
      name: "invalid_pressure_low",
      input: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2025-01-01T00:00:00Z",
        temperature: 22.5,
        pressure: 100, // too low
        mode: "AUTO",
      },
    },
  ];
}

async function run() {
  const validators = await loadValidators();
  const samples = buildGoldenSamples();

  const outDir = path.join(process.cwd(), "golden-tests", "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const v of validators) {
    const tester = require(v.runner);

    const results = [];
    for (const s of samples) {
      const r = await tester(s.input);
      results.push({
        sample: s.name,
        input: s.input,
        validator: v.name,
        output: r,
      });
    }

    const outPath = path.join(outDir, `${v.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`✔ Generated: ${outPath}`);
  }
}

run();
