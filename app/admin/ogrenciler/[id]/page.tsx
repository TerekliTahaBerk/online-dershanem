import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildWhatsAppLink,
  formatDateTime,
  formatDateTimeLocalInput,
  studentStatusLabels,
  studentStatusOptions,
  lessonStatusLabels,
  intakeStatusLabels,
  purchaseStatusLabels
} from "@/lib/admin";
import { updateStudentAction } from "@/app/admin/actions";
import { createStudentAccountAction } from "@/app/admin/ogrenciler/actions";
import {
  User, Phone, Mail, MapPin, School, BookOpen, Target, CalendarDays,
  ExternalLink, ChevronLeft, Plus, MessageCircle, KeyRound, CheckCircle
} from "lucide-react";

type StudentFull = Prisma.StudentGetPayload<{
  include: {
    user: { select: { email: true } };
    lessons: {
      include: {
        teacher: { select: { id: true; fullName: true } };
        package: { select: { name: true } };
      };
    };
    purchaseIntents: { include: { events: { take: 2 } } };
    leadSubmissions: true;
  };
}>;

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string; tab?: string }>;
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-600",
  FOLLOW_UP: "bg-yellow-50 text-yellow-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  AT_RISK: "bg-red-50 text-red-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  INACTIVE: "bg-gray-100 text-gray-400"
};

const LESSON_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-400"
};

export default async function OgrenciDetayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const updated = sp?.updated ?? "";
  const activeTab = sp?.tab ?? "dersler";

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      lessons: {
        include: {
          teacher: { select: { id: true, fullName: true } },
          package: { select: { name: true } }
        },
        orderBy: { scheduledAt: "desc" }
      },
      purchaseIntents: {
        include: { events: { orderBy: { createdAt: "desc" }, take: 2 } },
        orderBy: { submittedAt: "desc" }
      },
      leadSubmissions: { orderBy: { submittedAt: "desc" } }
    }
  }) as unknown as StudentFull | null;

  if (!student) notFound();

  const waLink = buildWhatsAppLink(student.phone);
  const completedLessons = student.lessons.filter((l) => l.status === "COMPLETED").length;
  const scheduledLessons = student.lessons.filter((l) => l.status === "SCHEDULED").length;
  const paidPurchases = student.purchaseIntents.filter((p) => p.status === "PAID").length;

  const returnTo = `/admin/ogrenciler/${id}`;

  const tabs = [
    { id: "dersler", label: "Dersler", count: student.lessons.length },
    { id: "odemeler", label: "Ödemeler", count: student.purchaseIntents.length },
    { id: "formlar", label: "Formlar", count: student.leadSubmissions.length },
    { id: "profil", label: "Profil & Düzenle", count: null }
  ];

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      {/* Back */}
      <Link href="/admin/ogrenciler" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={14} /> Öğrencilere Dön
      </Link>

      {/* Flash */}
      {updated === "student" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Öğrenci güncellendi.
        </div>
      )}
      {updated === "account-created" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Öğrenci hesabı oluşturuldu. Artık panele giriş yapabilir.
        </div>
      )}
      {updated === "account-exists" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-lg">
          Bu öğrencinin zaten bir hesabı var.
        </div>
      )}
      {updated === "email-taken" && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg">
          Bu e-posta adresi başka bir hesap tarafından kullanılıyor.
        </div>
      )}
      {updated === "account-error" && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg">
          Hesap oluşturulurken hata oluştu. Tüm alanları doldurun (min. 6 karakter şifre).
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#B0E4CC]/40 flex items-center justify-center text-[#285A48] font-bold text-2xl shrink-0">
            {student.fullName.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#091413]">{student.fullName}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[student.status]}`}>
                    {studentStatusLabels[student.status]}
                  </span>
                  {student.examType && (
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{student.examType}</span>
                  )}
                  {student.classLevel && (
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{student.classLevel}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                  >
                    <MessageCircle size={13} />
                    WhatsApp
                  </a>
                )}
                <Link
                  href={`/admin/dersler/yeni?studentId=${student.id}`}
                  className="flex items-center gap-1.5 bg-[#408A71] hover:bg-[#285A48] text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus size={13} />
                  Ders Ekle
                </Link>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: "Toplam Ders", value: student.lessons.length, color: "text-[#091413]" },
                { label: "Tamamlanan", value: completedLessons, color: "text-emerald-600" },
                { label: "Planlanan", value: scheduledLessons, color: "text-blue-600" },
                { label: "Ödeme", value: paidPurchases, color: "text-violet-600" }
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Phone size={13} className="text-gray-400" />
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[#408A71] hover:underline">
                {student.phone}
              </a>
            ) : student.phone}
          </span>
          {student.email && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Mail size={13} className="text-gray-400" />
              {student.email}
            </span>
          )}
          {(student.city || student.district) && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin size={13} className="text-gray-400" />
              {[student.district, student.city].filter(Boolean).join(", ")}
            </span>
          )}
          {student.schoolName && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <School size={13} className="text-gray-400" />
              {student.schoolName}
            </span>
          )}
          {student.activePackage && (
            <span className="flex items-center gap-1.5 text-sm text-[#408A71]">
              <BookOpen size={13} />
              {student.activePackage}
            </span>
          )}
        </div>

        {/* Task info */}
        {(student.taskLabel || student.nextActionAt) && (
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            student.nextActionAt && new Date(student.nextActionAt) < new Date()
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}>
            <Target size={13} />
            {student.taskLabel && <span className="font-medium">{student.taskLabel}</span>}
            {student.nextActionAt && (
              <span className="text-xs">{formatDateTime(student.nextActionAt)}</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/ogrenciler/${id}?tab=${tab.id}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[#091413] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                activeTab === tab.id ? "bg-[#B0E4CC]/40 text-[#285A48]" : "bg-gray-200 text-gray-500"
              }`}>
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dersler" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#091413]">Ders Geçmişi</h2>
            <Link
              href={`/admin/dersler/yeni?studentId=${student.id}`}
              className="flex items-center gap-1.5 text-xs text-[#408A71] hover:text-[#285A48] font-medium border border-[#408A71]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors"
            >
              <Plus size={11} /> Ders Ekle
            </Link>
          </div>
          {student.lessons.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Henüz ders planlanmamış.
              <Link href={`/admin/dersler/yeni?studentId=${student.id}`} className="block mt-2 text-[#408A71] hover:underline">
                İlk dersi ekle →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {student.lessons.map((lesson) => (
                <div key={lesson.id} className={`flex items-center justify-between px-5 py-3.5 ${lesson.status === "CANCELLED" ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-center shrink-0 w-14">
                      <p className="text-xs font-semibold text-gray-700">
                        {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(lesson.scheduledAt))}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(lesson.scheduledAt))}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700">{lesson.teacher.fullName}</p>
                      <p className="text-xs text-gray-400">{lesson.package?.name ?? "Paketsiz"} · {lesson.duration} dk</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {lesson.googleMeetLink && lesson.status === "SCHEDULED" && (
                      <a
                        href={lesson.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Meet <ExternalLink size={10} />
                      </a>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LESSON_STATUS_COLORS[lesson.status]}`}>
                      {lessonStatusLabels[lesson.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "odemeler" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#091413]">Ödeme Geçmişi</h2>
          </div>
          {student.purchaseIntents.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Kayıtlı ödeme yok.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {student.purchaseIntents.map((purchase) => (
                <div key={purchase.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{purchase.packageName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(purchase.submittedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        purchase.status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        purchase.status === "FAILED" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {purchaseStatusLabels[purchase.status]}
                      </span>
                      {purchase.paymentLink && (
                        <a href={purchase.paymentLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                          Ödeme <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                  {purchase.events.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {purchase.events.map((event) => (
                        <p key={event.id} className="text-xs text-gray-400">
                          {formatDateTime(event.createdAt)} — {event.eventType.replace(/_/g, " ")}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "formlar" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#091413]">Form Başvuruları</h2>
          </div>
          {student.leadSubmissions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Eşleştirilmiş form başvurusu yok.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {student.leadSubmissions.map((lead) => (
                <div key={lead.id} className="px-5 py-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{lead.examType} — {lead.classLevel}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Kaynak: {lead.source} · {formatDateTime(lead.submittedAt)}</p>
                    {lead.targetGoal && <p className="text-xs text-gray-500 mt-1">Hedef: {lead.targetGoal}</p>}
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    lead.intakeStatus === "ENROLLED" ? "bg-emerald-50 text-emerald-700" :
                    lead.intakeStatus === "ARCHIVED" ? "bg-gray-100 text-gray-400" :
                    "bg-blue-50 text-blue-700"
                  }`}>
                    {intakeStatusLabels[lead.intakeStatus]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "profil" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Student info display */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-[#091413]">Öğrenci Bilgileri</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                { label: "Tam Ad", value: student.fullName },
                { label: "Telefon", value: student.phone },
                { label: "E-posta", value: student.email },
                { label: "Şehir", value: student.city },
                { label: "İlçe", value: student.district },
                { label: "Okul", value: student.schoolName },
                { label: "Sınıf", value: student.classLevel },
                { label: "Bölüm", value: student.department },
                { label: "Sınav Türü", value: student.examType },
                { label: "Mevcut Net", value: student.currentNet },
                { label: "Hedef", value: student.targetGoal },
                { label: "Hedef Okul", value: student.targetSchool },
                { label: "Hedef Sıralama", value: student.targetRanking },
                { label: "Zayıf Dersler", value: student.weakLessons },
                { label: "Güçlü Dersler", value: student.strongLessons },
                { label: "Veli Ad", value: student.parentFullName },
                { label: "Veli Tel", value: student.parentPhone },
                { label: "Kaynak", value: student.source },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs text-gray-400">{label}</dt>
                    <dd className="text-gray-700 font-medium mt-0.5">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
            {student.notes && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Notlar</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.notes}</p>
              </div>
            )}
          </div>

          {/* Portal access card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={16} className="text-[#408A71]" />
              <h2 className="font-semibold text-[#091413]">Panel Erişimi</h2>
            </div>
            {student.userId ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Hesap mevcut</p>
                  {student.user?.email && (
                    <p className="text-xs text-emerald-700 mt-0.5">{student.user.email} adresiyle giriş yapabilir.</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Bu öğrenci için bir panel hesabı oluşturun. Öğrenci e-posta ve şifresini kullanarak{" "}
                  <strong>/panel</strong> adresinden giriş yapabilir.
                </p>
                <form action={createStudentAccountAction} className="grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="studentId" value={student.id} />
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">E-posta</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={student.email ?? ""}
                      placeholder="ogrenci@email.com"
                      required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Şifre (min. 6 karakter)</label>
                    <input
                      type="text"
                      name="password"
                      placeholder="••••••••"
                      minLength={6}
                      required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      Hesap Oluştur
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Edit form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-[#091413] mb-4">Hızlı Güncelleme</h2>
            <form action={updateStudentAction} className="space-y-4">
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="returnTo" value={`${returnTo}?tab=profil`} />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Durum</label>
                <select name="status" defaultValue={student.status}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]">
                  {studentStatusOptions.map((s) => (
                    <option key={s} value={s}>{studentStatusLabels[s]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Aktif Paket</label>
                <input type="text" name="activePackage" defaultValue={student.activePackage ?? ""}
                  placeholder="Paket adı..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Görev Etiketi</label>
                <input type="text" name="taskLabel" defaultValue={student.taskLabel ?? ""}
                  placeholder="Görev açıklaması..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Sonraki Eylem</label>
                <input type="datetime-local" name="nextActionAt" defaultValue={formatDateTimeLocalInput(student.nextActionAt)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Notlar</label>
                <textarea name="notes" defaultValue={student.notes ?? ""} rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71] resize-none" />
              </div>

              <button type="submit"
                className="w-full bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
