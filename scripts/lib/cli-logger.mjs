/** Bağımsız CLI logger: zaman damgası ve seviye etiketiyle tutarlı çıktı üretir. */
function write(level, stream, values) {
  const timestamp = new Date().toISOString();
  const rendered = values.map((value) => {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  }).join(" ");
  stream.write(`[${timestamp}] ${level} ${rendered}\n`);
}

export const cliLog = {
  info: (...values) => write("INFO", process.stdout, values),
  warn: (...values) => write("WARN", process.stderr, values),
  error: (...values) => write("ERROR", process.stderr, values),
};
