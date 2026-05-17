/**
 * FAZ 8 — Insight Engine.
 *
 * Verilmiş bir metric snapshot'tan insan-okunabilir yorum kartları üretir.
 * "AI" YOKTUR — sadece kural tabanlı, deterministik yorumlar.
 *
 * Insight = { id, severity, icon, title, body, hint? }
 */

import { deltaOf, linearSlope, tailAvg, clampPct } from "./core";

export type InsightSeverity = "info" | "positive" | "warn" | "danger";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  icon: string;
  title: string;
  body: string;
  hint?: string;
};

export type OdkTrendInput = {
  /** Eski → yeni sırada SUBMITTED attempt'lerin net değerleri */
  nets: number[];
  /** Aynı sırayla examTitle / lesson bilgisi (opsiyonel) */
  labels?: string[];
};

export type LessonOutcomeInput = {
  lesson: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

export type AttendanceInput = {
  /** Son 30 gün toplam */
  total: number;
  present: number;
  absent: number;
  late: number;
  /** Önceki 30 gün toplamı (kıyas için, opsiyonel) */
  prevTotal?: number;
  prevAbsent?: number;
};

export type AssignmentInput = {
  totalAssigned: number;
  submitted: number;
  graded: number;
  overdue: number;
};

/* ── ODK net trend insights ────────────────────────────────────────────── */

export function odkTrendInsights(input: OdkTrendInput): Insight[] {
  const out: Insight[] = [];
  const { nets, labels } = input;
  if (nets.length < 2) {
    if (nets.length === 1) {
      out.push({
        id: "odk-first-attempt",
        severity: "info",
        icon: "✨",
        title: "İlk denemen kaydedildi",
        body: `İlk denemenin neti: ${nets[0].toFixed(1)}. Daha fazla deneme çözdükçe trend yorumları burada görünecek.`,
      });
    }
    return out;
  }

  const last = nets[nets.length - 1];
  const prev = nets[nets.length - 2];
  const d = deltaOf(prev, last);
  const slope = linearSlope(nets.slice(-Math.min(nets.length, 5)));
  const lastAvg = tailAvg(nets, 3);
  const firstAvg = tailAvg(nets.slice(0, Math.max(3, Math.ceil(nets.length / 2))), 3);

  // Son denemede belirgin düşüş
  if (d.direction === "down" && Math.abs(d.abs) >= 3) {
    out.push({
      id: "odk-recent-drop",
      severity: "warn",
      icon: "📉",
      title: "Son denemende düşüş var",
      body: `Önceki net ${prev.toFixed(1)} → son net ${last.toFixed(1)} (${d.abs.toFixed(1)}). Yorgunluk veya konu eksiği olabilir, son denemenin yanlışlarını gözden geçirmen önerilir.`,
      hint: labels?.[labels.length - 1],
    });
  }

  // Belirgin yükseliş
  if (d.direction === "up" && d.abs >= 3) {
    out.push({
      id: "odk-recent-up",
      severity: "positive",
      icon: "📈",
      title: "Net yükseldi",
      body: `Önceki ${prev.toFixed(1)} → son ${last.toFixed(1)} (+${d.abs.toFixed(1)}). Çalışma temposu işe yarıyor görünüyor.`,
    });
  }

  // Ardışık düşüş trendi (en az 3 deneme)
  if (nets.length >= 3 && slope < -0.5) {
    out.push({
      id: "odk-down-trend",
      severity: "danger",
      icon: "⚠️",
      title: "Son denemelerde düşüş trendi",
      body: `Son ${Math.min(nets.length, 5)} denemenin lineer eğimi negatif (${slope.toFixed(2)}/deneme). Çalışma planını ve uyku/mola düzenini gözden geçir.`,
    });
  }

  // Sürekli yükseliş
  if (nets.length >= 3 && slope > 0.5) {
    out.push({
      id: "odk-up-trend",
      severity: "positive",
      icon: "🚀",
      title: "İstikrarlı yükseliş",
      body: `Son ${Math.min(nets.length, 5)} denemende eğim +${slope.toFixed(2)}. Performansın tutarlı artıyor.`,
    });
  }

  // Geniş zaman karşılaştırması
  if (nets.length >= 6) {
    const big = lastAvg - firstAvg;
    if (big >= 5) {
      out.push({
        id: "odk-long-progress",
        severity: "positive",
        icon: "🏅",
        title: "Uzun vadede belirgin gelişim",
        body: `Erken denemelere kıyasla net ortalaman ~${big.toFixed(1)} arttı.`,
      });
    } else if (big <= -5) {
      out.push({
        id: "odk-long-decline",
        severity: "danger",
        icon: "🚨",
        title: "Uzun vadede gerileme",
        body: `Erken denemelere kıyasla net ortalaman ~${Math.abs(big).toFixed(1)} azaldı.`,
      });
    }
  }

  return out;
}

/* ── Konu/Kazanım zayıflık insights ────────────────────────────────────── */

export function lessonWeaknessInsights(lessons: LessonOutcomeInput[]): Insight[] {
  const out: Insight[] = [];
  for (const l of lessons) {
    if (l.total < 10) continue;
    const successRate = clampPct((l.correct / l.total) * 100);
    if (successRate < 40) {
      out.push({
        id: `lesson-weak-${l.lesson}`,
        severity: "warn",
        icon: "🔻",
        title: `${l.lesson} zayıf alan`,
        body: `${l.lesson} dersinde başarı oranı %${successRate} (${l.correct}/${l.total}). Bu derste konu tekrarı önerilir.`,
      });
    } else if (successRate >= 80) {
      out.push({
        id: `lesson-strong-${l.lesson}`,
        severity: "positive",
        icon: "💪",
        title: `${l.lesson} güçlü alan`,
        body: `${l.lesson} dersinde başarı oranı %${successRate}. Bu konularda hız kazanmışsın.`,
      });
    }
  }
  return out;
}

/* ── Devamsızlık insights ──────────────────────────────────────────────── */

export function attendanceInsights(a: AttendanceInput): Insight[] {
  const out: Insight[] = [];
  if (a.total === 0) return out;

  const rate = clampPct((a.present / a.total) * 100);
  const absentRate = clampPct((a.absent / a.total) * 100);

  if (absentRate >= 25) {
    out.push({
      id: "att-high-absent",
      severity: "danger",
      icon: "🛑",
      title: "Devamsızlık yüksek",
      body: `Son 30 günde devamsızlık oranı %${absentRate}. Performans düşüşü buradan kaynaklanıyor olabilir.`,
    });
  } else if (absentRate >= 12) {
    out.push({
      id: "att-warn-absent",
      severity: "warn",
      icon: "⚠️",
      title: "Devamsızlık artış sinyali",
      body: `Son 30 günde %${absentRate} devamsızlık. Dikkat etmeni öneririz.`,
    });
  } else if (rate >= 92) {
    out.push({
      id: "att-good",
      severity: "positive",
      icon: "✅",
      title: "Devam oranın güçlü",
      body: `Son 30 günde %${rate} devam. Düzenin işliyor.`,
    });
  }

  // Önceki dönemle kıyas
  if (a.prevTotal && a.prevAbsent !== undefined && a.prevTotal > 0) {
    const prevAbsentRate = (a.prevAbsent / a.prevTotal) * 100;
    const diff = absentRate - prevAbsentRate;
    if (diff >= 8) {
      out.push({
        id: "att-rise",
        severity: "warn",
        icon: "📊",
        title: "Devamsızlık önceki döneme göre arttı",
        body: `Önceki dönem %${Math.round(prevAbsentRate)} → şimdi %${absentRate} (+${Math.round(diff)} puan).`,
      });
    }
  }

  return out;
}

/* ── Ödev insights ─────────────────────────────────────────────────────── */

export function assignmentInsights(a: AssignmentInput): Insight[] {
  const out: Insight[] = [];
  if (a.totalAssigned === 0) return out;

  const submitRate = clampPct((a.submitted / a.totalAssigned) * 100);
  if (a.overdue >= 3) {
    out.push({
      id: "asg-overdue",
      severity: "danger",
      icon: "⏰",
      title: `${a.overdue} ödev geciktirildi`,
      body: `Son tarihi geçen ${a.overdue} ödev var. Toparlanmazsa not ortalamasını etkiler.`,
    });
  }
  if (submitRate < 50 && a.totalAssigned >= 4) {
    out.push({
      id: "asg-low-submit",
      severity: "warn",
      icon: "📝",
      title: "Ödev tamamlama oranı düşük",
      body: `Verilen ${a.totalAssigned} ödevden sadece ${a.submitted} tanesi gönderildi (%${submitRate}).`,
    });
  } else if (submitRate >= 90) {
    out.push({
      id: "asg-good-submit",
      severity: "positive",
      icon: "🌟",
      title: "Ödev disiplini güçlü",
      body: `${a.submitted}/${a.totalAssigned} ödev gönderildi (%${submitRate}).`,
    });
  }
  return out;
}

/* ── Yardımcı: tüm kategorileri birleştir, severity'ye göre sırala ────── */

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  danger: 0,
  warn: 1,
  positive: 2,
  info: 3,
};

export function sortInsights(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
