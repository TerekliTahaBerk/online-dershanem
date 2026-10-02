export type FirstLessonSample = {
  paidAt: Date;
  firstLessonAt: Date | null;
  lessonCompleted: boolean;
  attendance: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | null;
  linkedLead: boolean;
};

/** Yenilemeler, gelecek dersler ve kayıt alınmamış katılım başarı sayılmaz. */
export function calculateFirstLessonMetrics(samples: FirstLessonSample[]) {
  const completed = samples.filter((sample) => sample.lessonCompleted && sample.firstLessonAt && sample.firstLessonAt >= sample.paidAt);
  const durations = completed.map((sample) => sample.firstLessonAt!.getTime() - sample.paidAt.getTime()).sort((a, b) => a - b);
  const recorded = completed.filter((sample) => sample.attendance && sample.attendance !== "EXCUSED");
  return {
    paidCount: samples.length,
    linkedLeadCount: samples.filter((sample) => sample.linkedLead).length,
    waitingCount: samples.length - completed.length,
    duration: { sampleSize: durations.length, value: durations.length >= 5 ? durations[Math.ceil(durations.length / 2) - 1] : null },
    participation: { sampleSize: recorded.length, value: recorded.length >= 5 ? Math.round(recorded.filter((sample) => sample.attendance === "PRESENT" || sample.attendance === "LATE").length / recorded.length * 10_000) / 100 : null },
    missingAttendanceCount: completed.length - recorded.length,
  };
}
