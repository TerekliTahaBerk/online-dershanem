import type { SubjectSeries } from "@/components/panel/student/subject-trend";

export function selectLatestSixChronological<T extends { takenAt: Date }>(exams: T[]) {
  return [...exams]
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())
    .slice(0, 6)
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
}

export function buildTrendCaption(series: SubjectSeries[]) {
  const parts = series
    .map((s) => {
      const actual = s.nets.filter((n): n is number => n !== null);
      if (actual.length < 2) return null;
      const first = actual[0];
      const last = actual[actual.length - 1];
      const dir = last > first ? "yükseldi" : last < first ? "geriledi" : "sabit kaldı";
      return `${s.name} neti ${first.toLocaleString("tr-TR")} → ${last.toLocaleString("tr-TR")} (${dir})`;
    })
    .filter((p): p is string => p !== null);
  return parts.length ? `${parts.join(". ")}.` : undefined;
}

