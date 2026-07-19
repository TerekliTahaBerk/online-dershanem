import assert from "node:assert/strict";
import test from "node:test";
import {
  activeParentEnrollmentScope,
  activeStudentEnrollmentScope,
  learningMaterialAccessScope,
} from "./resource-scopes";

test("admin material scope is unrestricted after role authentication", () => {
  assert.deepEqual(learningMaterialAccessScope("ADMIN", "admin-1"), {});
});

test("teacher material scope is limited to their current group ownership", () => {
  assert.deepEqual(learningMaterialAccessScope("TEACHER", "teacher-1"), {
    group: { teacherId: "teacher-1" },
  });
});

test("student material scope requires an active enrollment", () => {
  assert.deepEqual(learningMaterialAccessScope("STUDENT", "student-user-1"), {
    group: {
      enrollments: {
        some: { endedAt: null, student: { userId: "student-user-1" } },
      },
    },
  });
});

test("parent material scope requires both a live parent link and active enrollment", () => {
  assert.deepEqual(learningMaterialAccessScope("PARENT", "parent-1"), {
    group: {
      enrollments: {
        some: {
          endedAt: null,
          student: { parents: { some: { parentId: "parent-1" } } },
        },
      },
    },
  });
});

test("enrollment scopes reject ended enrollment and inactive accounts", () => {
  assert.deepEqual(activeStudentEnrollmentScope("student-user-1"), {
    endedAt: null,
    student: { userId: "student-user-1", user: { status: "ACTIVE" } },
  });
  assert.deepEqual(activeParentEnrollmentScope("parent-1"), {
    endedAt: null,
    student: {
      user: { status: "ACTIVE" },
      parents: { some: { parentId: "parent-1", parent: { status: "ACTIVE" } } },
    },
  });
});
