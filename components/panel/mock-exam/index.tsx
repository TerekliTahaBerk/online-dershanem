"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserRole } from "@prisma/client";
import { summarizeMockExamTrend } from "@/lib/mock-exams";
import { sendPanelEvent } from "@/lib/panel-event-client";
import { MockExamEntryForm } from "./entry-form";
import { ExamAnalysis } from "./exam-analysis";
import { ExamList } from "./exam-list";
import { countBand } from "./helpers";
import type { MockExamView } from "./types";

export type { MockExamView } from "./types";

/**
 * Dış deneme (MockExam) çalışma alanı: hızlı giriş, kişisel hata eğilimi ve
 * son denemeler. Paylaşılan durum (kayıt listesi, seçili öğrenci, durum
 * mesajı) burada tutulur. ODK sınavlarıyla ilgisi yoktur.
 */
export function MockExamWorkspace({
  role,
  students,
  initialExams,
  canCreate = true,
  canReview = false,
}: {
  role: UserRole;
  students: { id: string; name: string }[];
  initialExams: MockExamView[];
  canCreate?: boolean;
  canReview?: boolean;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [status, setStatus] = useState("");
  const [exams, setExams] = useState(initialExams);
  const visibleExams =
    studentId && role !== "STUDENT"
      ? exams.filter((exam) => exam.studentId === studentId)
      : exams;
  const trend = useMemo(
    () =>
      summarizeMockExamTrend(
        visibleExams.map((exam) => ({
          exam: exam.exam,
          takenAt: new Date(exam.takenAt),
          sections: exam.sections.map((section) => ({
            ...section,
            errors: section.errors.map((category) => ({ category })),
          })),
        })),
      ),
    [visibleExams],
  );

  useEffect(() => {
    sendPanelEvent({
      name: "mock_heatmap_viewed",
      properties: {
        examType:
          visibleExams.length &&
          visibleExams.every((item) => item.exam === visibleExams[0].exam)
            ? visibleExams[0].exam
            : "MIXED",
        examCountBand: countBand(visibleExams.length),
      },
    });
    // İlk görünüm telemetrisi bileşen ömründe yalnız bir kez gönderilmelidir; liste değişimleri yeni görünüm değildir.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only analytics event

  async function approveAction(examId: string, action: string) {
    const target = exams.find((exam) => exam.id === examId);
    if (!target) return;
    const response = await fetch(`/api/panel/mock-exams/${examId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reasons: target.sections.map((section) => ({
          sectionId: section.id,
          categories: section.errors,
        })),
        nextAction: action,
      }),
    });
    if (!response.ok)
      return setStatus(
        (await response.json().catch(() => ({}))).error ||
          "Eylem onaylanamadı.",
      );
    setExams((current) =>
      current.map((exam) =>
        exam.id === examId ? { ...exam, nextAction: action } : exam,
      ),
    );
    setStatus("Sonraki küçük eylem öğretmen tarafından onaylandı.");
  }

  return (
    <div>
      {canCreate ? (
        <MockExamEntryForm
          role={role}
          students={students}
          studentId={studentId}
          onStudentChange={setStudentId}
          status={status}
          onStatusChange={setStatus}
          onCreated={(exam) => setExams((current) => [exam, ...current])}
        />
      ) : null}
      <ExamAnalysis
        trend={trend}
        latestExam={visibleExams[0]}
        canReview={canReview}
        first={!canCreate}
        onApprove={(examId, action) => void approveAction(examId, action)}
      />
      <ExamList
        exams={visibleExams}
        role={role}
        canReview={canReview}
        onSectionsSaved={(examId, sections) =>
          setExams((current) =>
            current.map((item) =>
              item.id === examId ? { ...item, sections } : item,
            ),
          )
        }
      />
    </div>
  );
}
