/**
 * Kullanıcı arşivleme etki analizi — saf özet tipleri.
 */

export type ArchiveImpactBucket = {
  key: string;
  label: string;
  count: number;
  severity: "info" | "warning" | "blocking";
};

export type ArchiveImpactSummary = {
  userId: string;
  role: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  canHardDelete: boolean;
  recommendArchive: boolean;
  buckets: ArchiveImpactBucket[];
  message: string;
};

export function summarizeArchiveImpact(input: {
  userId: string;
  role: ArchiveImpactSummary["role"];
  buckets: ArchiveImpactBucket[];
}): ArchiveImpactSummary {
  const hasCritical = input.buckets.some((b) => b.severity === "blocking" && b.count > 0);
  const hasHistory = input.buckets.some((b) => b.count > 0);
  return {
    userId: input.userId,
    role: input.role,
    canHardDelete: !hasHistory,
    recommendArchive: hasHistory || hasCritical,
    buckets: input.buckets.filter((b) => b.count > 0),
    message: hasCritical
      ? "Kritik ilişkiler var; güvenli arşivleme kullanın. Kalıcı silme kapalı."
      : hasHistory
        ? "Geçmiş kayıtlar var; arşivleme önerilir."
        : "Kritik geçmiş yok; güvenlik modeline uygunsa kalıcı silme mümkün olabilir.",
  };
}
