// validators/pydantic/runner.js
//
// Node → Python bridge
//

const { spawnSync } = require("child_process");
const path = require("path");

module.exports = async function run(input) {
  const py = spawnSync(
    "python3",
    [path.join(__dirname, "runner.py")],
    {
      input: JSON.stringify(input),
      encoding: "utf-8",
    }
  );

  if (py.error) {
    return { ok: false, errors: [{ message: py.error.message }] };
  }

  try {
    return JSON.parse(py.stdout);
  } catch (e) {
    return { ok: false, errors: [{ message: "Invalid JSON from Python" }] };
  }
};

