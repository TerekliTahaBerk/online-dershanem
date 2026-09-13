/**
 * ÖDEV İLERLEME DURUM MAKİNESİ.
 *
 * İki ayrı durum var ve karıştırılmamalı:
 *  - `AssignmentProgress.status` — öğrencinin kendi işaretlediği ilerleme.
 *  - `AssignmentSubmission.status` — öğretmenin değerlendirme kararı.
 *
 * Kanıt istemeyen ödevde ilerleme serbesttir: öğrenci işareti geri alabilir.
 * Kanıtlı ödevde ise KARAR ÖĞRETMENİNDİR; öğrencinin ilerlemesi değerlendirme
 * sonucunu geçersizleştiremez.
 *
 * Eskiden yalnız `DONE` engelleniyordu. Öğretmen çalışmayı ONAYLADIKTAN sonra
 * öğrenci hâlâ `IN_PROGRESS`/`TODO` gönderebiliyordu: ödev öğretmen ekranında
 * yeniden "yapılmadı" görünüyor, buna karşılık tamamlanma kanıtı
 * (`StudentProgressEvidence`) yerinde duruyordu — iki ekran birbirini
 * yalanlıyordu.
 */

export type AssignmentProgressStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type AssignmentSubmissionStatus = "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";

export type ProgressTransitionRejection = {
  code: "EVIDENCE_REQUIRED" | "UNDER_REVIEW" | "ALREADY_APPROVED";
  message: string;
};

export function rejectAssignmentProgressTransition(input: {
  evidenceRequired: boolean;
  nextStatus: AssignmentProgressStatus;
  /** Öğrencinin bu ödevdeki EN SON teslimi; hiç teslim yoksa null. */
  latestSubmissionStatus: AssignmentSubmissionStatus | null;
}): ProgressTransitionRejection | null {
  if (!input.evidenceRequired) return null;

  if (input.latestSubmissionStatus === "APPROVED") {
    return {
      code: "ALREADY_APPROVED",
      message: "Öğretmenin onayladığı çalışmanın durumu değiştirilemez.",
    };
  }

  if (input.latestSubmissionStatus === "SUBMITTED") {
    return {
      code: "UNDER_REVIEW",
      message: "Çalışman değerlendirmede; sonuçlanana kadar durumu değiştiremezsin.",
    };
  }

  if (input.nextStatus === "DONE") {
    return {
      code: "EVIDENCE_REQUIRED",
      message: "Bu çalışma öğretmen onayından sonra tamamlanır; önce kanıtını gönder.",
    };
  }

  return null;
}
