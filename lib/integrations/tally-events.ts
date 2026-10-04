/**
 * Tally gömülü form olayları — SAF, tarayıcıda çalışır.
 *
 * `tally.ts` `node:crypto` kullandığı için client component'ler oradan import
 * EDEMEZ (webpack `node:crypto`'yu paketlemeye çalışır); bu yüzden ayrı dosya.
 */

export const TALLY_EMBED_ORIGIN = "https://tally.so";

/** Gömülü formdan gelen postMessage'ın "form gönderildi" olayı olup olmadığı. */
export function isTallySubmittedMessage(data: unknown): boolean {
  let parsed: unknown = data;
  if (typeof data === "string") {
    if (!data.includes("Tally.FormSubmitted")) return false;
    try {
      parsed = JSON.parse(data);
    } catch {
      return false;
    }
  }
  return typeof parsed === "object" && parsed !== null && (parsed as { event?: unknown }).event === "Tally.FormSubmitted";
}
