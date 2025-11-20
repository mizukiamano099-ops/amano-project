// -----------------------------------------------------------------------------
// ZodEmitter (ESM)
// -----------------------------------------------------------------------------

export class ZodEmitter {
  emit(ir) {
    let out = [];

    out.push(`/* --------------------------------------------------------------------------`);
    out.push(` * このファイルは自動生成されています。`);
    out.push(` * Source: IR Schema`);
    out.push(` * Generator: Amano-Project ZodEmitter`);
    out.push(` * -------------------------------------------------------------------------- */`);
    out.push(`import { z } from "zod";\n`);

    // 各定義を Zod スキーマに変換
    for (const [name, def] of Object.entries(ir.definitions)) {
      out.push(this.emitObject(name, def));
    }

    return out.join("\n");
  }

  emitObject(name, def) {
    let code = [];
    code.push(`export const ${name}Schema = z.object({`);

    for (const [key, prop] of Object.entries(def.properties)) {
      code.push("  " + this.emitField(key, prop) + ",");
    }

    code.push(`});\n`);
    code.push(`export type ${name} = z.infer<typeof ${name}Schema>;\n`);
    return code.join("\n");
  }

  emitField(key, prop) {
    let zt = this.mapType(prop);

    if (prop.required === false) {
      zt += ".optional()";
    }

    if (prop.nullable === true) {
      zt += ".nullable()";
    }

    if (prop.default !== undefined) {
      if (typeof prop.default === "string") {
        zt += `.default("${prop.default}")`;
      } else {
        zt += `.default(${prop.default})`;
      }
    }

    return `${key}: ${zt}`;
  }

  mapType(prop) {
    switch (prop.type) {
      case "string":
        if (prop.format === "email") return "z.string().email()";
        if (prop.format === "uuid") return "z.string().uuid()";
        return "z.string()";

      case "number":
        let n = "z.number()";
        if (prop.minimum !== undefined) n += `.min(${prop.minimum})`;
        if (prop.maximum !== undefined) n += `.max(${prop.maximum})`;
        return n;

      case "boolean":
        return "z.boolean()";

      case "date":
      case "timestamp":
        return "z.string().datetime()";

      case "array":
        return `z.array(${this.mapType(prop.items)})`;

      case "enum":
        return `z.enum(${JSON.stringify(prop.values)})`;

      default:
        return "z.any()";
    }
  }
}
