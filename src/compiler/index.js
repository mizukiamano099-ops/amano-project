// CommonJS (require) から ESM (import) へ変換
// Note: Node.jsのESMでは、相対パスでのインポートに拡張子 (.js) が必須です。
import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { canonicalize } from "./canonicalizer.js";
import { validateIR } from "./validator.js";

/**
 * 抽象構文木 (AST) を受け取り、指定されたターゲット言語のコードを生成します。
 * エミッターの動的インポートを含むため、非同期関数 (async function) となります。
 *
 * @param {object} ast - コンパイル対象の抽象構文木 (AST)。
 * @param {string} target - 'zod', 'firestore' などのターゲットエミッター名。
 * @returns {Promise<string>} 生成されたコードを解決するPromise。
 */
export async function compileIR(ast, target) {
  // 1. 字句解析を実行（具体的な実装はlexer.js内）
  const tokens = tokenize(ast);

  // 2. 構文解析を実行（具体的な実装はparser.js内）
  const rawIR = parse(tokens);

  // 3. IRを正規化
  const ir = canonicalize(rawIR);

  // 4. IRのバリデーションを実行
  validateIR(ir);

  // 5. ターゲットエミッターのパスを決定
  let emitterPath;
  switch (target) {
    case "zod":
      // index.js から見て: ../emitters/zod/zod-emitter.js
      emitterPath = "../emitters/zod/zod-emitter.js";
      break;
    case "firestore":
      emitterPath = "../emitters/firestore/firestore-emitter.js";
      break;
    default:
      throw new Error(`Unsupported target emitter: ${target}`);
  }

  // 6. エミッターを動的インポート (非同期)
  const emitterModule = await import(emitterPath);

  if (typeof emitterModule.emit !== 'function') {
    throw new Error(`Emitter module at ${emitterPath} must export 'emit' function.`);
  }

  // 7. コード生成を実行
  return emitterModule.emit(ir);
}

// compileIRを名前付きエクスポートとして定義 (runner.mjsがインポートするため)
// export function compileIR(...) は上で定義済み
