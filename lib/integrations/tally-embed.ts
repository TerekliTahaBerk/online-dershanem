import { TALLY_EMBED_ORIGIN } from "./tally-events";

/** Public embed options only: never forward account refs or URL context. */
export function publicTallyEmbedUrl(formId: string): string {
  if (!/^[A-Za-z0-9]+$/.test(formId)) throw new Error("Invalid Tally form ID");
  const url = new URL(`/embed/${formId}`, TALLY_EMBED_ORIGIN);
  for (const key of ["alignLeft", "hideTitle", "transparentBackground", "dynamicHeight"]) {
    url.searchParams.set(key, "1");
  }
  return url.toString();
}

/** Tally's dynamicHeight postMessage protocol; caller checks origin/source. */
export function tallyEmbedHeight(data: unknown, formId: string): number | null {
  let message: unknown = data;
  if (typeof data === "string") {
    if (data.length > 4096) return null;
    try { message = JSON.parse(data); } catch { return null; }
  }
  if (!message || typeof message !== "object" || !("event" in message) || message.event !== "Tally.FormHeight") return null;
  if (!("payload" in message) || !message.payload || typeof message.payload !== "object") return null;
  const payload = message.payload;
  if (!("formId" in payload) || payload.formId !== formId || !("height" in payload)) return null;
  const height = payload.height;
  return typeof height === "number" && Number.isFinite(height) && height > 0 && height <= 30_000
    ? Math.ceil(height)
    : null;
}
