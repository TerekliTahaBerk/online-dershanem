import { decodeAdminPreviewCookie, type PreviewCookiePayload } from "./admin-preview-core";
import { decodeAdminTeacherModeCookie, type AdminTeacherModePayload } from "./admin-teacher-mode-core";

export type AdminOverlayTransport =
  | { kind: "web" }
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "preview"; payload: PreviewCookiePayload }
  | { kind: "teacher"; payload: AdminTeacherModePayload };

/** Bearer never consumes browser cookies. Invalid/ambiguous overlays fail closed. */
export function resolveAdminOverlayTransport(
  headers: { get(name: string): string | null },
  actor: { role: string; userId: string; sessionId: string },
): AdminOverlayTransport {
  const preview = headers.get("x-od-preview");
  const teacher = headers.get("x-od-teacher-mode");
  const bearer = /^Bearer\s+\S+$/i.test(headers.get("authorization") ?? "");
  if (preview !== null || teacher !== null) {
    if (!bearer || actor.role !== "ADMIN" || (preview !== null && teacher !== null)) return { kind: "invalid" };
    if (preview !== null) {
      const payload = decodeAdminPreviewCookie(preview);
      return payload && payload.sessionId === actor.sessionId && payload.startedByAdminId === actor.userId
        ? { kind: "preview", payload } : { kind: "invalid" };
    }
    const payload = decodeAdminTeacherModeCookie(teacher!);
    return payload && payload.sessionId === actor.sessionId && payload.adminUserId === actor.userId
      ? { kind: "teacher", payload } : { kind: "invalid" };
  }
  return { kind: bearer ? "none" : "web" };
}
