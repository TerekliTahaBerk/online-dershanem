import assert from "node:assert/strict";
import test from "node:test";
import { educationFormBody, parseEducationEditor, parseEducationPreview, type EducationForm } from "./admin-education-editor";
const form: EducationForm = { id: "CREATE", title: "Create", path: "/api/panel/lessons", method: "POST", revision: null, preview: true, upload: false, fields: [] };
function field(key: string, type: EducationForm["fields"][number]["type"], value = "", required = false) { return { key, type, value, required, label: key, options: [] }; }
test("education dates normalize to UTC and optional blank end date is omitted", () => {
  const body = educationFormBody({ ...form, fields: [field("startsAt", "date", "2026-10-12T12:00:00+03:00", true), field("seriesEndsOn", "date")] }, {});
  assert.deepEqual(body, { startsAt: "2026-10-12T09:00:00.000Z" });
  assert.throws(() => educationFormBody({ ...form, fields: [field("startsAt", "date", "bad", true)] }, {}));
});
test("individual lesson ignores required group and group lesson omits student and teacher override", () => {
  const fields = [field("targetType", "choice", "STUDENT"), field("groupId", "choice", "", true), field("studentId", "choice", "s1"), field("teacherId", "choice", "t1")];
  assert.deepEqual(educationFormBody({ ...form, fields }, { targetType: "STUDENT" }), { targetType: "STUDENT", studentId: "s1", teacherId: "t1" });
  assert.deepEqual(educationFormBody({ ...form, fields }, { targetType: "GROUP", groupId: "g1" }), { targetType: "GROUP", groupId: "g1" });
});
test("rubric, parent links and outcome IDs serialize into structured payloads", () => {
  const fields = [field("score:c1", "score", "MEETS"), field("score:c2", "score", "DEVELOPING"), field("parentLinks", "links", "p1|s1,p2|s2"), field("outcomeIds", "ids", "o1,o2"), field("rubricCriteria", "lines", " First \n\n Second "), field("evidenceRequired", "boolean", "true")];
  assert.deepEqual(educationFormBody({ ...form, fields }, {}), { scores: [{ criterionId: "c1", level: "MEETS" }, { criterionId: "c2", level: "DEVELOPING" }], parentLinks: [{ parentId: "p1", studentId: "s1" }, { parentId: "p2", studentId: "s2" }], outcomeIds: ["o1", "o2"], rubricCriteria: ["First", "Second"], evidenceRequired: true });
});
test("unknown editor version and malformed preview fail closed", () => {
  assert.equal(parseEducationEditor({ contractVersion: 2 }).ok, false);
  assert.equal(parseEducationPreview({ count: 1, hasConflicts: false, conflicts: [], occurrences: [{ startsAt: "bad", endsAt: "bad", label: "bad" }] }).ok, false);
});
