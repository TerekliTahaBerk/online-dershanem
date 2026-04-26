/** Read a trimmed string from FormData, returning "" if missing or not a string. */
export function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Parse a datetime-local input value as Turkey time (Europe/Istanbul, UTC+3).
 *
 * Browser datetime-local inputs emit "YYYY-MM-DDTHH:mm" without timezone info.
 * `new Date("2025-06-15T21:00")` would treat that as UTC, making it 3 hours off
 * for admins in Istanbul. We append "+03:00" so the server stores the correct UTC.
 *
 * Returns null if the value is empty or unparseable.
 */
export function readTurkeyDatetime(formData: FormData, key: string): Date | null {
  const value = readString(formData, key);
  if (!value) return null;
  // If no timezone suffix, treat as Turkey time (UTC+3)
  const withZone =
    value.includes("Z") || value.includes("+") || value.includes("-", 10)
      ? value
      : `${value}:00+03:00`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
