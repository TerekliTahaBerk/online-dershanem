import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
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
import { updateStudentAction, updateStudentInfoAction } from "@/app/admin/actions";
import { createStudentAccountAction, deleteStudentAction, assignPackageToStudentAction, removePackageFromStudentAction, extendPackageAction, revokePackageFromStudentAction } from "@/app/admin/ogrenciler/actions";
import {
  User, Phone, Mail, MapPin, School, BookOpen, Target, CalendarDays,
  ExternalLink, ChevronLeft, Plus, MessageCircle, KeyRound, CheckCircle, Package, X
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
    packages: {
      include: {
        package: true;
        assignedBy: { select: { name: true } };
      };
      orderBy: { assignedAt: "desc" };
    };
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

  const [student, allPackages] = await Promise.all([
    prisma.student.findUnique({
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
        leadSubmissions: { orderBy: { submittedAt: "desc" } },
        packages: {
          include: {
            package: true,
            assignedBy: { select: { name: true } },
          },
          orderBy: { assignedAt: "desc" },
        }
      }
    }),
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, subjects: true }
    })
  ]);

  if (!student) notFound();

  const assignedPackageIds = new Set((student as unknown as StudentFull).packages.map((sp) => sp.package.id));

  const waLink = buildWhatsAppLink(student.phone);
  const completedLessons = student.lessons.filter((l) => l.status === "COMPLETED").length;
  const scheduledLessons = student.lessons.filter((l) => l.status === "SCHEDULED").length;
  const paidPurchases = student.purchaseIntents.filter((p) => p.status === "PAID").length;

  const returnTo = `/admin/ogrenciler/${id}`;

  const tabs = [
    { id: "dersler", label: "Dersler", count: student.lessons.length },
    { id: "odemeler", label: "Ödemeler", count: student.purchaseIntents.length },
    { id: "formlar", label: "Formlar", count: student.leadSubmissions.length },
    { id: "paketler", label: "Paketler", count: (student as unknown as StudentFull).packages.length },
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
      {updated === "account-linked" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Mevcut kullanıcı öğrenci kaydına bağlandı. Aynı hesapla giriş yapabilir.
        </div>
      )}
      {updated === "created-linked" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Öğrenci oluşturuldu ve mevcut kullanıcıyla eşleştirildi.
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
      {updated === "phone-taken" && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg">
          Bu telefon numarası başka bir öğrenciye ait.
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#DCCCAC]/40 flex items-center justify-center text-[#435633] font-bold text-2xl shrink-0">
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
                  className="flex items-center gap-1.5 bg-[#546B41] hover:bg-[#435633] text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
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
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[#546B41] hover:underline">
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
            <span className="flex items-center gap-1.5 text-sm text-[#546B41]">
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
                activeTab === tab.id ? "bg-[#DCCCAC]/40 text-[#435633]" : "bg-gray-200 text-gray-500"
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
              className="flex items-center gap-1.5 text-xs text-[#546B41] hover:text-[#435633] font-medium border border-[#546B41]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#DCCCAC]/20 transition-colors"
            >
              <Plus size={11} /> Ders Ekle
            </Link>
          </div>
          {student.lessons.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Henüz ders planlanmamış.
              <Link href={`/admin/dersler/yeni?studentId=${student.id}`} className="block mt-2 text-[#546B41] hover:underline">
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

      {activeTab === "paketler" && (
        <div className="space-y-5">
          {/* Assign new package */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-[#546B41]" />
              <h2 className="font-semibold text-[#091413]">Paket Ata</h2>
            </div>
            <form action={assignPackageToStudentAction}>
              <input type="hidden" name="studentId" value={student.id} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Paket Seçin</label>
                  <select
                    name="packageId"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                  >
                    {["COURSE", "EXAM"].map((typeGroup) => {
                      const group = allPackages.filter((p) => (p as unknown as { type: string }).type === typeGroup);
                      if (group.length === 0) return null;
                      return (
                        <optgroup key={typeGroup} label={typeGroup === "COURSE" ? "📚 Ders Paketleri" : "📝 Deneme Paketleri"}>
                          {group.map((p) => {
                            const alreadyAssigned = assignedPackageIds.has(p.id);
                            return (
                              <option key={p.id} value={p.id}>
                                {alreadyAssigned ? "↺ " : ""}{p.name}{p.subjects ? ` · ${p.subjects}` : ""}{alreadyAssigned ? " (zaten atanmış)" : ""}
                              </option>
                            );
                          })}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    Bitiş Tarihi <span className="text-gray-400 font-normal">(boş = süresiz)</span>
                  </label>
                  <input
                    type="date"
                    name="expiresAt"
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                  />
                  {/* Quick preset links */}
                  <div className="flex gap-2 mt-1">
                    {[
                      { label: "30g", days: 30 },
                      { label: "90g", days: 90 },
                      { label: "1yıl", days: 365 },
                    ].map(({ label, days }) => {
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      return (
                        <span key={label} className="text-[10px] text-[#546B41] bg-[#546B41]/10 rounded px-1.5 py-0.5 select-all cursor-pointer" title={`${label} için tarih kopyala`}>
                          {label}: {d.toISOString().slice(0, 10)}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Not</label>
                    <input
                      type="text"
                      name="notes"
                      placeholder="İsteğe bağlı not"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Plus size={14} /> Ata
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Assigned packages list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-[#091413]">Tanımlı Paketler</h2>
              <span className="text-xs text-gray-400">{(student as unknown as StudentFull).packages.length} paket</span>
            </div>
            {(student as unknown as StudentFull).packages.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Bu öğrenciye henüz paket atanmamış.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(student as unknown as StudentFull).packages.map((sp) => {
                  const now = new Date();
                  const isRevoked = !!(sp as unknown as { revokedAt: Date | null }).revokedAt;
                  const expiresAt = (sp as unknown as { expiresAt: Date | null }).expiresAt;
                  const isExpired = !isRevoked && expiresAt ? expiresAt < now : false;
                  const isActive = !isRevoked && !isExpired;
                  const daysLeft = expiresAt && isActive
                    ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000)
                    : null;

                  return (
                    <div key={sp.package.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-[#DCCCAC]/30" : "bg-gray-100"}`}>
                            <Package size={14} className={isActive ? "text-[#546B41]" : "text-gray-400"} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800">{sp.package.name}</p>
                              {/* Package type badge */}
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                (sp.package as unknown as { type: string }).type === "EXAM"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-[#DCCCAC]/40 text-[#435633]"
                              }`}>
                                {(sp.package as unknown as { type: string }).type === "EXAM" ? "📝 Deneme" : "📚 Ders"}
                              </span>
                              {isRevoked && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">İptal</span>
                              )}
                              {isExpired && !isRevoked && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Süresi Doldu</span>
                              )}
                              {isActive && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Aktif</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {sp.package.subjects}
                              {expiresAt && (
                                <> · <span className={daysLeft !== null && daysLeft <= 7 ? "text-red-600 font-medium" : ""}>
                                  {isExpired
                                    ? `${expiresAt.toLocaleDateString("tr-TR")} sona erdi`
                                    : `${expiresAt.toLocaleDateString("tr-TR")} bitiş${daysLeft !== null ? ` · ${daysLeft} gün` : ""}`}
                                </span></>
                              )}
                              {!expiresAt && !isRevoked && <> · Süresiz</>}
                            </p>
                            {(sp as unknown as { notes: string | null }).notes && (
                              <p className="text-xs text-gray-400 italic mt-0.5">Not: {(sp as unknown as { notes: string | null }).notes}</p>
                            )}
                            <p className="text-[10px] text-gray-300 mt-0.5">
                              Atandı: {(sp as unknown as { assignedAt: Date }).assignedAt.toLocaleDateString("tr-TR")}
                              {(sp as unknown as { assignedBy: { name: string | null } | null }).assignedBy?.name && (
                                <> · {(sp as unknown as { assignedBy: { name: string | null } | null }).assignedBy!.name}</>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Extend date */}
                          {!isRevoked && (
                            <form action={extendPackageAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="studentId" value={student.id} />
                              <input type="hidden" name="packageId" value={sp.package.id} />
                              <input
                                type="date"
                                name="newExpiresAt"
                                min={new Date().toISOString().split("T")[0]}
                                defaultValue={expiresAt ? expiresAt.toISOString().split("T")[0] : ""}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#546B41]/30"
                              />
                              <button
                                type="submit"
                                className="text-xs text-[#546B41] hover:text-[#435633] border border-[#546B41]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#546B41]/5 transition-colors whitespace-nowrap"
                              >
                                Uzat
                              </button>
                            </form>
                          )}

                          {/* Revoke */}
                          {!isRevoked && (
                            <form action={revokePackageFromStudentAction}>
                              <input type="hidden" name="studentId" value={student.id} />
                              <input type="hidden" name="packageId" value={sp.package.id} />
                              <button
                                type="submit"
                                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-50 transition-colors"
                              >
                                <X size={11} /> İptal Et
                              </button>
                            </form>
                          )}

                          {/* Hard delete */}
                          <form action={removePackageFromStudentAction}>
                            <input type="hidden" name="studentId" value={student.id} />
                            <input type="hidden" name="packageId" value={sp.package.id} />
                            <button
                              type="submit"
                              className="text-xs text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                              title="Kaydı tamamen sil"
                            >
                              Sil
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "profil" && (
        <div className="space-y-5">
          {/* Full profile edit form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-[#091413] mb-5">Profil Bilgilerini Düzenle</h2>
            <form action={updateStudentInfoAction} className="space-y-6">
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="returnTo" value={`${returnTo}?tab=profil`} />

              {/* Basic */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Temel Bilgiler</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Ad Soyad *</label>
                    <input name="fullName" required defaultValue={student.fullName}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Telefon</label>
                    <input name="phone" defaultValue={student.phone ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="05xx xxx xx xx" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">E-posta</label>
                    <input type="email" name="email" defaultValue={student.email ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="ogrenci@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Şehir</label>
                    <input name="city" defaultValue={student.city ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="İstanbul" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">İlçe</label>
                    <input name="district" defaultValue={student.district ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Kadıköy" />
                  </div>
                </div>
              </div>

              {/* Academic */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Akademik Bilgiler</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Sınav Türü</label>
                    <select name="examType" defaultValue={student.examType ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]">
                      <option value="">Seçiniz</option>
                      <option value="YKS">YKS</option>
                      <option value="LGS">LGS</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Sınıf</label>
                    <select name="classLevel" defaultValue={student.classLevel ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]">
                      <option value="">Seçiniz</option>
                      {["8. Sınıf","9. Sınıf","10. Sınıf","11. Sınıf","12. Sınıf","Mezun"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Okul Adı</label>
                    <input name="schoolName" defaultValue={student.schoolName ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Okul adı" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Hedef Okul / Üniversite</label>
                    <input name="targetSchool" defaultValue={student.targetSchool ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Hedef okul veya üniversite" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Hedef (Puan / Sıralama)</label>
                    <input name="targetGoal" defaultValue={student.targetGoal ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Örn: 450 puan, ilk 10.000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Hedef Bölüm <span className="text-gray-400 font-normal">(YKS)</span></label>
                    <input name="department" defaultValue={student.department ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Tıp, Hukuk..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Hedef Sıralama <span className="text-gray-400 font-normal">(YKS)</span></label>
                    <input name="targetRanking" defaultValue={student.targetRanking ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Örn: 5000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Mevcut Net</label>
                    <input name="currentNet" defaultValue={student.currentNet ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Örn: TYT 80 net" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Güçlü Dersler</label>
                    <input name="strongLessons" defaultValue={student.strongLessons ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Matematik, Fizik..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Zayıf Dersler</label>
                    <input name="weakLessons" defaultValue={student.weakLessons ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Kimya, Biyoloji..." />
                  </div>
                </div>
              </div>

              {/* Parent */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Veli Bilgileri</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Veli Adı Soyadı</label>
                    <input name="parentFullName" defaultValue={student.parentFullName ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="Ad Soyad" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Veli Telefonu</label>
                    <input name="parentPhone" defaultValue={student.parentPhone ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="05xx xxx xx xx" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Veli E-postası</label>
                    <input type="email" name="parentEmail" defaultValue={student.parentEmail ?? ""}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      placeholder="veli@email.com" />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button type="submit"
                  className="bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
                  Profili Kaydet
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Admin quick-update */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-[#091413] mb-4">Yönetim Bilgileri</h2>
              <form action={updateStudentAction} className="space-y-4">
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name="returnTo" value={`${returnTo}?tab=profil`} />

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Durum</label>
                  <select name="status" defaultValue={student.status}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]">
                    {studentStatusOptions.map((s) => (
                      <option key={s} value={s}>{studentStatusLabels[s]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Aktif Paket</label>
                  <input type="text" name="activePackage" defaultValue={student.activePackage ?? ""}
                    placeholder="Paket adı..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Görev Etiketi</label>
                  <input type="text" name="taskLabel" defaultValue={student.taskLabel ?? ""}
                    placeholder="Görev açıklaması..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Sonraki Eylem</label>
                  <input type="datetime-local" name="nextActionAt" defaultValue={formatDateTimeLocalInput(student.nextActionAt)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Notlar</label>
                  <textarea name="notes" defaultValue={student.notes ?? ""} rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41] resize-none" />
                </div>

                <button type="submit"
                  className="w-full bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                  Kaydet
                </button>
              </form>
            </div>

            {/* Portal access card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound size={16} className="text-[#546B41]" />
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
                  <form action={createStudentAccountAction} className="space-y-3">
                    <input type="hidden" name="studentId" value={student.id} />
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">E-posta</label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={student.email ?? ""}
                        placeholder="ogrenci@email.com"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
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
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      Hesap Oluştur
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-800">Tehlikeli İşlemler</h2>
        <p className="text-xs text-red-600">
          Öğrenciyi silmek geri alınamaz. Tüm dersler, ödemeler ve ilişkili veriler de silinir.
        </p>
        <ConfirmDeleteButton
          action={deleteStudentAction}
          hiddenFields={{ studentId: student.id }}
          message="Bu öğrenciyi kalıcı olarak silmek istediğinizden emin misiniz?"
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
        >
          Öğrenciyi Sil
        </ConfirmDeleteButton>
      </div>
    </div>
  );
}
