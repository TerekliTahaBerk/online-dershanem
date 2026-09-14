import { redactSensitiveValue } from "../../lib/security/redaction.mjs";

/** Bağımsız CLI logger: tüm değerleri merkezi redaction'dan sonra yazar. */
function write(level, stream, values) {
  const timestamp = new Date().toISOString();
  const rendered = values.map((value) => {
    const safe = redactSensitiveValue(value);
    if (typeof safe === "string") return safe;
    try { return JSON.stringify(safe); } catch { return "[UNSERIALIZABLE]"; }
  }).join(" ");
  stream.write(`[${timestamp}] ${level} ${rendered}\n`);
}

export const cliLog = {
  info: (...values) => write("INFO", process.stdout, values),
  warn: (...values) => write("WARN", process.stderr, values),
  error: (...values) => write("ERROR", process.stderr, values),
};
