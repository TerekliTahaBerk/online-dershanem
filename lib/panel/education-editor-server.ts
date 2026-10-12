import "server-only";
import type { EducationEditor, EducationField, EducationForm, EditorKind } from "@/lib/mobile-contracts/admin-education-editor";
import { prisma } from "@/lib/prisma";
import { educationRevision, educationSnapshot } from "./education-write";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { istanbulWeekStart, addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { LEGACY_CURRICULUM_EXAM_CODES, listActiveExamFamilies } from "@/lib/products/registry";
import { GroupMutationError } from "./group-mutation-core";

type Choice = { id: string; name: string; revision?: string | null };
const names = (user: { fullName: string | null; email: string }) => user.fullName || user.email;
const f = (key: string, label: string, value = "", type: EducationField["type"] = "text", options: Choice[] = [], required = false): EducationField => ({ key, label, value, type, options: options.map((item) => ({ ...item, revision: item.revision ?? null })), required });
const enums = (values: string[]) => values.map((id) => ({ id, name: ({ ONE: "Yalnız bu ders", FOLLOWING: "Bu ve sonraki dersler", SINGLE: "Tek ders", SERIES: "Ders serisi", GROUP: "Grup", STUDENT: "Bireysel öğrenci", PLANNED: "Planlı", COMPLETED: "Tamamlandı", CANCELLED: "İptal", DRAFT: "Taslak", ACTIVE: "Aktif", ARCHIVED: "Arşiv", APPROVE: "Onayla", REQUEST_CHANGES: "Yeniden çalışma iste", NEEDS_WORK: "Geliştirilmeli", DEVELOPING: "Gelişiyor", MEETS: "Karşılıyor", COMPLETE_LATER: "Sonra tamamla", CATALOG_MISSING: "Katalogda yok", NOT_APPLICABLE: "Uygulanamaz" } as Record<string, string>)[id] ?? id }));

export async function loadEducationEditor(input: { kind: EditorKind; id?: string; group?: string; q?: string; page?: number; week?: number; teacher?: string }) {
  const { kind, id } = input;
  const data: EducationEditor = { contractVersion: 1, title: ({ lesson: "Dersler", assignment: "Ödevler", material: "Materyaller", setup: "Hızlı kurulum", version: "Kazanım sürümleri", outcome: "Kazanım oluştur", submission: "Teslim değerlendirme", calendar: "Kurum takvimi" })[kind], description: "", forms: [], rows: [], hasMore: false, file: null };
  const flags = getPanelFeatureFlags();
  if ((kind === "version" || kind === "outcome") && !flags.learningOutcomes) throw new GroupMutationError("FEATURE_DISABLED", "Kazanımlar henüz açık değil.", 404);
  const form = (action: string, title: string, path: string, method: EducationForm["method"], fields: EducationField[], revision: string | null = null, preview = false, upload = false) => data.forms.push({ id: action, title, path: `/api/panel/${path}`, method, fields, revision, preview, upload });
  const [groups, teachers, students, parents] = await Promise.all([
    prisma.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { enrollments: { where: { endedAt: null }, orderBy: { id: "asc" } } } }),
    prisma.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    (kind === "setup" || kind === "lesson") ? prisma.studentProfile.findMany({ where: { user: { status: "ACTIVE" } }, include: { user: { select: { fullName: true, email: true } }, enrollments: { where: { endedAt: null }, orderBy: { id: "asc" } } }, orderBy: { user: { fullName: "asc" } } }) : [],
    kind === "setup" ? prisma.user.findMany({ where: { role: "PARENT", status: "ACTIVE" }, select: { id: true, fullName: true, email: true } }) : [],
  ]);
  const groupOptions = groups.map((group) => ({ id: group.id, name: `${group.name} · ${group.subject}`, revision: educationRevision(group) }));
  const teacherOptions = teachers.map((item) => ({ id: item.id, name: names(item) }));
  const studentOptions = students.map((item) => ({ id: item.id, name: names(item.user), revision: educationRevision(item) }));
  const groupField = f("groupId", "Grup", input.group ?? "", "choice", groupOptions, true);
  const titleField = (value = "") => f("title", "Başlık", value, "text", [], true);
  const dateField = (key: string, label: string, value = "") => f(key, label, value, "date", [], true);
  const urlField = (value = "") => f("meetingUrl", "Katılım bağlantısı", value);
  const scope = f("scope", "Uygulama kapsamı", "ONE", "choice", enums(["ONE", "FOLLOWING"]), true);
  const revision = id ? educationRevision(await educationSnapshot(prisma, kind === "calendar" ? "lesson" : kind, id)) : null;
  const limit = 40, skip = (input.page ?? 0) * limit;
  const filter = input.q ? { contains: input.q, mode: "insensitive" as const } : undefined;
  if (kind === "lesson") {
    if (id) {
      const lesson = await prisma.lesson.findUnique({ where: { id } });
      if (!lesson) throw new GroupMutationError("NOT_FOUND", "Ders bulunamadı.", 404);
      data.title = lesson.title;
      data.description = `${lesson.status} · ${lesson.startsAt.toISOString()} · ${lesson.endsAt.toISOString()}`;
      form("UPDATE", "Dersi düzenle", `lessons/${id}`, "PATCH", [f("action", "", "UPDATE", "hidden"), scope, titleField(lesson.title), dateField("startsAt", "Başlangıç", lesson.startsAt.toISOString()), f("status", "Durum", lesson.status, "choice", enums(["PLANNED", "COMPLETED", "CANCELLED"])), urlField(lesson.meetingUrl ?? "")], revision);
      form("RESCHEDULE", "Saati değiştir", `lessons/${id}`, "PATCH", [f("action", "", "RESCHEDULE", "hidden"), scope, dateField("startsAt", "Yeni başlangıç", lesson.startsAt.toISOString()), f("keepDurationMinutes", "Süre (dakika)", String((lesson.endsAt.getTime() - lesson.startsAt.getTime()) / 60000), "number")], revision);
      form("CANCEL", "Dersi iptal et", `lessons/${id}`, "PATCH", [f("action", "", "CANCEL", "hidden"), scope], revision);
      form("SUBSTITUTE", "Yedek öğretmen ata", `lessons/${id}`, "PATCH", [f("action", "", "SUBSTITUTE", "hidden"), scope, f("teacherId", "Öğretmen", lesson.teacherId, "choice", teacherOptions, true)], revision);
      form("MAKE_UP", "Telafi planla", `lessons/${id}`, "PATCH", [f("action", "", "MAKE_UP", "hidden"), titleField(`${lesson.title} (Telafi)`), dateField("startsAt", "Telafi başlangıcı"), f("teacherId", "Öğretmen", lesson.teacherId, "choice", teacherOptions, true), urlField(lesson.meetingUrl ?? "")], revision);
    } else {
      form("CREATE", "Ders oluştur", "lessons", "POST", [f("targetType", "Ders hedefi", "GROUP", "choice", enums(["GROUP", "STUDENT"])), groupField, f("studentId", "Öğrenci", "", "choice", studentOptions), f("teacherId", "Bireysel ders öğretmeni", "", "choice", teacherOptions), titleField(), dateField("startsAt", "Başlangıç"), f("durationMinutes", "Süre (dakika)", "60", "number", [], true), f("mode", "Planlama", "SINGLE", "choice", enums(["SINGLE", "SERIES"])), f("repeatWeeks", "Tekrar haftası", "4", "number"), f("weekdays", "Haftanın günleri", "", "ids", ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"].map((name, index) => ({ id: String(index + 1), name }))), f("totalOccurrences", "Toplam ders (en fazla 48)", "4", "number"), f("seriesEndsOn", "Seri bitiş tarihi (isteğe bağlı)", "", "date"), urlField()], null, true);
      const lessons = await prisma.lesson.findMany({ where: { ...(input.group ? { groupId: input.group } : {}), ...(filter ? { title: filter } : {}) }, orderBy: [{ startsAt: "desc" }, { id: "asc" }], take: limit + 1, skip, include: { group: { select: { name: true } } } });
      data.hasMore = lessons.length > limit;
      data.rows = lessons.slice(0, limit).map((item) => ({ id: item.id, title: item.title, detail: `${item.group.name} · ${item.status}`, kind, at: item.startsAt.toISOString() }));
    }
  }
  if (kind === "assignment") {
    const assignment = id ? await prisma.assignment.findUnique({ where: { id }, include: { outcomeLinks: true, rubricCriteria: { orderBy: { position: "asc" } } } }) : null;
    if (id && !assignment) throw new GroupMutationError("NOT_FOUND", "Ödev bulunamadı.", 404);
    const outcomes = flags.learningOutcomes ? await prisma.learningOutcome.findMany({ where: { isActive: true, unit: { subject: { version: { status: "ACTIVE" } } }, ...(filter ? { OR: [{ title: filter }, { code: filter }] } : {}) }, orderBy: { code: "asc" }, take: 200 }) : [];
    const fields = [titleField(assignment?.title), f("description", "Açıklama", assignment?.description ?? ""), dateField("dueAt", "Son teslim", assignment?.dueAt.toISOString())];
    if (flags.learningOutcomes) fields.push(f("outcomeIds", "Kazanımlar (en fazla 3 · arama ile katalog süzülür)", assignment?.outcomeLinks.map((link) => link.outcomeId).join(",") ?? "", "ids", outcomes.map((item) => ({ id: item.id, name: `${item.code} · ${item.title}` }))), f("outcomeSkipReason", "Kazanım erteleme nedeni", assignment?.outcomeSkipReason ?? "COMPLETE_LATER", "choice", enums(["COMPLETE_LATER", "CATALOG_MISSING", "NOT_APPLICABLE"])));
    if (assignment) fields.push(f("isActive", "Aktif", String(assignment.isActive), "boolean"));
    else fields.unshift(groupField, f("lessonId", "Bağlı ders (isteğe bağlı)", "", "choice", (await prisma.lesson.findMany({ where: input.group ? { groupId: input.group } : {}, orderBy: { startsAt: "desc" }, take: 100 })).map((item) => ({ id: item.id, name: `${item.title} · ${item.startsAt.toISOString()}` }))));
    if (!assignment && flags.assignmentEvidence) fields.push(f("evidenceRequired", "Kanıtlı teslim", "false", "boolean"), f("rubricCriteria", "Değerlendirme ölçütleri (2–4, her satıra bir ölçüt)", "", "lines"));
    form("SAVE", assignment ? "Ödevi düzenle" : "Ödev oluştur", assignment ? `assignments/${id}` : "assignments", assignment ? "PATCH" : "POST", fields, revision);
    if (assignment) {
      data.title = assignment.title;
      const submissions = await prisma.assignmentSubmission.findMany({ where: { assignmentId: id }, orderBy: [{ submittedAt: "desc" }, { id: "asc" }], skip, take: limit + 1, include: { student: { include: { user: { select: { fullName: true, email: true } } } } } });
      data.hasMore = submissions.length > limit;
      data.rows = submissions.slice(0, limit).map((item) => ({ id: item.id, title: names(item.student.user), detail: `${item.status} · ${item.attemptNumber}. deneme`, kind: "submission", at: item.submittedAt.toISOString() }));
    } else {
      const rows = await prisma.assignment.findMany({ where: { ...(input.group ? { groupId: input.group } : {}), ...(filter ? { title: filter } : {}) }, orderBy: [{ dueAt: "desc" }, { id: "asc" }], skip, take: limit + 1 });
      data.hasMore = rows.length > limit;
      data.rows = rows.slice(0, limit).map((item) => ({ id: item.id, title: item.title, detail: item.isActive ? "Aktif" : "Arşiv", kind, at: item.dueAt.toISOString() }));
    }
  }
  if (kind === "material") {
    const item = id ? await prisma.learningMaterial.findUnique({ where: { id } }) : null;
    if (id && !item) throw new GroupMutationError("NOT_FOUND", "Materyal bulunamadı.", 404);
    const fields = [titleField(item?.title), f("description", "Açıklama", item?.description ?? ""), f("captionsAvailable", "Altyazı mevcut", String(item?.captionsAvailable ?? false), "boolean"), f("transcript", "Metin dökümü", item?.transcript ?? "")];
    if (item) {
      data.title = item.title;
      data.file = { id: item.id, title: item.title, hasFile: Boolean(item.blobPathname), url: item.blobPathname ? null : item.url, fileName: item.fileName, mimeType: item.mimeType, kind: item.kind };
      form("EDIT", "Materyali düzenle", `materials/${id}`, "PATCH", [...fields, f("isActive", "Aktif", String(item.isActive), "boolean"), ...(!item.blobPathname ? [f("url", "Bağlantı", item.url, "text", [], true)] : [])], revision);
      form("ARCHIVE", "Materyali arşivle", `materials/${id}`, "PATCH", [], revision);
    } else {
      const associations = [f("lessonId", "Bağlı ders (isteğe bağlı)", "", "choice", (await prisma.lesson.findMany({ where: input.group ? { groupId: input.group } : {}, orderBy: { startsAt: "desc" }, take: 100, include: { group: { select: { name: true } } } })).map((lesson) => ({ id: lesson.id, name: `${lesson.group.name} · ${lesson.title}` }))), f("assignmentId", "Bağlı ödev (isteğe bağlı)", "", "choice", (await prisma.assignment.findMany({ where: input.group ? { groupId: input.group } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { group: { select: { name: true } } } })).map((assignment) => ({ id: assignment.id, name: `${assignment.group.name} · ${assignment.title}` })))];
      form("LINK", "Bağlantı paylaş", "materials", "POST", [groupField, ...associations, ...fields, f("url", "Bağlantı", "", "text", [], true), f("kind", "Tür", "LINK", "choice", enums(["LINK", "PDF", "VIDEO"]))]);
      form("UPLOAD", "PDF/MP4 yükle (en fazla 4 MB)", "materials/upload", "POST", [groupField, ...fields], null, false, true);
      const rows = await prisma.learningMaterial.findMany({ where: { ...(input.group ? { groupId: input.group } : {}), ...(filter ? { title: filter } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip, take: limit + 1 });
      data.hasMore = rows.length > limit;
      data.rows = rows.slice(0, limit).map((row) => ({ id: row.id, title: row.title, detail: `${row.kind} · ${row.isActive ? "Aktif" : "Arşiv"}`, kind, at: row.createdAt.toISOString() }));
    }
  }
  if (kind === "submission") {
    const item = id ? await prisma.assignmentSubmission.findUnique({ where: { id }, include: { assignment: { include: { rubricCriteria: { orderBy: { position: "asc" } } } }, student: { include: { user: { select: { fullName: true, email: true } } } }, scores: true } }) : null;
    if (!item || !flags.assignmentEvidence) throw new GroupMutationError("NOT_FOUND", "Teslim bulunamadı.", 404);
    data.title = `${names(item.student.user)} · ${item.assignment.title}`;
    data.description = `${item.status}\n${item.textEvidence}\n${item.feedback ?? ""}\n${item.scores.map((score) => `${item.assignment.rubricCriteria.find((criterion) => criterion.id === score.criterionId)?.label ?? "Ölçüt"}: ${score.level}`).join("\n")}`;
    if (item.status === "SUBMITTED") form("REVIEW", "Teslimi değerlendir", `assignment-submissions/${id}/review`, "POST", [f("expectedVersion", "", String(item.version), "number"), f("decision", "Karar", "APPROVE", "choice", enums(["APPROVE", "REQUEST_CHANGES"])), f("feedback", "Geri bildirim", "", "text", [], true), ...item.assignment.rubricCriteria.map((criterion) => f(`score:${criterion.id}`, criterion.label, "MEETS", "score", enums(["NEEDS_WORK", "DEVELOPING", "MEETS"]))), f("interactionDurationMs", "", "0", "number")], revision);
  }
  if (kind === "setup") form("SETUP", "Grup, öğrenciler ve dersleri birlikte kur", "setup", "POST", [f("name", "Grup adı", "", "text", [], true), f("subject", "Ders", "", "text", [], true), f("level", "Seviye"), f("teacherId", "Öğretmen", "", "choice", teacherOptions, true), f("studentIds", "Öğrenciler (en fazla 4)", "", "ids", studentOptions, true), f("parentLinks", "Veli bağlantıları (isteğe bağlı)", "", "links", parents.flatMap((parent) => students.map((student) => ({ id: `${parent.id}|${student.id}`, name: `${names(parent)} → ${names(student.user)}` })))), f("lessonTitle", "İlk ders başlığı", "", "text", [], true), dateField("startsAt", "İlk ders"), f("repeatWeeks", "Hafta sayısı (1–12)", "1", "number"), urlField()]);
  if (kind === "version") {
    if (id) {
      const version = await prisma.curriculumVersion.findUnique({ where: { id }, include: { subjects: { include: { units: { include: { outcomes: true } } } } } });
      if (!version) throw new GroupMutationError("NOT_FOUND", "Sürüm bulunamadı.", 404);
      data.title = `${version.code} · ${version.title}`;
      form("STATUS", "Sürüm durumunu değiştir", `curriculum/versions/${id}`, "PATCH", [f("status", "Durum", version.status, "choice", enums(["DRAFT", "ACTIVE", "ARCHIVED"]))], revision);
      data.rows = version.subjects.flatMap((subject) => subject.units.flatMap((unit) => unit.outcomes.map((outcome) => ({ id: outcome.id, title: `${outcome.code} · ${outcome.title}`, detail: `${subject.name} · ${unit.name}`, kind: "outcome" as const, at: null }))));
    } else {
      const exams = await listActiveExamFamilies({ codes: LEGACY_CURRICULUM_EXAM_CODES });
      const since = new Date(Date.now() - 30 * 86400000);
      const [lessons, taggedLessons, assignments, taggedAssignments] = await Promise.all([prisma.lesson.count({ where: { status: "COMPLETED", startsAt: { gte: since } } }), prisma.lesson.count({ where: { status: "COMPLETED", startsAt: { gte: since }, outcomeLinks: { some: {} } } }), prisma.assignment.count({ where: { createdAt: { gte: since } } }), prisma.assignment.count({ where: { createdAt: { gte: since }, outcomeLinks: { some: {} } } })]);
      data.description = `Son 30 gün kazanım kapsaması: ders %${lessons ? Math.round(taggedLessons / lessons * 100) : 0} (${taggedLessons}/${lessons}) · ödev %${assignments ? Math.round(taggedAssignments / assignments * 100) : 0} (${taggedAssignments}/${assignments})`;
      form("CREATE", "Sürüm oluştur", "curriculum/versions", "POST", [f("code", "Sürüm kodu", "", "text", [], true), titleField(), f("exam", "Sınav", exams[0]?.code ?? "", "choice", enums(exams.map((exam) => exam.code))), f("academicYear", "Yıl", String(new Date().getFullYear()), "number"), f("sourceUrl", "Resmî kaynak bağlantısı")]);
      const versions = await prisma.curriculumVersion.findMany({ orderBy: [{ academicYear: "desc" }, { id: "asc" }], skip, take: limit + 1, include: { subjects: { include: { units: { include: { _count: { select: { outcomes: true } } } } } } } });
      data.hasMore = versions.length > limit;
      data.rows = versions.slice(0, limit).map((version) => ({ id: version.id, title: `${version.code} · ${version.title}`, detail: `${version.status} · ${version.academicYear} · ${version.subjects.reduce((sum, subject) => sum + subject.units.reduce((total, unit) => total + unit._count.outcomes, 0), 0)} kazanım`, kind, at: null }));
    }
  }
  if (kind === "outcome") {
    if (id) {
      const outcome = await prisma.learningOutcome.findUnique({ where: { id }, include: { unit: { include: { subject: true } }, skills: { include: { skill: true } } } });
      if (!outcome) throw new GroupMutationError("NOT_FOUND", "Kazanım bulunamadı.", 404);
      data.title = `${outcome.code} · ${outcome.title}`;
      data.description = `${outcome.unit.subject.name} · ${outcome.unit.name}\n${outcome.description ?? ""}\n${outcome.skills.map((link) => link.skill.name).join(", ")}`;
    } else {
      const versions = await prisma.curriculumVersion.findMany({ where: { status: { in: ["DRAFT", "ACTIVE"] } }, include: { subjects: { orderBy: { id: "asc" }, include: { units: { orderBy: { id: "asc" }, include: { outcomes: { orderBy: { id: "asc" } } } } } } }, orderBy: { code: "asc" } });
      form("CREATE", "Kazanım oluştur", "curriculum/outcomes", "POST", [f("versionId", "Sürüm", "", "choice", versions.map((item) => ({ id: item.id, name: `${item.code} · ${item.title}`, revision: educationRevision(item) })), true), f("subjectCode", "Ders kodu", "", "text", [], true), f("subjectName", "Ders adı", "", "text", [], true), f("unitCode", "Ünite kodu", "", "text", [], true), f("unitName", "Ünite adı", "", "text", [], true), f("outcomeCode", "Kazanım kodu", "", "text", [], true), titleField(), f("description", "Açıklama"), f("skills", "Beceriler (her satıra bir beceri, en fazla 5)", "", "lines")]);
    }
  }
  if (kind === "calendar") {
    const start = istanbulWeekStart(new Date(), input.week ?? 0), end = addIstanbulCalendarDays(start, 7);
    const lessons = await prisma.lesson.findMany({ where: { startsAt: { gte: start, lt: end }, ...(input.group ? { groupId: input.group } : {}), ...(input.teacher ? { teacherId: input.teacher } : {}) }, orderBy: [{ startsAt: "asc" }, { id: "asc" }], include: { group: { select: { name: true } }, teacher: { select: { fullName: true, email: true } } } });
    data.description = `${start.toISOString()} — ${end.toISOString()} · ${lessons.length} ders`;
    data.rows = lessons.map((item) => ({ id: item.id, title: item.title, detail: `${item.group.name} · ${names(item.teacher)} · ${item.status}`, kind: "lesson", at: item.startsAt.toISOString() }));
    form("FILTER", "Takvim filtreleri", "calendar/export", "POST", [f("group", "Grup", input.group ?? "", "choice", groupOptions), f("teacher", "Öğretmen", input.teacher ?? "", "choice", teacherOptions)]);
  }
  return data;
}
