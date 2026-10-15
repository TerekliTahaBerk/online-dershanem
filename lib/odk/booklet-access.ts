/**
 * Oturumlu sınavda kitapçık erişimi (Faz 5 / P1-1, docs/roadmaps/odk-exam-experience-overhaul.md).
 *
 * - Oturum planı yoksa tüm deneme kitapçığı ("" anahtarı) verilir (eski davranış).
 * - Oturum planı varsa yalnız AÇIK oturumun kitapçığı verilir; ara sırasında ve
 *   sınav bitince hiçbiri verilmez. Böylece LGS Sözel oturumunda Sayısal sorular
 *   görülemez, ara sırasında kitapçık indirilemez.
 * - Oturumlu sınavda yalnız birleşik kitapçık yüklenmişse (eski içerik) açık
 *   oturumda o verilir; hazırlık kontrolü bunun için uyarı üretir.
 */

export type BookletFileRef = { id: string; sessionKey: string; bookletCode?: string };
export type BookletTimeline = { phase: "SESSION" | "BREAK" | "FINISHED"; currentKey: string | null } | null;

export type BookletDecision =
  | { ok: true; fileId: string; scope: "EXAM" | "SESSION" }
  | { ok: false; code: "SESSION_BREAK" | "SESSION_FINISHED" | "BOOKLET_MISSING"; status: 403 | 404 };

/**
 * Çoklu kitapçıkta öğrenci yalnız KENDİ kitapçık türünün dosyalarını görür.
 * A (kanonik) türden bağımsız ("") dosyaya düşebilir; B–E düşemez (soru sırası
 * farklıdır, yanlış PDF yanlış cevaba yol açar).
 */
export function resolveBookletFile(allFiles: readonly BookletFileRef[], timeline: BookletTimeline, bookletCode = "A"): BookletDecision {
  const typed = allFiles.filter((file) => (file.bookletCode ?? "") === bookletCode);
  const files = typed.length || bookletCode !== "A" ? typed : allFiles.filter((file) => (file.bookletCode ?? "") === "");
  const whole = files.find((file) => file.sessionKey === "");
  if (!timeline) return whole ? { ok: true, fileId: whole.id, scope: "EXAM" } : { ok: false, code: "BOOKLET_MISSING", status: 404 };
  if (timeline.phase === "BREAK") return { ok: false, code: "SESSION_BREAK", status: 403 };
  if (timeline.phase === "FINISHED" || !timeline.currentKey) return { ok: false, code: "SESSION_FINISHED", status: 403 };
  const own = files.find((file) => file.sessionKey === timeline.currentKey);
  if (own) return { ok: true, fileId: own.id, scope: "SESSION" };
  // Oturuma özel kitapçık düzeni kurulmuşsa birleşik dosyaya geri düşülmez (öbür oturum sızmasın).
  if (files.some((file) => file.sessionKey !== "")) return { ok: false, code: "BOOKLET_MISSING", status: 404 };
  return whole ? { ok: true, fileId: whole.id, scope: "EXAM" } : { ok: false, code: "BOOKLET_MISSING", status: 404 };
}

export type BookletReadinessIssue = { level: "error" | "warning"; code: string; message: string };

/** Hazırlık: oturumlu sınavda her oturumun kitapçığı var mı; yalnız birleşik kitapçık uyarıdır. */
export function sessionBookletIssues(sessionKeys: readonly string[], bookletSessionKeys: readonly string[]): BookletReadinessIssue[] {
  if (!sessionKeys.length) return [];
  const present = new Set(bookletSessionKeys);
  const perSession = bookletSessionKeys.filter((key) => key !== "");
  const unknown = perSession.filter((key) => !sessionKeys.includes(key));
  const issues: BookletReadinessIssue[] = unknown.map((key) => ({ level: "error", code: "BOOKLET_UNKNOWN_SESSION", message: `${key} oturumu bu denemenin planında yok; kitapçığı yeniden yükleyin.` }));
  if (perSession.length) {
    for (const key of sessionKeys) if (!present.has(key)) issues.push({ level: "error", code: "SESSION_BOOKLET_MISSING", message: `${key} oturumunun kitapçığı yüklenmedi.` });
  } else if (present.has("")) {
    issues.push({ level: "warning", code: "SESSION_BOOKLET_RECOMMENDED", message: "Tek birleşik kitapçık var: öğrenci açık oturumda diğer oturumun sorularını da görebilir. Oturum başına kitapçık yükleyin." });
  }
  return issues;
}

/** Hazırlık: çoklu kitapçıkta her kitapçık türünün (oturumlu sınavda her oturumun) PDF'i yüklü mü. */
export function bookletFileIssues(bookletCodes: readonly string[], sessionKeys: readonly string[], files: ReadonlyArray<{ sessionKey: string; bookletCode: string }>): BookletReadinessIssue[] {
  if (bookletCodes.length <= 1) return [];
  const issues: BookletReadinessIssue[] = [];
  for (const code of bookletCodes) {
    const own = files.filter((file) => file.bookletCode === code || (code === "A" && file.bookletCode === ""));
    if (!own.length) {
      issues.push({ level: "error", code: "BOOKLET_TYPE_PDF_MISSING", message: `${code} kitapçığının PDF'i yüklenmedi.` });
      continue;
    }
    if (sessionKeys.length && !own.some((file) => file.sessionKey === "")) {
      for (const key of sessionKeys) if (!own.some((file) => file.sessionKey === key)) issues.push({ level: "error", code: "BOOKLET_TYPE_PDF_MISSING", message: `${code} kitapçığının ${key} oturumu PDF'i yüklenmedi.` });
    }
  }
  return issues;
}
