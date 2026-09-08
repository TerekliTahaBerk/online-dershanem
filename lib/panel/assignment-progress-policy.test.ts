import assert from "node:assert/strict";
import test from "node:test";

import { rejectAssignmentProgressTransition } from "./assignment-progress-policy";

test("kanıt istemeyen ödevde her ilerleme geçişi serbesttir", () => {
  for (const nextStatus of ["TODO", "IN_PROGRESS", "DONE"] as const) {
    assert.equal(
      rejectAssignmentProgressTransition({
        evidenceRequired: false,
        nextStatus,
        latestSubmissionStatus: null,
      }),
      null,
    );
  }
});

test("kanıtlı ödev öğrenci tarafından DONE işaretlenemez", () => {
  const rejection = rejectAssignmentProgressTransition({
    evidenceRequired: true,
    nextStatus: "DONE",
    latestSubmissionStatus: null,
  });
  assert.equal(rejection?.code, "EVIDENCE_REQUIRED");
});

test("kanıtlı ödevde revizyon istenmişse öğrenci çalışmaya geri dönebilir", () => {
  assert.equal(
    rejectAssignmentProgressTransition({
      evidenceRequired: true,
      nextStatus: "IN_PROGRESS",
      latestSubmissionStatus: "CHANGES_REQUESTED",
    }),
    null,
  );
});

test("değerlendirme sürerken öğrenci durumu geri alamaz", () => {
  const rejection = rejectAssignmentProgressTransition({
    evidenceRequired: true,
    nextStatus: "TODO",
    latestSubmissionStatus: "SUBMITTED",
  });
  assert.equal(rejection?.code, "UNDER_REVIEW");
});

test("ONAYLANMIŞ çalışma IN_PROGRESS'e geri çekilemez", () => {
  // §8'deki yasak geçiş: EVALUATED → IN_PROGRESS.
  for (const nextStatus of ["TODO", "IN_PROGRESS", "DONE"] as const) {
    const rejection = rejectAssignmentProgressTransition({
      evidenceRequired: true,
      nextStatus,
      latestSubmissionStatus: "APPROVED",
    });
    assert.equal(rejection?.code, "ALREADY_APPROVED", `${nextStatus} reddedilmeliydi`);
  }
});
