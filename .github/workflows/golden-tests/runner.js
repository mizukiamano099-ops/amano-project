// golden-tests/runner.js
//
// Multi Validator Runner
// 各 validator ディレクトリ内の runner.js を呼んで比較を行う。
// generator.js が用意した入力でテストを実行し、
// 結果を golden-tests/output/ 以下に出力する。
//

const fs = require("fs");
const path = require("path");

async function loadValidatorRunners() {
  const dir = path.join(process.cwd(), "validators");
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries
    .filter((e) => e.isDirectory())
    .map((d) => ({
      name: d.name,
      run: require(path.join(dir, d.name, "runner.js")),
    }));
}

async function run() {
  const samplesPath = path.join(
    process.cwd(),
    "golden-tests",
    "output",
    "samples.json"
  );

  if (!fs.existsSync(samplesPath)) {
    console.error("❌ samples.json が存在しません。generator.js を先に実行してください");
    process.exit(1);
  }

  const samples = JSON.parse(fs.readFileSync(samplesPath, "utf-8"));
  const validators = await loadValidatorRunners();

  const results = [];

  for (const v of validators) {
    for (const sample of samples) {
      const r = await v.run(sample.input);
      results.push({
        validator: v.name,
        sample: sample.name,
        result: r,
      });
    }
  }

  const outDir = path.join(process.cwd(), "golden-tests", "output");
  const out = path.join(outDir, "combined-results.json");
  fs.writeFileSync(out, JSON.stringify(results, null, 2));

  console.log(`✔ Combined validation output → ${out}`);
}

run();
