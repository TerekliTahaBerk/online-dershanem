import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { productLabel, roleLabel } from "@/lib/auth/roles";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";
import { AdminUserProfileForm } from "@/components/panel/admin-user-profile-form";
import { AdminAccessibilityAccommodationForm } from "@/components/panel/admin-accessibility-accommodation-form";
import { AdminProductAccessForm } from "@/components/panel/admin-product-access-form";
import { RequestMfaResetForm } from "@/components/panel/mfa-reset-controls";
import { UserRowActions } from "@/components/panel/user-row-actions";
import { TeacherOffboardingForm } from "@/components/panel/teacher-offboarding-form";
import { AdminPreviewLaunchButton } from "@/components/panel/admin-preview-launch-button";
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
 * Korunan davranışlar (hiçbiri yeniden yazılmadı): profil formu, ürün erişim
 * formu, admin MFA kurtarma (kendi hesabına açılmaz), öğrenci akademik
 * düzenleme formu, gruplar/veli bağlantıları/notlar ve öğretmen–veli
 * bölümleri.
 */

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

const ALL_PRODUCTS = ["OD", "OK", "ODK"] as const;

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className={tone ?? "text-dc-ink-muted"}>{value}</dd>
    </div>
  );
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("ADMIN");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      teacherProfile: true,
      studentProfile: {
        include: {
          parents: { include: { parent: { select: { id: true, fullName: true, email: true } } } },
          enrollments: {
            where: { endedAt: null },
            include: {
              group: { include: { teacher: { select: { id: true, fullName: true, email: true } } } },
            },
          },
          attendances: { orderBy: { createdAt: "desc" }, take: 20 },
          coachAssignments: {
            where: { endedAt: null },
            take: 1,
            select: {
              cadenceDays: true,
              coach: { select: { user: { select: { fullName: true, email: true } } } },
            },
          },
          notes: {
            orderBy: { updatedAt: "desc" },
            take: 10,
            include: { lesson: { include: { group: { select: { name: true, subject: true } } } } },
          },
        },
      },
      parentStudents: {
        include: { student: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
      },
      taughtGroups: { orderBy: { name: "asc" }, include: { enrollments: { where: { endedAt: null } } } },
      taughtLessons: {
        orderBy: { startsAt: "desc" },
        take: 12,
        include: { group: { select: { id: true, name: true } } },
      },
      odOrders: { orderBy: { createdAt: "desc" }, take: 10 },
      accessibilityPreference: true,
      productMemberships: {
        where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { product: true },
      },
    },
  });
  if (!user) notFound();

  const student = user.studentProfile;
  const attendance = student?.attendances ?? [];
  const attended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const activeProducts = new Set(user.productMemberships.map((m) => m.product));
  const coach = student?.coachAssignments[0] ?? null;
  const teacherLifecycle = user.role === "TEACHER" ? await getTeacherLifecycleSummary(user.id) : null;

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
        <Link
          href="/panel/yonetim/kullanicilar"
          className="inline-flex items-center gap-1.5 text-[13px] text-dc-ink-faint transition-colors hover:text-dc-brand-hover"
        >
          <ArrowLeft size={13} aria-hidden="true" /> Kişilere dön
        </Link>

        <div className="mt-2">
          <PanelHeading
            eyebrow={roleLabel(user.role)}
            title={user.fullName || user.email}
            description={`${user.email}${user.phone ? ` · ${user.phone}` : ""} · kayıt ${DATE.format(user.createdAt)}${
              user.status === "ACTIVE"
                ? ""
                : user.status === "ARCHIVED"
                  ? " · hesap arşivde"
                  : " · hesap askıda"
            }`}
            actions={
              <div className="flex flex-wrap gap-2">
                {previewLabel && isPreviewableRole(user.role) ? (
                  <AdminPreviewLaunchButton
                    previewRole={user.role}
                    previewUserId={user.id}
                    label={previewLabel}
                    returnPath={`/panel/yonetim/kullanicilar/${user.id}`}
                  />
                ) : null}
                {blocked ? (
                  <Link
                    href={`/panel/yonetim/siparisler/${blocked.id}`}
                    className="rounded-[10px] bg-dc-brand px-[18px] py-[11px] text-[13.5px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
                  >
                    Erişim sorununu çöz
                  </Link>
                ) : null}
              </div>
            }
          />
        </div>

        {blocked ? (
          <section className="mt-5 flex flex-wrap items-center gap-4 rounded-[14px] border border-dc-line border-l-[3px] border-l-[#C2493D] bg-white px-[22px] py-[18px]">
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-dc-ink">
                Ödeme alındı, ürün erişimi açılmadı
              </h2>
              <p className="mt-1 text-[13.5px] text-dc-ink-muted">
                {blocked.packageName} · {DATE_TIME.format(blocked.createdAt)}
                {blocked.provisioningError ? ` · ${blocked.provisioningError}` : ""}
              </p>
            </div>
            <Link
              href={`/panel/yonetim/siparisler/${blocked.id}`}
              className="rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
            >
              Siparişi aç
            </Link>
          </section>
        ) : null}

        <div className="mt-5">
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
        </div>

        <PanelCard className="mt-5">
          <PanelCardTitle>Hesap yaşam döngüsü</PanelCardTitle>
          <p className="mt-2 text-[13px] leading-[1.6] text-dc-ink-muted">
            Kalıcı silme geri alınamaz. Hesap önce arşivlenir; kritik kayıtlar varsa sistem silmeyi engeller.
          </p>
          <div className="mt-4">
            <UserRowActions
              userId={user.id}
              email={user.email}
              fullName={user.fullName}
              phone={user.phone}
              status={user.status}
              inviteAcceptedAt={user.inviteAcceptedAt?.toISOString() ?? null}
              isSelf={user.id === session.userId}
            />
          </div>
        </PanelCard>

        <AdminProductAccessForm
          userId={user.id}
          role={user.role}
          initialProducts={user.productMemberships.map((m) => m.product)}
        />

        {/* Yönetici MFA kurtarma — cihaz kaybında tek çıkış yolu. Kendi hesabınız
            için açılamaz; sunucu da aynı kuralı uygular. */}
        {user.role === "ADMIN" && user.id !== session.userId ? (
          <div className="mt-5">
            <RequestMfaResetForm userId={user.id} />
          </div>
        ) : null}

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

        {student ? (
          <>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <PanelCard>
                <PanelCardTitle>Ürün erişimleri</PanelCardTitle>
                <dl className="mt-3.5 flex flex-col gap-3 text-[14px] font-medium text-dc-ink-body">
                  {ALL_PRODUCTS.map((code) => {
                    const active = activeProducts.has(code);
                    const pending = !active && blocked;
                    return (
                      <Row
                        key={code}
                        label={productLabel(code)}
                        value={
                          active
                            ? "Açık"
                            : pending
                              ? `Açılmadı · ${blocked.packageName}`
                              : "Satın alınmadı"
                        }
                        tone={
                          active
                            ? "text-dc-brand-hover"
                            : pending
                              ? "text-[#C2493D]"
                              : "text-dc-ink-ghost"
                        }
                      />
                    );
                  })}
                </dl>
                <p className="mt-3.5 text-[12.5px] leading-[1.6] text-dc-ink-faint">
                  Erişim başlangıç ve bitiş tarihleri sipariş kaydından gelir. Elle
                  değişiklik kayıt altına alınır.
                </p>
              </PanelCard>

              <PanelCard>
                <PanelCardTitle>Atamalar ve ilişkiler</PanelCardTitle>
                <dl className="mt-3.5 flex flex-col gap-3 text-[14px] font-medium text-dc-ink-body">
                  <Row
                    label="Öğretmen / grup"
                    value={
                      student.enrollments.length
                        ? student.enrollments
                            .map(
                              (e) =>
                                `${e.group.teacher.fullName || e.group.teacher.email} · ${e.group.name}`,
                            )
                            .join(", ")
                        : "Grup ataması yok"
                    }
                    tone={student.enrollments.length ? undefined : "text-[#A5764A]"}
                  />
                  <Row
                    label="Veli"
                    value={
                      student.parents.length
                        ? student.parents
                            .map((p) => p.parent.fullName || p.parent.email)
                            .join(", ")
                        : "Bağlı veli yok"
                    }
                    tone={student.parents.length ? undefined : "text-[#A5764A]"}
                  />
                  <Row
                    label="Koç"
                    value={
                      coach
                        ? `${coach.coach.user.fullName || coach.coach.user.email}${
                            coach.cadenceDays ? ` · ${coach.cadenceDays} günde bir` : ""
                          }`
                        : "Koç atanmadı"
                    }
                    tone={coach ? undefined : "text-[#A5764A]"}
                  />
                  <Row
                    label="Son ders katılımı"
                    value={
                      attendance.length
                        ? `%${Math.round((attended / attendance.length) * 100)} · ${attended}/${attendance.length}`
                        : "Kayıt yok"
                    }
                  />
                  <Row label="Bağlı sipariş" value={`${user.odOrders.length}`} />
                </dl>
              </PanelCard>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <PanelCard>
                <PanelCardTitle>Gruplar</PanelCardTitle>
                <div className="mt-3.5 flex flex-col gap-2">
                  {student.enrollments.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      href={`/panel/yonetim/gruplar/${enrollment.group.id}`}
                      className="rounded-[10px] border border-dc-line p-3 transition-colors hover:border-dc-brand"
                    >
                      <p className="text-[13.5px] font-bold text-dc-ink">
                        {enrollment.group.name} · {enrollment.group.subject}
                      </p>
                      <p className="mt-1 text-[12.5px] text-dc-ink-muted">
                        {enrollment.group.teacher.fullName || enrollment.group.teacher.email}
                      </p>
                    </Link>
                  ))}
                  {!student.enrollments.length ? (
                    <p className="text-[13px] text-dc-ink-muted">Aktif grup yok.</p>
                  ) : null}
                </div>
              </PanelCard>

              <PanelCard>
                <PanelCardTitle>Veli bağlantıları</PanelCardTitle>
                <div className="mt-3.5 flex flex-col gap-2">
                  {student.parents.map((link) => (
                    <Link
                      key={link.id}
                      href={`/panel/yonetim/kullanicilar/${link.parent.id}`}
                      className="rounded-[10px] border border-dc-line p-3 transition-colors hover:border-dc-brand"
                    >
                      <p className="text-[13.5px] font-bold text-dc-ink">
                        {link.parent.fullName || link.parent.email}
                      </p>
                      <p className="mt-1 text-[12.5px] text-dc-ink-muted">
                        {link.relationship || "Veli"}
                      </p>
                    </Link>
                  ))}
                  {!student.parents.length ? (
                    <p className="text-[13px] text-dc-ink-muted">Veli bağlantısı yok.</p>
                  ) : null}
                </div>
              </PanelCard>
            </div>

            <PanelCard className="mt-5">
              <PanelCardTitle>Son öğretmen notları</PanelCardTitle>
              <div className="mt-3.5 grid gap-2 md:grid-cols-2">
                {student.notes.map((note) => (
                  <article key={note.id} className="rounded-[10px] border border-dc-line p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[.06em] text-dc-brand-strong">
                      {note.lesson.group.subject} · {DATE.format(note.updatedAt)}
                    </p>
                    <p className="mt-2 text-[13px] leading-[1.6] text-dc-ink-body">
                      {note.note || note.nextGoal || note.homework || "Not içeriği yok"}
                    </p>
                  </article>
                ))}
                {!student.notes.length ? (
                  <p className="text-[13px] text-dc-ink-muted">Henüz bireysel not yok.</p>
                ) : null}
              </div>
            </PanelCard>
          </>
        ) : null}

        {user.role === "TEACHER" ? (
          <div className="mt-5 space-y-5">
            {teacherLifecycle ? (
              <PanelCard>
                <PanelCardTitle>Öğretmen yaşam döngüsü</PanelCardTitle>
                <dl className="mt-3 grid gap-2 text-[13px] md:grid-cols-2">
                  <Row label="Ders alanları" value={teacherLifecycle.teacher.subjects.join(", ") || "Tanımlı değil"} />
                  <Row
                    label="Koç capability"
                    value={
                      teacherLifecycle.teacher.isCoach
                        ? `Evet${teacherLifecycle.teacher.coachCapacity ? ` · kapasite ${teacherLifecycle.teacher.coachCapacity}` : ""}`
                        : "Hayır"
                    }
                  />
                  <Row label="Aktif grup" value={`${teacherLifecycle.counts.activeGroups}`} />
                  <Row label="Aktif öğrenci" value={`${teacherLifecycle.counts.activeStudents}`} />
                  <Row label="Gelecek ders" value={`${teacherLifecycle.counts.upcomingLessons}`} />
                  <Row label="Bekleyen ders kapanışı" value={`${teacherLifecycle.counts.pendingLessonClosures}`} />
                  <Row
                    label="Açık yardım talebi"
                    value={`${teacherLifecycle.activeResponsibilities.openHelpRequests}`}
                  />
                  <Row
                    label="Açık müdahale/koç sorumluluğu"
                    value={`${teacherLifecycle.activeResponsibilities.openInterventions + teacherLifecycle.activeResponsibilities.coachAssignments}`}
                  />
                </dl>
                <div className="mt-4 border-t border-dc-line pt-4">
                  <p className="mb-2 text-[12.5px] font-semibold text-dc-ink-faint">Güvenli offboarding</p>
                  <TeacherOffboardingForm teacherId={user.id} />
                </div>
              </PanelCard>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2">
              <PanelCard>
                <PanelCardTitle>Sorumlu gruplar</PanelCardTitle>
                <div className="mt-3.5 flex flex-col gap-2">
                  {user.taughtGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/panel/yonetim/gruplar/${group.id}`}
                      className="flex items-center justify-between rounded-[10px] border border-dc-line p-3 transition-colors hover:border-dc-brand"
                    >
                      <span>
                        <span className="block text-[13.5px] font-bold text-dc-ink">{group.name}</span>
                        <span className="mt-1 block text-[12.5px] text-dc-ink-muted">
                          {group.subject}
                        </span>
                      </span>
                      <span className="text-[13px] font-bold text-dc-brand">
                        {group.enrollments.length}/{group.capacity}
                      </span>
                    </Link>
                  ))}
                  {!user.taughtGroups.length ? (
                    <p className="text-[13px] text-dc-ink-muted">Sorumlu grup yok.</p>
                  ) : null}
                </div>
              </PanelCard>

              <PanelCard>
                <PanelCardTitle>Son dersler</PanelCardTitle>
                <div className="mt-3.5 flex flex-col gap-2">
                  {user.taughtLessons.map((lesson) => (
                    <div key={lesson.id} className="rounded-[10px] border border-dc-line p-3">
                      <p className="text-[13.5px] font-bold text-dc-ink">{lesson.title}</p>
                      <p className="mt-1 text-[12.5px] text-dc-ink-muted">
                        {lesson.group.name} · {DATE.format(lesson.startsAt)}
                      </p>
                    </div>
                  ))}
                  {!user.taughtLessons.length ? (
                    <p className="text-[13px] text-dc-ink-muted">Kayıtlı ders yok.</p>
                  ) : null}
                </div>
              </PanelCard>
            </div>
          </div>
        ) : null}

        {user.role === "PARENT" ? (
          <PanelCard className="mt-5">
            <PanelCardTitle>Bağlı öğrenciler</PanelCardTitle>
            <div className="mt-3.5 grid gap-2 md:grid-cols-2">
              {user.parentStudents.map((link) => (
                <Link
                  key={link.id}
                  href={`/panel/yonetim/kullanicilar/${link.student.user.id}`}
                  className="rounded-[10px] border border-dc-line p-4 transition-colors hover:border-dc-brand"
                >
                  <span className="block text-[13.5px] font-bold text-dc-ink">
                    {link.student.user.fullName || link.student.user.email}
                  </span>
                  <span className="mt-1 block text-[12.5px] text-dc-ink-muted">
                    {link.relationship || "Veli"}
                  </span>
                </Link>
              ))}
              {!user.parentStudents.length ? (
                <p className="text-[13px] text-dc-ink-muted">Bağlı öğrenci yok.</p>
              ) : null}
            </div>
          </PanelCard>
        ) : null}
      </div>
    </PanelShell>
  );
}
