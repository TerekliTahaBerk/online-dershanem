import assert from "node:assert/strict";
import test from "node:test";
import {
  adminPreviewPageViewEvent,
  isPreviewableRole,
  previewBannerCopy,
  previewNoticeMessage,
  previewRoleLabel,
} from "./preview-context";

test("previewable roles are only student/parent/teacher", () => {
  assert.equal(isPreviewableRole("STUDENT"), true);
  assert.equal(isPreviewableRole("PARENT"), true);
  assert.equal(isPreviewableRole("TEACHER"), true);
  assert.equal(isPreviewableRole("ADMIN"), false);
  assert.equal(isPreviewableRole("SUPPORT"), false);
});

test("banner copy is role-specific and explicit", () => {
  const student = previewBannerCopy({ role: "STUDENT", subjectName: "Ayşe Yılmaz" });
  assert.match(student.body, /Ayşe Yılmaz/);
  assert.match(student.body, /öğrencinin/);
  assert.equal(student.ctaLabel, "Öğrenci görünümünü aç");

  const parent = previewBannerCopy({ role: "PARENT", subjectName: "Fatma Yılmaz" });
  assert.match(parent.body, /velinin/);
  assert.equal(parent.ctaLabel, "Veli görünümünü aç");

  const teacher = previewBannerCopy({ role: "TEACHER", subjectName: "Mehmet Kaya" });
  assert.match(teacher.body, /öğretmenin/);
  assert.equal(teacher.ctaLabel, "Öğretmen görünümünü aç");
});

test("notice messages stay operational", () => {
  assert.match(previewNoticeMessage("ARCHIVED"), /arşivlenmiş/);
  assert.match(previewNoticeMessage("INVITE_PENDING"), /davetini/);
  assert.match(previewNoticeMessage("NO_PARENT_CHILDREN"), /bağlı öğrencisi yok/);
  assert.match(previewNoticeMessage("NO_TEACHER_ASSIGNMENT"), /aktif grup/);
});

test("analytics helper does not use student product event names", () => {
  const event = adminPreviewPageViewEvent({ previewRole: "STUDENT", path: "/panel/ogrenci" });
  assert.equal(event.name, "admin_preview_page_viewed");
  assert.equal(event.properties.previewRole, "STUDENT");
  assert.equal(event.properties.pathBand, "STUDENT_PANEL");
});

test("role labels are Turkish", () => {
  assert.equal(previewRoleLabel("STUDENT"), "öğrenci");
  assert.equal(previewRoleLabel("PARENT"), "veli");
  assert.equal(previewRoleLabel("TEACHER"), "öğretmen");
});
