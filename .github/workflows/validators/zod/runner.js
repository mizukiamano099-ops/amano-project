// validators/zod/runner.js
//
// Zod Validator Runner
//

const { z } = require("zod");

// UUIDv4 パターン
const UUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Zod schema（最小セット）
const Schema = z.object({
  id: z.string().regex(UUIDv4),
  timestamp: z.string().datetime({ offset: true }),
  temperature: z.number().min(-50).max(150),
  pressure: z.number().min(800).max(1200),
  mode: z.enum(["AUTO", "MANUAL"]),
});

module.exports = async function validate(input) {
  const result = Schema.safeParse(input);

  if (result.success) {
    return { ok: true, errors: [] };
  }

  // Zodエラーを統一フォーマットに変換
  const errors = result.error.errors.map((e) => ({
    path: e.path.join("."),
    message: e.message,
  }));

  return { ok: false, errors };
};

