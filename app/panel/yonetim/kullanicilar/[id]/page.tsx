import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { SignupProfileCard } from "@/components/panel/signups/signup-profile-card";
import { productLabel, roleLabel } from "@/lib/auth/roles";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelCard,
  PanelCardTitle,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { USER_STATUS_PRESENTATION } from "@/lib/panel/status-vocabulary";
import { ACCESS_SOURCE_LABEL, accessEditableHere, accessState, sortAccessObjects } from "@/lib/panel/access-objects";
import { ApproveMfaResetButton } from "@/components/panel/mfa-reset-controls";
import { AdminUserProfileForm } from "@/components/panel/admin-user-profile-form";
import { AdminAccessibilityAccommodationForm } from "@/components/panel/admin-accessibility-accommodation-form";
import { AdminProductAccessForm } from "@/components/panel/admin-product-access-form";
import { AdminStaffResponsibilitiesForm } from "@/components/panel/admin-staff-responsibilities-form";
import { listStaffAssignmentHistory } from "@/lib/products/staff-assignment-server";
import { hasPrivilegedStaffRole } from "@/lib/products/staff-permission-matrix";
import { adminHasMfa } from "@/lib/auth/mfa";
import { RequestMfaResetForm } from "@/components/panel/mfa-reset-controls";
import { UserRowActions } from "@/components/panel/user-row-actions";
import { ArchiveUserAction } from "@/components/panel/archive-user-action";
import { TeacherOffboardingForm } from "@/components/panel/teacher-offboarding-form";
import { AdminPreviewLaunchButton } from "@/components/panel/admin-preview-launch-button";
import {
  StudentTeacherLinkForm,
  StudentTeacherUnlinkButton,
} from "@/components/panel/student-teacher-link-form";
import { getTeacherLifecycleSummary } from "@/lib/panel/teacher-lifecycle-server";
import { isPreviewableRole } from "@/lib/panel/preview-context";

export const dynamic = "force-dynamic";

/**
 * ADMIN · KİŞİ DETAYI — onaylı tasarım (Panel.dc.html → aStudent).
 *
 * Tasarımın bu ekrandaki ASIL fikri, eski sürümde hiç yoktu: "ödeme alındı
 * ama ürün erişimi açılmadı" durumunun en üstte, kırmızı kenarlı bir uyarı
 * olarak durması ve doğrudan siparişe götürmesi. Provisioning'i ödemeden
 * ayıran görünüm sipariş detayında kurulmuştu; burası ona açılan kapı.
 *
 * Uyarı GERÇEK veriden türetilir: ödenmiş ama `provisioningStatus`u
 * tamamlanmamış siparişler. Sorun yoksa uyarı hiç basılmaz.
 *
 * Sekmeler (§14.2, `?sekme=`): Profil · Ürünler (erişim nesneleri + mevcut
 * erişim formu) · Sorumluluklar (yalnız öğretmen) · İlişkiler · Güvenlik (MFA,
 * bekleyen sıfırlama, hesap durumu, arşiv, offboarding) · Geçmiş (bu kişinin
 * işlem kaydı). Korunan davranışlar (hiçbiri yeniden yazılmadı): profil formu,
 * ürün erişim formu, admin MFA kurtarma (kendi hesabına açılmaz), öğrenci
 * akademik düzenleme formu, gruplar/veli bağlantıları/notlar ve öğretmen–veli
 * bölümleri.
 */

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

const ALL_PRODUCTS = ["OD", "OK", "ODK"] as const;

const USER_TABS = [
  { id: "profil", label: "Profil" },
  { id: "urunler", label: "Ürünler" },
  { id: "sorumluluklar", label: "Sorumluluklar" },
  { id: "iliskiler", label: "İlişkiler" },
  { id: "guvenlik", label: "Güvenlik" },
  { id: "gecmis", label: "Geçmiş" },
] as const;
type UserTab = (typeof USER_TABS)[number]["id"];

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      teacherProfile: true,
      studentProfile: {
        include: {
          parents: {
            include: {
              parent: { select: { id: true, fullName: true, email: true } },
            },
          },
          enrollments: {
            where: { endedAt: null },
            include: {
              group: {
                include: {
                  teacher: {
                    select: { id: true, fullName: true, email: true },
                  },
                },
              },
            },
          },
          attendances: { orderBy: { createdAt: "desc" }, take: 20 },
          coachAssignments: {
            where: { endedAt: null },
            take: 1,
            select: {
              cadenceDays: true,
              coach: {
                select: { user: { select: { fullName: true, email: true } } },
              },
            },
          },
          notes: {
            orderBy: { updatedAt: "desc" },
            take: 10,
            include: {
              lesson: {
                include: { group: { select: { name: true, subject: true } } },
              },
            },
          },
        },
      },
      parentStudents: {
        include: {
          student: {
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      },
      taughtGroups: {
        orderBy: { name: "asc" },
        include: { enrollments: { where: { endedAt: null } } },
      },
      taughtLessons: {
        orderBy: { startsAt: "desc" },
        take: 12,
        include: { group: { select: { id: true, name: true } } },
      },
      studentTeacherAssignments: {
        where: { active: true, endedAt: null },
        orderBy: { subject: "asc" },
        include: {
          student: {
            select: {
              id: true,
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      },
      odOrders: { orderBy: { createdAt: "desc" }, take: 10 },
      accessibilityPreference: true,
      productMemberships: {
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          product: true,
          source: true,
          startsAt: true,
          expiresAt: true,
          revokedAt: true,
          productRef: { select: { name: true } },
          grantedBy: { select: { fullName: true, email: true } },
          sourceOdOrder: { select: { id: true, packageName: true } },
        },
      },
    },
  });
  if (!user) notFound();

  const student = user.studentProfile;
  const attendance = student?.attendances ?? [];
  const attended = attendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;
  const now = new Date();
  const activeMemberships = user.productMemberships.filter((m) => accessState(m, now).label === "Aktif");
  const activeProducts = new Set(activeMemberships.map((m) => m.product));
  // Sorumluluklar yalnız öğretmende anlamlıdır; diğer rollerde sekme çizilmez.
  const tabs = USER_TABS.filter((tab) => tab.id !== "sorumluluklar" || user.role === "TEACHER");
  const tab: UserTab = tabs.find((item) => item.id === query.sekme)?.id ?? "profil";
  const tabHref = (next: UserTab) => (next === "profil" ? `/panel/yonetim/kullanicilar/${user.id}` : `/panel/yonetim/kullanicilar/${user.id}?sekme=${next}`);
  const [hasMfa, pendingResets, auditRows] = await Promise.all([
    tab === "guvenlik" && (user.role === "ADMIN" || user.role === "TEACHER") ? adminHasMfa(user.id) : Promise.resolve(null),
    tab === "guvenlik"
      ? prisma.mfaResetRequest.findMany({
          where: { targetUserId: user.id, status: "PENDING", expiresAt: { gt: now } },
          orderBy: { createdAt: "desc" },
          select: { id: true, reason: true, createdAt: true, requestedById: true, requestedBy: { select: { fullName: true, email: true } } },
        })
      : Promise.resolve([]),
    tab === "gecmis"
      ? prisma.auditLog.findMany({
          where: { entityId: user.id },
          orderBy: { createdAt: "desc" },
          take: 60,
          select: { id: true, action: true, summary: true, createdAt: true, actorUserId: true },
        })
      : Promise.resolve([]),
  ]);
  const auditActors = auditRows.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: [...new Set(auditRows.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])))] } },
            select: { id: true, fullName: true, email: true },
          })
        ).map((actor) => [actor.id, actor.fullName || actor.email]),
      )
    : new Map<string, string>();
  const coach = student?.coachAssignments[0] ?? null;
  const teacherLifecycle =
    user.role === "TEACHER" ? await getTeacherLifecycleSummary(user.id) : null;
  const staffHistory = user.role === "TEACHER" ? await listStaffAssignmentHistory(user.id) : [];
  const staffMfaPending =
    user.role === "TEACHER" &&
    hasPrivilegedStaffRole(staffHistory.filter((row) => !row.revokedAt)) &&
    !(await adminHasMfa(user.id));
  const teacherStudentLinks =
    user.role === "TEACHER"
      ? user.studentTeacherAssignments.map((link) => ({
          id: link.id,
          subject: link.subject,
          studentId: link.student.id,
          studentName: link.student.user.fullName || link.student.user.email,
        }))
      : [];
  // Aynı öğrenci farklı branşlarla bağlanabilir; listeyi tüm aktif öğrencilerden tut.
  const linkableStudents =
    user.role === "TEACHER"
      ? (
          await prisma.studentProfile.findMany({
            where: { user: { status: "ACTIVE", role: "STUDENT" } },
            orderBy: { user: { fullName: "asc" } },
            take: 80,
            select: {
              id: true,
              user: { select: { fullName: true, email: true } },
            },
          })
        ).map((profile) => ({
          id: profile.id,
          name: profile.user.fullName || profile.user.email,
        }))
      : [];

  /* Tasarımın kırmızı uyarısı: ödendi ama erişim açılmadı. */
  const blockedOrders = user.odOrders.filter(
    (o) => o.status === "PAID" && o.provisioningStatus !== "SUCCEEDED",
  );
  const blocked = blockedOrders[0] ?? null;
  const previewLabel =
    user.role === "STUDENT"
      ? "Öğrenci Panelini Gör"
      : user.role === "PARENT"
        ? "Veli Panelini Gör"
        : user.role === "TEACHER"
          ? "Öğretmen Panelini Gör"
          : null;

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Kişi detayı"
    >
      <div className="max-w-[1040px]">
        <Link href="/panel/yonetim/kisiler" className={buttonClass("ghost", "sm", "-ml-2.5")}>
          <ArrowLeft size={14} aria-hidden="true" /> Kişiler
        </Link>

        <PageHeader
          eyebrow={roleLabel(user.role)}
          title={user.fullName || user.email}
          description={`${user.email}${user.phone ? ` · ${user.phone}` : ""} · kayıt ${DATE.format(user.createdAt)}${user.lastLoginAt ? ` · son giriş ${DATE_TIME.format(user.lastLoginAt)}` : ""}`}
          metadata={<StatusBadge presentation={USER_STATUS_PRESENTATION[user.status]} />}
          actions={
            <>
              {previewLabel && isPreviewableRole(user.role) ? (
                <AdminPreviewLaunchButton
                  previewRole={user.role}
                  previewUserId={user.id}
                  label={previewLabel}
                  returnPath={`/panel/yonetim/kullanicilar/${user.id}`}
                />
              ) : null}
              {blocked ? (
                <Link href={`/panel/yonetim/siparisler/${blocked.id}`} className={buttonClass("primary", "md")}>
                  Erişim sorununu çöz
                </Link>
              ) : null}
            </>
          }
        />

        {blocked ? (
          <section
            aria-labelledby="erisim-sorunu"
            className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-pn-border border-l-[3px] border-l-(--pn-tone-critical) bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <h2 id="erisim-sorunu" className="text-[14.5px] font-semibold text-pn-text">
                Ödeme alındı, ürün erişimi açılmadı
              </h2>
              <p className="mt-0.5 text-[13.5px] text-pn-text-muted">
                {blocked.packageName} · {DATE_TIME.format(blocked.createdAt)}
                {blocked.provisioningError ? ` · ${blocked.provisioningError}` : ""}
              </p>
            </div>
            <Link href={`/panel/yonetim/siparisler/${blocked.id}`} className={buttonClass("secondary", "sm")}>
              Siparişi aç
            </Link>
          </section>
        ) : null}

        <div className="mt-4">
          <ViewTabs label="Kişi detayı" activeId={tab} tabs={tabs.map((item) => ({ id: item.id, label: item.label, href: tabHref(item.id) }))} />
        </div>

        {tab === "profil" ? (
          <div className="mt-5 space-y-5">
            <AdminUserProfileForm
              user={{
                id: user.id,
                role: user.role,
                email: user.email,
                fullName: user.fullName || "",
                phone: user.phone || "",
                classLevel: student?.classLevel || "",
                schoolName: student?.schoolName || "",
                targetGoal: student?.targetGoal || "",
                subjects: user.teacherProfile?.subjects || [],
                bio: user.teacherProfile?.bio || "",
              }}
            />
            {user.role === "STUDENT" && getPanelFeatureFlags().accessibilityProfile ? (
              <AdminAccessibilityAccommodationForm
                userId={user.id}
                initial={{
                  version: user.accessibilityPreference?.version || 0,
                  assessmentExtraPercent: user.accessibilityPreference?.assessmentExtraPercent || 0,
                  breaksAllowed: user.accessibilityPreference?.breaksAllowed || false,
                }}
              />
            ) : null}
            {user.role === "STUDENT" || user.role === "PARENT" ? <SignupProfileCard userId={user.id} /> : null}
          </div>
        ) : null}

        {tab === "urunler" ? (
          <div className="mt-5 space-y-6">
            <Section title="Ürün erişimleri" description="Kaynak, süre ve sipariş bağlantısı erişim kaydından gelir. Satın alınmış erişim yalnız sipariş üzerinden yönetilir." divider={false}>
              {user.productMemberships.length ? (
                <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                  {sortAccessObjects(user.productMemberships, now).map((membership) => {
                    const state = accessState(membership, now);
                    const productName = membership.product ? productLabel(membership.product) : membership.productRef?.name || "Ürün";
                    return (
                      <li key={membership.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[14.5px] font-semibold text-pn-text">{productName}</p>
                          <p className="mt-0.5 text-[13px] text-pn-text-secondary">
                            {ACCESS_SOURCE_LABEL[membership.source]} · {DATE.format(membership.startsAt)} →{" "}
                            {membership.expiresAt ? DATE.format(membership.expiresAt) : "süresiz"}
                            {membership.revokedAt ? ` · ${DATE.format(membership.revokedAt)} tarihinde sonlandırıldı` : ""}
                          </p>
                          {membership.grantedBy ? (
                            <p className="text-[12.5px] text-pn-text-muted">Veren: {membership.grantedBy.fullName || membership.grantedBy.email}</p>
                          ) : null}
                          {membership.sourceOdOrder ? (
                            <Link href={`/panel/yonetim/siparisler/${membership.sourceOdOrder.id}`} className="text-[12.5px] text-pn-text-secondary underline underline-offset-2">
                              Sipariş: {membership.sourceOdOrder.packageName}
                            </Link>
                          ) : null}
                        </div>
                        <span className="flex items-center gap-2">
                          <StatusBadge tone={state.tone} label={state.label} />
                          {!accessEditableHere(membership) ? <span className="text-[12px] text-pn-text-muted">siparişten yönetilir</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title="Ürün erişimi yok." body={user.role === "TEACHER" ? "Personel erişimi Sorumluluklar sekmesindeki atamalardan gelir." : undefined} />
              )}
            </Section>
            {/* Personel ürün erişimi atamalardan türetilir ("Sorumluluklar" sekmesi). */}
            {user.role !== "TEACHER" ? (
              <AdminProductAccessForm
                userId={user.id}
                role={user.role}
                initialProducts={activeMemberships.flatMap((m) => (m.product ? [m.product] : []))}
              />
            ) : null}
            {user.odOrders.length ? (
              <Section title="Siparişler">
                <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                  {user.odOrders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-2.5 text-[13.5px]">
                      <Link href={`/panel/yonetim/siparisler/${order.id}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                        {order.packageName}
                      </Link>
                      <span className="text-pn-text-muted">
                        {DATE.format(order.createdAt)} · {order.status === "PAID" ? (order.provisioningStatus === "SUCCEEDED" ? "Ödendi · erişim açık" : "Ödendi · erişim bekliyor") : order.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>
        ) : null}

        {tab === "sorumluluklar" && user.role === "TEACHER" ? (
          <div className="mt-5">
            <AdminStaffResponsibilitiesForm
              userId={user.id}
              history={staffHistory}
              coachCapacity={user.teacherProfile?.coachCapacity ?? null}
              mfaPending={staffMfaPending}
            />
          </div>
        ) : null}

        {tab === "iliskiler" ? (
          <div className="mt-5 space-y-5">
            {student ? (
              <>
                <Section title="Atamalar" divider={false}>
                  <PropertyList>
                    <PropertyRow label="Öğretmen / grup">
                      {student.enrollments.length
                        ? student.enrollments.map((e) => `${e.group.teacher.fullName || e.group.teacher.email} · ${e.group.name}`).join(", ")
                        : "Grup ataması yok"}
                    </PropertyRow>
                    <PropertyRow label="Veli">
                      {student.parents.length ? student.parents.map((p) => p.parent.fullName || p.parent.email).join(", ") : "Bağlı veli yok"}
                    </PropertyRow>
                    <PropertyRow label="Koç">
                      {coach
                        ? `${coach.coach.user.fullName || coach.coach.user.email}${coach.cadenceDays ? ` · ${coach.cadenceDays} günde bir` : ""}`
                        : "Koç atanmadı"}
                    </PropertyRow>
                    <PropertyRow label="Ürünler">
                      {ALL_PRODUCTS.filter((code) => activeProducts.has(code)).map((code) => productLabel(code)).join(" · ") || "Erişim yok"}
                    </PropertyRow>
                    <PropertyRow label="Son ders katılımı">
                      {attendance.length ? `%${Math.round((attended / attendance.length) * 100)} · ${attended}/${attendance.length}` : "Kayıt yok"}
                    </PropertyRow>
                  </PropertyList>
                  {student ? (
                    <Link href={`/panel/yonetim/ogrenciler/${student.id}`} className={buttonClass("secondary", "sm", "mt-3")}>
                      Öğrenci 360&apos;ı aç
                    </Link>
                  ) : null}
                </Section>
                <Section title="Gruplar">
                  {student.enrollments.length ? (
                    <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                      {student.enrollments.map((enrollment) => (
                        <li key={enrollment.id} className="px-4 py-2.5 text-[13.5px]">
                          <Link href={`/panel/yonetim/gruplar/${enrollment.group.id}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                            {enrollment.group.name} · {enrollment.group.subject}
                          </Link>
                          <span className="block text-[12.5px] text-pn-text-muted">{enrollment.group.teacher.fullName || enrollment.group.teacher.email}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-pn-text-muted">Aktif grup yok.</p>
                  )}
                </Section>
                <Section title="Veli bağlantıları">
                  {student.parents.length ? (
                    <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                      {student.parents.map((link) => (
                        <li key={link.id} className="px-4 py-2.5 text-[13.5px]">
                          <Link href={`/panel/yonetim/kullanicilar/${link.parent.id}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                            {link.parent.fullName || link.parent.email}
                          </Link>
                          <span className="block text-[12.5px] text-pn-text-muted">{link.relationship || "Veli"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-pn-text-muted">Veli bağlantısı yok.</p>
                  )}
                </Section>
                <Section title="Son öğretmen notları">
                  {student.notes.length ? (
                    <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                      {student.notes.map((note) => (
                        <li key={note.id} className="px-4 py-2.5 text-[13.5px]">
                          <p className="text-[12.5px] text-pn-text-muted">
                            {note.lesson.group.subject} · {DATE.format(note.updatedAt)}
                          </p>
                          <p className="mt-0.5 text-pn-text">{note.note || note.nextGoal || note.homework || "Not içeriği yok"}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-pn-text-muted">Henüz bireysel not yok.</p>
                  )}
                </Section>
              </>
            ) : null}

            {user.role === "TEACHER" ? (
              <>
                {teacherLifecycle ? (
                  <Section title="Öğretmen özeti" divider={false}>
                    <PropertyList>
                      <PropertyRow label="Ders alanları">{teacherLifecycle.teacher.subjects.join(", ") || "Tanımlı değil"}</PropertyRow>
                      <PropertyRow label="Koçluk">
                        {teacherLifecycle.teacher.isCoach
                          ? `Evet${teacherLifecycle.teacher.coachCapacity ? ` · kapasite ${teacherLifecycle.teacher.coachCapacity}` : ""}`
                          : "Hayır"}
                      </PropertyRow>
                      <PropertyRow label="Aktif grup / öğrenci">
                        {teacherLifecycle.counts.activeGroups} / {teacherLifecycle.counts.activeStudents}
                      </PropertyRow>
                      <PropertyRow label="Gelecek ders">{String(teacherLifecycle.counts.upcomingLessons)}</PropertyRow>
                      <PropertyRow label="Bekleyen ders kapanışı">{String(teacherLifecycle.counts.pendingLessonClosures)}</PropertyRow>
                      <PropertyRow label="Açık yardım talebi">{String(teacherLifecycle.activeResponsibilities.openHelpRequests)}</PropertyRow>
                      <PropertyRow label="Açık müdahale / koçluk">
                        {String(teacherLifecycle.activeResponsibilities.openInterventions + teacherLifecycle.activeResponsibilities.coachAssignments)}
                      </PropertyRow>
                    </PropertyList>
                  </Section>
                ) : null}
                <Section title="Sorumlu gruplar">
                  {user.taughtGroups.length ? (
                    <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                      {user.taughtGroups.map((group) => (
                        <li key={group.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[13.5px]">
                          <Link href={`/panel/yonetim/gruplar/${group.id}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                            {group.name} · {group.subject}
                          </Link>
                          <span className="tabular-nums text-pn-text-muted">
                            {group.enrollments.length}/{group.capacity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-pn-text-muted">Sorumlu grup yok.</p>
                  )}
                </Section>
                <Section title="Branş öğrencileri">
                  {teacherStudentLinks.length ? (
                    <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                      {teacherStudentLinks.map((link) => (
                        <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13.5px]">
                          <span>
                            <span className="block text-[12.5px] text-pn-text-muted">{link.subject}</span>
                            <Link href={`/panel/yonetim/ogrenciler/${link.studentId}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                              {link.studentName}
                            </Link>
                          </span>
                          <StudentTeacherUnlinkButton linkId={link.id} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-pn-text-muted">Branş bağlantısı yok.</p>
                  )}
                  <StudentTeacherLinkForm teacherId={user.id} students={linkableStudents} />
                </Section>
                <Section title="Son dersler">
                  {user.taughtLessons.length ? (
                    <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                      {user.taughtLessons.map((lesson) => (
                        <li key={lesson.id} className="px-4 py-2.5 text-[13.5px]">
                          <span className="font-medium text-pn-text">{lesson.title}</span>
                          <span className="block text-[12.5px] text-pn-text-muted">
                            {lesson.group.name} · {DATE.format(lesson.startsAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-pn-text-muted">Kayıtlı ders yok.</p>
                  )}
                </Section>
              </>
            ) : null}

            {user.role === "PARENT" ? (
              <Section title="Bağlı öğrenciler" divider={false}>
                {user.parentStudents.length ? (
                  <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                    {user.parentStudents.map((link) => (
                      <li key={link.id} className="px-4 py-2.5 text-[13.5px]">
                        <Link href={`/panel/yonetim/kullanicilar/${link.student.user.id}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                          {link.student.user.fullName || link.student.user.email}
                        </Link>
                        <span className="block text-[12.5px] text-pn-text-muted">{link.relationship || "Veli"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13.5px] text-pn-text-muted">Bağlı öğrenci yok.</p>
                )}
              </Section>
            ) : null}

            {user.role === "ADMIN" ? <p className="text-[13.5px] text-pn-text-muted">Yönetici hesabının öğrenci, grup veya veli ilişkisi yoktur.</p> : null}
          </div>
        ) : null}

        {tab === "guvenlik" ? (
          <div className="mt-5 space-y-6">
            <Section title="İkinci faktör" divider={false}>
              <PropertyList>
                <PropertyRow label="MFA">
                  {hasMfa === null ? "Bu rol için gerekmiyor" : hasMfa ? "Kurulu" : staffMfaPending ? "MFA kurulumu bekleniyor" : "Kurulu değil"}
                </PropertyRow>
              </PropertyList>
              {pendingResets.length ? (
                <ul className="mt-3 divide-y divide-pn-border-subtle rounded-lg border border-(--pn-tone-warning)/40">
                  {pendingResets.map((request) => (
                    <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13.5px]">
                      <span>
                        <span className="font-medium text-pn-text">Bekleyen MFA sıfırlama</span>
                        <span className="block text-[12.5px] text-pn-text-muted">
                          {request.requestedBy.fullName || request.requestedBy.email} · {DATE_TIME.format(request.createdAt)} · {request.reason}
                        </span>
                      </span>
                      {request.requestedById !== session.userId ? (
                        <ApproveMfaResetButton requestId={request.id} />
                      ) : (
                        <span className="text-[12.5px] text-pn-text-muted">İkinci bir yönetici onaylamalı</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* Yönetici MFA kurtarma — cihaz kaybında tek çıkış yolu. Kendi hesabınız
                  için açılamaz; sunucu da aynı kuralı uygular. */}
              {user.role === "ADMIN" && user.id !== session.userId ? (
                <div className="mt-4">
                  <RequestMfaResetForm userId={user.id} />
                </div>
              ) : null}
            </Section>

            <PanelCard>
              <PanelCardTitle>Hesap durumu</PanelCardTitle>
              <p className="mt-2 text-[13px] leading-[1.6] text-dc-ink-muted">
                Kalıcı silme geri alınamaz. Hesap önce arşivlenir; kritik kayıtlar varsa sistem silmeyi engeller.
              </p>
              <div className="mt-4 space-y-4">
                <UserRowActions
                  userId={user.id}
                  email={user.email}
                  fullName={user.fullName}
                  phone={user.phone}
                  status={user.status}
                  inviteAcceptedAt={user.inviteAcceptedAt?.toISOString() ?? null}
                  isSelf={user.id === session.userId}
                />
                {user.status !== "ARCHIVED" && user.id !== session.userId ? (
                  <ArchiveUserAction userId={user.id} userName={user.fullName || user.email} />
                ) : null}
              </div>
            </PanelCard>

            {user.role === "TEACHER" ? (
              <PanelCard>
                <PanelCardTitle>Güvenli offboarding</PanelCardTitle>
                <div className="mt-3">
                  <TeacherOffboardingForm teacherId={user.id} />
                </div>
              </PanelCard>
            ) : null}
          </div>
        ) : null}

        {tab === "gecmis" ? (
          <Section title="Geçmiş" description="Bu kişiyle ilgili kayıtlı yönetim işlemleri." divider={false}>
            {auditRows.length ? (
              <ol className="mt-1 divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                {auditRows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-[13.5px]">
                    <span className="min-w-0 text-pn-text">{row.summary || row.action}</span>
                    <span className="shrink-0 text-[12.5px] text-pn-text-muted">
                      {row.actorUserId ? auditActors.get(row.actorUserId) || "Kullanıcı" : "Sistem"} · {DATE_TIME.format(row.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="Kayıtlı işlem yok." />
            )}
            <Link href="/panel/yonetim/kayitlar" className={buttonClass("ghost", "sm", "mt-3")}>
              Tüm işlem geçmişi
            </Link>
          </Section>
        ) : null}
      </div>
    </PanelShell>
  );
}
