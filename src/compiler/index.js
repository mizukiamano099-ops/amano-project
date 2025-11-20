// src/compiler/index.js

import { canonicalize } from "./canonicalizer.js";
import { validateIR } from "./validator.js";
import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";

export async function compileIR(input, target = "zod") {
  const tokens = tokenize(input);
  const ast = parse(tokens);
  const ir = canonicalize(ast);

  validateIR(ir);

  if (target === "zod") {
    const emitter = await import("../emitters/zod/zod-emitter.js");
    return emitter.emit(ir);
  }

  throw new Error(`Unknown target: ${target}`);
}
