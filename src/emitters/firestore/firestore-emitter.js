/**
 * Firestore Emitter
 * -----------------------------
 * IR から Firestore 用の TypeScript interface と
 * FirestoreDataConverter を生成するエミッタ。
 *
 * 仕様（Gemini 指定）:
 * - export interface Xxx
 * - export const XxxConverter: FirestoreDataConverter<Xxx>
 * - Date -> Timestamp
 * - Relation -> string（参照先の doc.id）
 */

const { Timestamp } = require("firebase/firestore");

class FirestoreEmitter {
  /**
   * メインエントリポイント
   * @param {object} ir - IR (Intermediate Representation)
   * @returns {string} - Firestore TypeScript コード
   */
  emit(ir) {
    let code = `// =====================================
// Firestore Type Definitions (Generated)
// =====================================

import {
  FirestoreDataConverter,
  Timestamp,
} from "firebase/firestore";

`;

    // 全エンティティの interface と converter を生成
    for (const entity of ir.entities) {
      code += this.#emitInterface(entity);
      code += "\n";
      code += this.#emitConverter(entity);
      code += "\n\n";
    }

    return code;
  }

  /**
   * TypeScript interface 出力
   */
  #emitInterface(entity) {
    const { name, fields } = entity;

    let out = `/** Firestore Document Type: ${name} */\n`;
    out += `export interface ${name} {\n`;

    for (const field of fields) {
      const tsType = this.#mapTypeToTS(field);

      // ドキュメントコメント
      let comment = "";
      if (field.isUnique) comment += " @unique";
      if (field.isRelation) comment += ` @relation(${field.type})`;
      if (comment) out += `  /**${comment} */\n`;

      const optional = field.isNullable ? "?" : "";
      out += `  ${field.name}${optional}: ${tsType};\n`;
    }

    out += `}\n`;
    return out;
  }

  /**
   * Firestore Converter 出力
   */
  #emitConverter(entity) {
    const name = entity.name;

    return `
/** Firestore Converter for ${name} */
export const ${name}Converter: FirestoreDataConverter<${name}> = {
  toFirestore(model: ${name}) {
    return model;
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return {
      ...data,
    } as ${name};
  },
};
`;
  }

  /**
   * IR の DSL 型を TypeScript/Firestore 型へマッピングする
   */
  #mapTypeToTS(field) {
    const type = field.type;

    // リレーション型（Post or Post[]）
    if (field.isRelation) {
      if (type.endsWith("[]")) {
        return "string[]"; // doc.id の配列
      }
      return "string"; // 参照ドキュメントの ID
    }

    switch (type) {
      case "Int":
      case "Float":
        return "number";
      case "String":
      case "UUID":
        return "string";
      case "Boolean":
        return "boolean";
      case "Date":
      case "DateTime":
        return "Timestamp";
    }

    // Fallback
    return "any";
  }
}

module.exports = {
  FirestoreEmitter,
};
