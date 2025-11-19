// validators/firestore/runner.js
//
// Firestore-Equivalent JS Validator
//

const UUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateFirestoreEquivalent(input) {
  const errors = [];

  // required
  const required = ["id", "timestamp", "temperature", "pressure", "mode"];
  for (const key of required) {
    if (!(key in input)) {
      errors.push({ path: key, message: "Required field missing" });
    }
  }

  // id
  if (typeof input.id !== "string" || !UUIDv4.test(input.id)) {
    errors.push({ path: "id", message: "Invalid UUIDv4" });
  }

  // timestamp
  if (typeof input.timestamp !== "string") {
    errors.push({ path: "timestamp", message: "Must be string" });
  } else {
    // ISO8601 check
    const iso = new Date(input.timestamp);
    if (iso.toString() === "Invalid Date") {
      errors.push({ path: "timestamp", message: "Invalid ISO8601 timestamp" });
    }
  }

  // temperature
  if (typeof input.temperature !== "number") {
    errors.push({ path: "temperature", message: "Must be number" });
  } else if (input.temperature < -50 || input.temperature > 150) {
    errors.push({ path: "temperature", message: "Out of range" });
  }

  // pressure
  if (typeof input.pressure !== "number") {
    errors.push({ path: "pressure", message: "Must be number" });
  } else if (input.pressure < 800 || input.pressure > 1200) {
    errors.push({ path: "pressure", message: "Out of range" });
  }

  // mode
  const allowed = ["AUTO", "MANUAL"];
  if (!allowed.includes(input.mode)) {
    errors.push({ path: "mode", message: "Invalid enum" });
  }

  return errors;
}

module.exports = async function validate(input) {
  const errors = validateFirestoreEquivalent(input);

  if (errors.length === 0) {
    return { ok: true, errors: [] };
  }

  return { ok: false, errors };
};

