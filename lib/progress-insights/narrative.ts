import type {
  InsightAudience,
  ProgressInsightBundle,
  TeacherGidisatOverview,
} from "@/lib/progress-insights/types";

function fmtNet(value: number): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Rol bazlı gidişat cümleleri.
 * parent_calm: risk/skor/akran yok; yalnızca yönsel dil.
 */
export function buildNarrativeForAudience(
  bundle: Omit<ProgressInsightBundle, "narrative">,
  audience: InsightAudience,
): string[] {
  if (bundle.isEmpty) {
    if (audience === "student") {
      return ["Henüz gösterilecek gidişat verisi yok. Ders, çalışma ve denemeler biriktikçe burada açılır."];
    }
    if (audience === "parent_calm") {
      return ["Henüz yeterli ölçüm yok. Ders katılımı ve çalışmalar göründükçe özet burada oluşur."];
    }
    return ["Bu kapsamda henüz gidişat verisi yok."];
  }

  const lines: string[] = [];
  const { academic, behavioral } = bundle;

  if (audience === "student") {
    if (academic.netDelta !== null && academic.netTrend.length >= 2) {
      const first = academic.netTrend[0]!.net;
      const last = academic.netTrend[academic.netTrend.length - 1]!.net;
      if (academic.netDelta > 0) {
        lines.push(
          `Toplam netin ${fmtNet(first)} → ${fmtNet(last)} yükseldi. Bu ivmeyi koru.`,
        );
      } else if (academic.netDelta < 0) {
        lines.push(
          `Toplam netin ${fmtNet(first)} → ${fmtNet(last)} geriledi. Destek alanlarına odaklan.`,
        );
      } else {
        lines.push(`Toplam netin ${fmtNet(last)} civarında dengeli.`);
      }
    }
    if (behavioral.attendance.percent !== null) {
      lines.push(
        behavioral.attendance.percent >= 80
          ? `Son ${behavioral.attendance.denominator} derste katılımın güçlü (%${behavioral.attendance.percent}).`
          : `Son ${behavioral.attendance.denominator} derste katılımın %${behavioral.attendance.percent}. Düzeni güçlendir.`,
      );
    }
    if (behavioral.assignments.percent !== null) {
      lines.push(
        `Çalışmalarının %${behavioral.assignments.percent}'i tamamlandı (${behavioral.assignments.numerator}/${behavioral.assignments.denominator}).`,
      );
    }
    if (behavioral.plan.percent !== null) {
      lines.push(`Haftalık planın %${behavioral.plan.percent}'si tamam.`);
    }
    for (const s of academic.strengths.slice(0, 1)) lines.push(s.sentence);
    for (const s of academic.supportAreas.slice(0, 1)) lines.push(s.sentence);
  }

  if (audience === "parent_calm") {
    if (academic.netDelta !== null && academic.netTrend.length >= 2) {
      const first = academic.netTrend[0]!.net;
      const last = academic.netTrend[academic.netTrend.length - 1]!.net;
      if (academic.netDelta > 0) {
        lines.push(
          `Deneme toplam neti ${fmtNet(first)} → ${fmtNet(last)} yükseldi. Karşılaştırma yalnızca kendi geçmişiyle yapılır.`,
        );
      } else if (academic.netDelta < 0) {
        lines.push(
          `Deneme toplam neti ${fmtNet(first)} → ${fmtNet(last)}. Tekrar önerilen alanlar aşağıda.`,
        );
      } else {
        lines.push(`Deneme toplam neti dengeli ilerliyor (${fmtNet(last)}).`);
      }
    }
    if (behavioral.attendance.percent !== null) {
      lines.push(
        behavioral.attendance.percent >= 80
          ? "Ders katılımı düzenli görünüyor."
          : behavioral.attendance.percent < 70
            ? "Son derslerde çalışma düzeninde düşüş var."
            : "Katılım ritmi oluşmaya devam ediyor.",
      );
    }
    if (behavioral.assignments.percent !== null) {
      lines.push(`Çalışma tamamlama %${behavioral.assignments.percent}.`);
    }
    if (behavioral.plan.percent !== null) {
      lines.push(`Haftalık planın %${behavioral.plan.percent}'si tamamlandı.`);
    }
    for (const s of academic.strengths.slice(0, 2)) lines.push(s.sentence);
    for (const s of academic.supportAreas.slice(0, 2)) lines.push(s.sentence);
  }

  if (audience === "teacher" || audience === "admin") {
    if (academic.netDelta !== null) {
      lines.push(
        `Net değişim: ${academic.netDelta > 0 ? "+" : ""}${fmtNet(academic.netDelta)} (son ${academic.examCount} deneme).`,
      );
    }
    if (behavioral.attendance.percent !== null) {
      lines.push(`Katılım %${behavioral.attendance.percent}.`);
    }
    if (behavioral.assignments.percent !== null) {
      lines.push(`Çalışma tamamlama %${behavioral.assignments.percent}.`);
    }
    if (behavioral.plan.percent !== null) {
      lines.push(`Plan tamamlama %${behavioral.plan.percent}.`);
    }
    if (audience === "teacher" && bundle.riskHint) {
      lines.push(bundle.riskHint);
    }
  }

  return lines.length ? lines : ["Gidişat verileri birikiyor; özet yakında netleşir."];
}

export function buildTeacherOverviewNarrative(overview: TeacherGidisatOverview): string[] {
  const lines: string[] = [];
  lines.push(`${overview.studentCount} öğrenci kapsamında gidişat özeti.`);
  if (overview.averages.attendancePercent !== null) {
    lines.push(`Ortalama katılım %${overview.averages.attendancePercent}.`);
  }
  if (overview.averages.assignmentPercent !== null) {
    lines.push(`Ortalama çalışma tamamlama %${overview.averages.assignmentPercent}.`);
  }
  if (overview.averages.planPercent !== null) {
    lines.push(`Ortalama plan tamamlama %${overview.averages.planPercent}.`);
  }
  if (overview.averages.medianNetDelta !== null) {
    const d = overview.averages.medianNetDelta;
    lines.push(`Medyan net değişim ${d > 0 ? "+" : ""}${d}.`);
  }
  if (overview.declining.length) {
    lines.push(`${overview.declining.length} öğrencide düşen gidişat sinyali var.`);
  } else if (overview.studentCount > 0) {
    lines.push("Düşen gidişat listesinde öğrenci yok.");
  }
  return lines;
}
