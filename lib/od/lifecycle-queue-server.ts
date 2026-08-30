import "server-only";

import { prisma } from "@/lib/prisma";
import type { OdOnboardingStateValue } from "@/lib/od/onboarding-state";
import { classifyOdLifecycle, type OdLifecycleExceptionCode } from "@/lib/od/lifecycle-exceptions";

/**
 * OPERASYON KUYRUĞU (OD-013).
 *
 * Eskiden bu ekran ödenmiş ve henüz `ACTIVE` olmamış HER siparişi listeliyordu.
 * Hesap açma, davet, veli bağı ve tercihler otomatikleştikten sonra o liste
 * yanıltıcı hâle geldi: satırların çoğu kendi kendine ilerliyor ve insanın
 * bakması gereken birkaç kaydı gömüyordu.
 *
 * Artık üç kova ayrı döner. Ekranın VARSAYILAN görünümü yalnız istisnalardır;
 * yerleştirme kararı ayrı bir bölümde, kendi kendine ilerleyenler ise tek bir
 * sayı olarak görünür.
 */

export type OdLifecycleRow = {
  onboardingId: string;
  orderId: string;
  packageName: string;
  totalCents: number;
  customerName: string;
  state: OdOnboardingStateValue;
  flowType: string;
  dueAt: Date | null;
  stateEnteredAt: Date;
  ownerName: string | null;
  ownerId: string | null;
  blockedFromState: OdOnboardingStateValue | null;
  blockerReason: string | null;
  hasStudentAccount: boolean;
  linkedUserId: string | null;
  /** Sıralı istisna kodları; boşsa satır istisna değildir. */
  codes: OdLifecycleExceptionCode[];
  missing: string[];
  placementPreferences: { timeRanges?: string[]; earliestStartDate?: string | null; noSlotPreference?: string } | null;
  transitions: { id: string; occurredAt: Date; fromState: OdOnboardingStateValue | null; toState: OdOnboardingStateValue; actorName: string; note: string | null }[];
};

export type OdLifecycleQueue = {
  exceptions: OdLifecycleRow[];
  humanDecisions: OdLifecycleRow[];
  automatedCount: number;
  /** Otomasyonun tamamladığı, artık kuyrukta olmayan sipariş sayısı. */
  activeCount: number;
};

export async function getOdLifecycleQueue(now = new Date()): Promise<OdLifecycleQueue> {
  const [rows, activeCount] = await Promise.all([
    prisma.odOnboarding.findMany({
      where: { order: { status: "PAID" }, state: { not: "ACTIVE" } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      include: {
        owner: { select: { fullName: true, email: true } },
        transitions: { orderBy: { occurredAt: "desc" }, take: 3, include: { actor: { select: { fullName: true, email: true } } } },
        order: {
          include: {
            accountClaims: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, createdAt: true } },
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                studentProfile: {
                  select: {
                    parents: { select: { confirmedAt: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
                    enrollments: { where: { endedAt: null }, select: { group: { select: { name: true, lessons: { where: { status: "PLANNED" }, select: { id: true }, take: 1 } } } } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.odOnboarding.count({ where: { order: { status: "PAID" }, state: "ACTIVE" } }),
  ]);

  /*
   * Veli reddi bağı SİLER; geriye bakılacak bir `ParentStudent` satırı kalmaz.
   * Bu yüzden kodu, reddi yazan SİSTEM geçişinin metadata'sından okuyoruz —
   * satır başına sorgu açmadan, tek toplu okumayla.
   */
  const rejectionOnboardingIds = new Set(
    (await prisma.odOnboardingTransition.findMany({
      where: { onboardingId: { in: rows.map((row) => row.id) }, toState: "MANUAL_REVIEW", actorType: "SYSTEM" },
      orderBy: { occurredAt: "desc" },
      select: { onboardingId: true, metadata: true },
    }))
      .filter((transition) => (transition.metadata as { code?: string } | null)?.code === "RELATIONSHIP_REJECTED")
      .map((transition) => transition.onboardingId),
  );

  const exceptions: OdLifecycleRow[] = [];
  const humanDecisions: OdLifecycleRow[] = [];
  let automatedCount = 0;

  for (const row of rows) {
    const profile = row.order.user?.studentProfile;
    const link = profile?.parents[0];
    const relationship = rejectionOnboardingIds.has(row.id)
      ? { status: "REJECTED" as const, createdAt: row.stateEnteredAt }
      : link
        ? { status: link.confirmedAt ? ("CONFIRMED" as const) : ("UNCONFIRMED" as const), createdAt: link.createdAt }
        : null;
    const claim = row.order.accountClaims[0] ?? null;

    const classification = classifyOdLifecycle({
      state: row.state as OdOnboardingStateValue,
      provisioningStatus: row.order.provisioningStatus,
      dueAt: row.dueAt,
      claim,
      relationship,
    }, now);

    if (classification.bucket === "AUTOMATED") {
      automatedCount += 1;
      continue;
    }

    const hasGroup = Boolean(profile?.enrollments.length);
    const hasLesson = Boolean(profile?.enrollments.some((enrollment) => enrollment.group.lessons.length));
    const mapped: OdLifecycleRow = {
      onboardingId: row.id,
      orderId: row.orderId,
      packageName: row.order.packageName,
      totalCents: row.order.totalCents,
      customerName: row.order.user?.fullName || row.order.user?.email || "Henüz hesaba bağlanmadı",
      state: row.state as OdOnboardingStateValue,
      flowType: row.flowType,
      dueAt: row.dueAt,
      stateEnteredAt: row.stateEnteredAt,
      ownerName: row.owner?.fullName || row.owner?.email || null,
      ownerId: row.ownerId,
      blockedFromState: row.blockedFromState as OdOnboardingStateValue | null,
      blockerReason: row.blockerReason,
      hasStudentAccount: Boolean(profile),
      linkedUserId: row.order.userId,
      codes: classification.codes,
      missing: [
        !profile ? "Öğrenci hesabı eksik" : null,
        profile && !relationship ? "Veli bağlantısı eksik" : null,
        profile && !hasGroup ? "Grup ataması eksik" : null,
        profile && hasGroup && !hasLesson ? "İlk ders eksik" : null,
      ].filter(Boolean) as string[],
      placementPreferences: ((row.order.buyerInfo ?? {}) as { placementPreferences?: OdLifecycleRow["placementPreferences"] }).placementPreferences ?? null,
      transitions: row.transitions.map((transition) => ({
        id: transition.id,
        occurredAt: transition.occurredAt,
        fromState: transition.fromState as OdOnboardingStateValue | null,
        toState: transition.toState as OdOnboardingStateValue,
        actorName: transition.actor?.fullName || transition.actor?.email || "Sistem",
        note: transition.note,
      })),
    };

    if (classification.bucket === "EXCEPTION") exceptions.push(mapped);
    else humanDecisions.push(mapped);
  }

  return { exceptions, humanDecisions, automatedCount, activeCount };
}
