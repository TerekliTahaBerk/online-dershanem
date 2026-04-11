import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import { LogoutButton } from "@/components/auth/logout-button";
import { getServerAuthSession } from "@/lib/auth";
import {
  buildWhatsAppLink,
  formatDateTime,
  intakeStatusLabels,
  intakeStatusOptions,
  purchaseStatusLabels,
  purchaseStatusOptions,
  studentStatusLabels,
  studentStatusOptions
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { updateLeadAction, updatePurchaseAction, updateStudentAction } from "@/app/admin/actions";

type AdminPageProps = {
  searchParams?: Promise<{
    q?: string;
    updated?: string;
    section?: string;
  }>;
};

function buildReturnTo(query: string, section: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("section", section);
  return `/admin?${params.toString()}`;
}

function buildStudentWhere(query: string): Prisma.StudentWhereInput | undefined {
  if (!query) return undefined;

  return {
    OR: [
      { fullName: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { schoolName: { contains: query, mode: "insensitive" } },
      { examType: { contains: query, mode: "insensitive" } },
      { activePackage: { contains: query, mode: "insensitive" } }
    ]
  };
}

function buildLeadWhere(query: string): Prisma.LeadSubmissionWhereInput | undefined {
  if (!query) return undefined;

  return {
    OR: [
      { fullName: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { classLevel: { contains: query, mode: "insensitive" } },
      { examType: { contains: query, mode: "insensitive" } },
      { source: { contains: query, mode: "insensitive" } }
    ]
  };
}

function buildPurchaseWhere(query: string): Prisma.PurchaseIntentWhereInput | undefined {
  if (!query) return undefined;

  return {
    OR: [
      { studentFullName: { contains: query, mode: "insensitive" } },
      { studentPhone: { contains: query, mode: "insensitive" } },
      { studentEmail: { contains: query, mode: "insensitive" } },
      { schoolName: { contains: query, mode: "insensitive" } },
      { packageName: { contains: query, mode: "insensitive" } },
      { source: { contains: query, mode: "insensitive" } }
    ]
  };
}

function getFlashMessage(updated?: string) {
  switch (updated) {
    case "student":
      return "Öğrenci kaydı güncellendi.";
    case "lead":
      return "Lead form kaydı güncellendi.";
    case "purchase":
      return "Detaylı form kaydı güncellendi.";
    case "student-error":
    case "lead-error":
    case "purchase-error":
      return "Güncelleme sırasında bir doğrulama hatası oluştu.";
    default:
      return null;
  }
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </article>
  );
}

function Badge({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: "default" | "brand" | "success" | "warn";
}) {
  const toneClasses =
    tone === "brand"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "success"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${toneClasses}`}>{children}</span>;
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function ContactLinks({
  phone,
  email
}: {
  phone: string;
  email?: string | null;
}) {
  const whatsappLink = buildWhatsAppLink(phone);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`tel:${phone}`}
        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Ara
      </a>
      {whatsappLink ? (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
        >
          WhatsApp
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          E-posta
        </a>
      ) : null}
    </div>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getServerAuthSession();
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const flashMessage = getFlashMessage(params?.updated);

  if (session?.user?.role !== "ADMIN") {
    redirect("/giris?callbackUrl=/admin");
  }

  const [leadCount, purchaseCount, studentCount, newLeadCount, newPurchaseCount, activeStudentCount, students, latestLeads, latestPurchases] =
    await Promise.all([
    prisma.leadSubmission.count(),
    prisma.purchaseIntent.count(),
      prisma.student.count(),
      prisma.leadSubmission.count({
        where: { intakeStatus: "NEW" }
      }),
      prisma.purchaseIntent.count({
        where: { intakeStatus: "NEW" }
      }),
      prisma.student.count({
        where: {
          status: {
            in: ["FOLLOW_UP", "ACTIVE", "AT_RISK"]
          }
        }
      }),
      prisma.student.findMany({
        where: buildStudentWhere(query),
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 40
      }),
      prisma.leadSubmission.findMany({
        where: buildLeadWhere(query),
        orderBy: { submittedAt: "desc" },
        take: 25
      }),
      prisma.purchaseIntent.findMany({
        where: buildPurchaseWhere(query),
        orderBy: { submittedAt: "desc" },
        take: 25
      })
    ]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Online Dershanem Admin</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Öğrenci takibi ve form operasyonu tek panelde
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Site formları artık operasyon tarafında veritabanı üzerinden izleniyor. Google Sheet’e dönmeden öğrencileri, paketleri,
                takip notlarını ve her formun işlem durumunu buradan yönetebilirsiniz.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Aktif kullanıcı</p>
              <p className="text-sm text-slate-950">{session.user.email}</p>
              <LogoutButton className="justify-center rounded-md border-slate-300 bg-white px-3 py-2 text-slate-800" />
            </div>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="text-sm font-medium text-slate-800">
              Panel içinde ara
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Öğrenci, telefon, e-posta, okul, paket..."
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <input type="hidden" name="section" value={params?.section || "students"} />
            <button
              type="submit"
              className="self-end rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Filtrele
            </button>
            <Link
              href="/admin"
              className="self-end rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Filtreyi Temizle
            </Link>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="#students" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              Öğrenciler
            </Link>
            <Link href="#forms" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              Form Kayıtları
            </Link>
            <Link href="#purchase-forms" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              Detaylı Formlar
            </Link>
          </div>

          {flashMessage ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              {flashMessage}
            </div>
          ) : null}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Öğrenci Havuzu" value={studentCount} detail={`${activeStudentCount} öğrenci aktif takipte`} />
          <MetricCard label="Lead Formları" value={leadCount} detail={`${newLeadCount} kayıt ilk temas bekliyor`} />
          <MetricCard label="Detaylı Formlar" value={purchaseCount} detail={`${newPurchaseCount} kayıt işlem bekliyor`} />
          <MetricCard
            label="Operasyon Durumu"
            value={newLeadCount + newPurchaseCount}
            detail="Yeni gelen kayıtlar aynı panelden öğrenciye bağlanır ve güncellenir"
          />
        </section>

        <section id="students" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Öğrenciler</h2>
              <p className="mt-1 text-sm text-slate-600">
                Paket, operasyon durumu ve iç notlar burada tutulur. Yeni form gelince ilgili öğrenci kartına bağlanır.
              </p>
            </div>
            <Badge tone="brand">{students.length} kayıt listeleniyor</Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {students.map((student) => {
              const returnTo = buildReturnTo(query, "students");

              return (
                <article key={student.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-950">{student.fullName}</h3>
                        <Badge tone="brand">{studentStatusLabels[student.status]}</Badge>
                        {student.activePackage ? <Badge tone="success">{student.activePackage}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {student.classLevel || "Sınıf yok"} {student.examType ? `• ${student.examType}` : ""}
                        {student.schoolName ? ` • ${student.schoolName}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Son güncelleme: {formatDateTime(student.updatedAt)}</p>
                    </div>
                    <ContactLinks phone={student.phone} email={student.email} />
                  </div>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Telefon" value={student.phone} />
                    <DetailItem label="E-posta" value={student.email} />
                    <DetailItem label="Şehir / İlçe" value={[student.city, student.district].filter(Boolean).join(" / ")} />
                    <DetailItem label="Kaynak" value={student.source} />
                    <DetailItem label="Mevcut Seviye" value={student.currentLevel} />
                    <DetailItem label="Son Net / Puan" value={student.currentNet} />
                    <DetailItem label="Hedef" value={student.targetGoal || student.targetRanking} />
                    <DetailItem label="Hedef Okul / Bölüm" value={student.targetSchool} />
                    <DetailItem label="Güçlü Dersler" value={student.strongLessons} />
                    <DetailItem label="Zayıf Dersler" value={student.weakLessons} />
                    <DetailItem label="Çalışma Temposu" value={student.studyStatus} />
                    <DetailItem label="Haftalık Çalışma" value={student.weeklyStudyHours} />
                    <DetailItem label="Veli" value={student.parentFullName} />
                    <DetailItem label="Veli Telefon" value={student.parentPhone} />
                  </dl>

                  <form action={updateStudentAction} className="mt-5 grid gap-3 border-t border-slate-200 pt-4">
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-medium text-slate-800">
                        Öğrenci Durumu
                        <select
                          name="status"
                          defaultValue={student.status}
                          className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        >
                          {studentStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {studentStatusLabels[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-800">
                        Aktif Paket
                        <input
                          name="activePackage"
                          defaultValue={student.activePackage ?? ""}
                          className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          placeholder="Örn: TYT Matematik Premium"
                        />
                      </label>
                    </div>
                    <label className="text-sm font-medium text-slate-800">
                      İç Notlar
                      <textarea
                        name="notes"
                        defaultValue={student.notes ?? ""}
                        className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Veliyi aradık, deneme neti takip edilecek, paket önerisi yapılacak..."
                      />
                    </label>
                    <button
                      type="submit"
                      className="justify-self-start rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Öğrenci Kaydını Güncelle
                    </button>
                  </form>
                </article>
              );
            })}
          </div>

          {students.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Arama kriterine uyan öğrenci bulunamadı.
            </div>
          ) : null}
        </section>

        <section id="forms" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Lead Formları</h2>
              <p className="mt-1 text-sm text-slate-600">Kısa formlar için ilk temas, arama ve arşiv sürecini buradan yönetebilirsiniz.</p>
            </div>
            <Badge>{latestLeads.length} kayıt listeleniyor</Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {latestLeads.map((lead) => {
              const returnTo = buildReturnTo(query, "forms");

              return (
                <article key={lead.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">{lead.fullName}</h3>
                        <Badge tone="warn">{intakeStatusLabels[lead.intakeStatus]}</Badge>
                        {lead.studentId ? <Badge tone="success">Öğrenci kartına bağlı</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {lead.classLevel} • {lead.examType} • {lead.source}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(lead.submittedAt)}</p>
                    </div>
                    <ContactLinks phone={lead.phone} />
                  </div>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Telefon" value={lead.phone} />
                    <DetailItem label="Veli Telefon" value={lead.parentPhone} />
                    <DetailItem label="Hedef" value={lead.targetGoal} />
                    <DetailItem label="Son Net" value={lead.currentNet} />
                  </dl>

                  <form action={updateLeadAction} className="mt-5 grid gap-3 border-t border-slate-200 pt-4">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <label className="text-sm font-medium text-slate-800">
                      Lead Durumu
                      <select
                        name="intakeStatus"
                        defaultValue={lead.intakeStatus}
                        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        {intakeStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {intakeStatusLabels[option]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-800">
                      Operasyon Notu
                      <textarea
                        name="adminNotes"
                        defaultValue={lead.adminNotes ?? ""}
                        className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="İlk arama yapıldı, tekrar aranacak, veli geri dönüş bekliyor..."
                      />
                    </label>
                    <button
                      type="submit"
                      className="justify-self-start rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Lead Kaydını Güncelle
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>

        <section id="purchase-forms" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Detaylı Formlar ve Paket Talepleri</h2>
              <p className="mt-1 text-sm text-slate-600">
                Uzun formdan gelen başvurular öğrenci tarafında en zengin veriyi taşıyor. Paket, ödeme ve takip durumunu birlikte görün.
              </p>
            </div>
            <Badge tone="brand">{latestPurchases.length} kayıt listeleniyor</Badge>
          </div>

          <div className="grid gap-4">
            {latestPurchases.map((purchase) => {
              const returnTo = buildReturnTo(query, "purchase-forms");

              return (
                <article key={purchase.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-950">{purchase.studentFullName}</h3>
                        <Badge tone="warn">{intakeStatusLabels[purchase.intakeStatus]}</Badge>
                        <Badge tone="brand">{purchaseStatusLabels[purchase.status]}</Badge>
                        {purchase.studentId ? <Badge tone="success">Öğrenci kartına bağlı</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {purchase.packageName} • {purchase.classLevel} • {purchase.examType} • {purchase.source}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(purchase.submittedAt)}</p>
                    </div>
                    <ContactLinks phone={purchase.studentPhone} email={purchase.studentEmail} />
                  </div>

                  <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <DetailItem label="Telefon" value={purchase.studentPhone} />
                    <DetailItem label="E-posta" value={purchase.studentEmail} />
                    <DetailItem label="Şehir / İlçe" value={`${purchase.city} / ${purchase.district}`} />
                    <DetailItem label="Okul" value={purchase.schoolName} />
                    <DetailItem label="Sınıf / Bölüm" value={[purchase.classLevel, purchase.department].filter(Boolean).join(" • ")} />
                    <DetailItem label="Hedef Okul / Bölüm" value={purchase.targetSchool} />
                    <DetailItem label="Hedef Başarı" value={purchase.targetRanking} />
                    <DetailItem label="Seviye Durumu" value={purchase.currentLevel} />
                    <DetailItem label="Son Net / Puan" value={purchase.currentNet} />
                    <DetailItem label="Güçlü Dersler" value={purchase.strongLessons} />
                    <DetailItem label="Zayıf Dersler" value={purchase.weakLessons} />
                    <DetailItem label="İhtiyaç" value={purchase.needType} />
                    <DetailItem label="Çalışma Durumu" value={purchase.studyStatus} />
                    <DetailItem label="Haftalık Çalışma" value={purchase.weeklyStudyHours} />
                    <DetailItem label="Veli" value={purchase.parentFullName} />
                    <DetailItem label="Veli Telefon" value={purchase.parentPhone} />
                    <DetailItem label="Veli E-posta" value={purchase.parentEmail} />
                    <DetailItem label="Form Notu" value={purchase.notes} />
                    <DetailItem label="Ödeme Linki" value={purchase.paymentLink} />
                  </dl>

                  <form action={updatePurchaseAction} className="mt-5 grid gap-3 border-t border-slate-200 pt-4">
                    <input type="hidden" name="purchaseId" value={purchase.id} />
                    <input type="hidden" name="linkedStudentId" value={purchase.studentId ?? ""} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="text-sm font-medium text-slate-800">
                        Form Durumu
                        <select
                          name="intakeStatus"
                          defaultValue={purchase.intakeStatus}
                          className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        >
                          {intakeStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {intakeStatusLabels[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-800">
                        Ödeme Durumu
                        <select
                          name="status"
                          defaultValue={purchase.status}
                          className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        >
                          {purchaseStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {purchaseStatusLabels[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-800">
                        Paket
                        <input
                          name="packageName"
                          defaultValue={purchase.packageName}
                          className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </label>
                    </div>
                    <label className="text-sm font-medium text-slate-800">
                      Operasyon Notu
                      <textarea
                        name="adminNotes"
                        defaultValue={purchase.adminNotes ?? ""}
                        className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Bu öğrenci için önerilen paket, ödeme konuşması, veli görüşmesi notu..."
                      />
                    </label>
                    <button
                      type="submit"
                      className="justify-self-start rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Form Kaydını Güncelle
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
