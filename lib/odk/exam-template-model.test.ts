import assert from "node:assert/strict";
import test from "node:test";
import {
  ODK_EXAM_TEMPLATES,
  buildTemplateSnapshot,
  getExamTemplate,
  readTemplateSnapshot,
  resolveTemplateForCreate,
  templateIntegrityIssues,
  templateTrackSections,
  templateValidForYear,
} from "./exam-templates";
import { validateVersionReadiness, type VersionReadinessInput } from "./exam-domain";

/** Faz 3 — sürümlü TYT/AYT/LGS şablonları (docs/roadmaps/odk-exam-experience-overhaul.md). */

test("her şablon sürüm, kaynak, mod ve sınırlı geçerlilik taşır; alt testler bölüm sayısına eşittir", () => {
  for (const template of Object.values(ODK_EXAM_TEMPLATES)) {
    assert.match(template.templateVersion, /^\d{4}\.\d+$/, template.code);
    assert.ok(template.source.length > 10, template.code);
    assert.ok(["OFFICIAL", "CUSTOM"].includes(template.mode), template.code);
    assert.ok(template.validToYear !== null && template.validToYear >= template.validFromYear, `${template.code}: geçerlilik sınırsız olamaz`);
    assert.deepEqual(templateIntegrityIssues(template), [], template.code);
  }
});

test("resmî tam denemeler OFFICIAL, branş (matematik) denemeleri CUSTOM", () => {
  assert.equal(getExamTemplate("TYT_FULL")!.mode, "OFFICIAL");
  assert.equal(getExamTemplate("AYT_FULL")!.mode, "OFFICIAL");
  assert.equal(getExamTemplate("LGS_FULL")!.mode, "OFFICIAL");
  assert.equal(getExamTemplate("TYT_MATH")!.mode, "CUSTOM");
});

test("TYT: 120 soru / 165 dk; Sosyal ve Fen alt testleri ayrı", () => {
  const tyt = getExamTemplate("TYT_FULL")!;
  assert.equal(tyt.durationMinutes, 165);
  const sosyal = tyt.sections.find((section) => section.code === "SOSYAL")!;
  assert.deepEqual(sosyal.subtests?.map((subtest) => [subtest.code, subtest.questionCount]), [["TARIH", 5], ["COGRAFYA", 5], ["FELSEFE", 5], ["DIN", 5]]);
  const fen = tyt.sections.find((section) => section.code === "FEN")!;
  assert.deepEqual(fen.subtests?.map((subtest) => [subtest.code, subtest.questionCount]), [["FIZIK", 7], ["KIMYA", 7], ["BIYOLOJI", 6]]);
});

test("AYT: 160 soru / 180 dk; edebiyat, tarih, coğrafya, felsefe, din, fizik, kimya, biyoloji alt testleri", () => {
  const ayt = getExamTemplate("AYT_FULL")!;
  assert.equal(ayt.durationMinutes, 180);
  const codes = ayt.sections.flatMap((section) => (section.subtests ?? []).map((subtest) => subtest.code));
  assert.deepEqual(codes, ["EDEBIYAT", "TARIH1", "COGRAFYA1", "TARIH2", "COGRAFYA2", "FELSEFE_GRUBU", "DIN", "FIZIK", "KIMYA", "BIYOLOJI"]);
});

test("AYT alanları beklenen bölümleri şablondan alır", () => {
  const ayt = getExamTemplate("AYT_FULL")!;
  assert.deepEqual(templateTrackSections(ayt, "SAY"), ["MAT", "FEN"]);
  assert.deepEqual(templateTrackSections(ayt, "ea"), ["MAT", "EDB_SOS1"]);
  assert.deepEqual(templateTrackSections(ayt, "SOZ"), ["EDB_SOS1", "SOS2"]);
  assert.equal(templateTrackSections(ayt, "DIL"), null);
  assert.equal(templateTrackSections(getExamTemplate("TYT_FULL")!, "SAY"), null);
});

test("LGS: 50 sözel / 75 dk ve 40 sayısal / 80 dk iki oturum", () => {
  const lgs = getExamTemplate("LGS_FULL")!;
  const count = (codes: string[]) => lgs.sections.filter((section) => codes.includes(section.code)).reduce((sum, section) => sum + section.questionCount, 0);
  assert.deepEqual(lgs.sessions!.map((session) => [session.key, count(session.sectionCodes), session.durationMinutes]), [["SOZEL", 50, 75], ["SAYISAL", 40, 80]]);
});

test("geçerlilik penceresi dışındaki yıl için şablon reddedilir", () => {
  const tyt = getExamTemplate("TYT_FULL")!;
  assert.equal(templateValidForYear(tyt, 2026), true);
  assert.equal(templateValidForYear(tyt, tyt.validFromYear - 1), false);
  assert.equal(templateValidForYear(tyt, tyt.validToYear! + 1), false);
  assert.throws(() => resolveTemplateForCreate({ family: "TYT", structureMode: "FULL_TEMPLATE", academicYear: tyt.validToYear! + 1 }), /geçerli değil/);
  assert.equal(resolveTemplateForCreate({ family: "TYT", structureMode: "FULL_TEMPLATE", academicYear: 2026 }).code, "TYT_FULL");
});

test("anlık görüntü bölüm içi alt test aralıklarını üretir ve geri okunur", () => {
  const snapshot = buildTemplateSnapshot(getExamTemplate("AYT_FULL")!);
  const edb = snapshot.sections.find((section) => section.code === "EDB_SOS1")!;
  assert.deepEqual(edb.subtests.map((subtest) => [subtest.code, subtest.questionStart, subtest.questionEnd]), [["EDEBIYAT", 1, 24], ["TARIH1", 25, 34], ["COGRAFYA1", 35, 40]]);
  assert.deepEqual(readTemplateSnapshot({ sessions: [], template: JSON.parse(JSON.stringify(snapshot)) }), snapshot);
  assert.equal(readTemplateSnapshot({}), null);
  assert.equal(readTemplateSnapshot({ template: { code: "X" } }), null);
});

test("anlık görüntü sürümdeki gerçek bölüm sayısıyla (branş denemesi) kurulur; alt test yoksa boş", () => {
  const snapshot = buildTemplateSnapshot(getExamTemplate("TYT_MATH")!, { MAT: 25 });
  assert.deepEqual(snapshot.sections, [{ code: "MAT", title: "TYT Matematik", questionCount: 25, subtests: [] }]);
});

function tytInput(patch: Partial<VersionReadinessInput> = {}): VersionReadinessInput {
  const sections = [
    { code: "TURKCE", count: 40 },
    { code: "SOSYAL", count: 20 },
    { code: "MAT", count: 40 },
    { code: "FEN", count: 19 },
  ].map((section) => ({
    code: section.code,
    questionCount: section.count,
    questions: Array.from({ length: section.count }, (_, index) => ({ questionNumber: index + 1, correctOption: "A" as const, outcomes: [{ outcomeId: `${section.code}-${index}`, isPrimary: true }] })),
  }));
  return { family: "TYT", familyCode: "TYT", durationMinutes: 165, scoringPolicyCode: "TYT_FULL_V1", structureMode: "FULL_TEMPLATE", templateCode: "TYT_FULL", files: ["BOOKLET_PDF"], sections, ...patch };
}

test("resmî modda standart dışı soru sayısı yayını engeller", () => {
  const issue = validateVersionReadiness(tytInput()).find((item) => item.code === "SECTION_QUESTION_COUNT_NONSTANDARD");
  assert.equal(issue?.level, "error");
});

test("hazırlık kontrolü güncel şablon yerine sürümdeki anlık görüntüyü kullanır", () => {
  const snapshot = buildTemplateSnapshot(getExamTemplate("TYT_FULL")!, { FEN: 19 });
  const legacy = { ...snapshot, mode: "CUSTOM" as const };
  const issues = validateVersionReadiness(tytInput({ templateSnapshot: legacy }));
  assert.deepEqual(issues.filter((item) => item.level === "error"), []);
});
