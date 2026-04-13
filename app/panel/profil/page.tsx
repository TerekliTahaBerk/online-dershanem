import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, Lock, School, User } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { changePasswordAction, updateStudentProfileAction } from "@/app/panel/actions";

export const dynamic = "force-dynamic";

type UserWithStudent = Prisma.UserGetPayload<{
  include: { student: true };
}>;

type Props = { searchParams?: Promise<{ error?: string; success?: string }> };

const inputClass =
  "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500";

const labelClass = "block text-xs font-medium text-stone-600 mb-1.5";

const passwordErrors: Record<string, string> = {
  missing: "Lütfen tüm alanları doldurun.",
  short: "Yeni şifre en az 6 karakter olmalıdır.",
  mismatch: "Yeni şifreler eşleşmiyor.",
  wrong: "Mevcut şifreniz hatalı.",
};

const CLASS_LEVELS = ["8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Mezun"];
const EXAM_TYPES = ["YKS", "LGS"];

export default async function PanelProfilPage({ searchParams }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { student: true },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const sp = await searchParams;
  const errorKey = sp?.error ?? "";
  const successKey = sp?.success ?? "";

  const initials = student.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Profilim</h1>
        <p className="mt-1 text-sm text-stone-500">Kişisel bilgilerinizi ve hesap güvenliğinizi buradan yönetin.</p>
      </div>

      {/* Avatar card */}
      <div className="rounded-xl bg-white border border-stone-200 p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{student.fullName}</h2>
          {user?.email && (
            <p className="text-sm text-stone-500 mt-0.5">{user.email}</p>
          )}
          {student.activePackage && (
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5">
              <BookOpen className="w-3 h-3" />
              {student.activePackage}
            </span>
          )}
        </div>
      </div>

      {/* Profile edit form */}
      <div className="rounded-xl bg-white border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-stone-400" /> Kişisel Bilgiler
        </h3>

        {successKey === "profile" && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
            Bilgileriniz kaydedildi.
          </div>
        )}

        <form action={updateStudentProfileAction} className="space-y-5">
          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">İletişim</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Telefon</label>
                <input name="phone" defaultValue={student.phone ?? ""} className={inputClass} placeholder="05xx xxx xx xx" />
              </div>
              <div>
                <label className={labelClass}>Şehir</label>
                <input name="city" defaultValue={student.city ?? ""} className={inputClass} placeholder="İstanbul" />
              </div>
              <div>
                <label className={labelClass}>İlçe</label>
                <input name="district" defaultValue={student.district ?? ""} className={inputClass} placeholder="Kadıköy" />
              </div>
            </div>
          </div>

          {/* Academic */}
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Akademik Bilgiler</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Sınav Türü</label>
                <select name="examType" defaultValue={student.examType ?? ""} className={inputClass}>
                  <option value="">Seçiniz</option>
                  {EXAM_TYPES.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Sınıf</label>
                <select name="classLevel" defaultValue={student.classLevel ?? ""} className={inputClass}>
                  <option value="">Seçiniz</option>
                  {CLASS_LEVELS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Okul Adı</label>
                <input name="schoolName" defaultValue={student.schoolName ?? ""} className={inputClass} placeholder="Okul adınızı girin" />
              </div>
              <div>
                <label className={labelClass}>Hedef Okul / Üniversite</label>
                <input name="targetSchool" defaultValue={student.targetSchool ?? ""} className={inputClass} placeholder="Hedef okul veya üniversite" />
              </div>
              <div>
                <label className={labelClass}>Hedef (Puan / Sıralama)</label>
                <input name="targetGoal" defaultValue={student.targetGoal ?? ""} className={inputClass} placeholder="Örn: 450 puan, ilk 10.000" />
              </div>
              <div>
                <label className={labelClass}>Hedef Bölüm <span className="text-stone-400 font-normal">(YKS)</span></label>
                <input name="department" defaultValue={student.department ?? ""} className={inputClass} placeholder="Örn: Tıp, Hukuk" />
              </div>
              <div>
                <label className={labelClass}>Hedef Sıralama <span className="text-stone-400 font-normal">(YKS)</span></label>
                <input name="targetRanking" defaultValue={student.targetRanking ?? ""} className={inputClass} placeholder="Örn: 5000" />
              </div>
              <div>
                <label className={labelClass}>Mevcut Net</label>
                <input name="currentNet" defaultValue={student.currentNet ?? ""} className={inputClass} placeholder="Örn: TYT 80 net" />
              </div>
              <div>
                <label className={labelClass}>Güçlü Dersler</label>
                <input name="strongLessons" defaultValue={student.strongLessons ?? ""} className={inputClass} placeholder="Örn: Matematik, Fizik" />
              </div>
              <div>
                <label className={labelClass}>Zayıf Dersler</label>
                <input name="weakLessons" defaultValue={student.weakLessons ?? ""} className={inputClass} placeholder="Örn: Kimya, Biyoloji" />
              </div>
            </div>
          </div>

          {/* Parent */}
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Veli Bilgileri</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Veli Adı Soyadı</label>
                <input name="parentFullName" defaultValue={student.parentFullName ?? ""} className={inputClass} placeholder="Ad Soyad" />
              </div>
              <div>
                <label className={labelClass}>Veli Telefonu</label>
                <input name="parentPhone" defaultValue={student.parentPhone ?? ""} className={inputClass} placeholder="05xx xxx xx xx" />
              </div>
              <div>
                <label className={labelClass}>Veli E-postası</label>
                <input type="email" name="parentEmail" defaultValue={student.parentEmail ?? ""} className={inputClass} placeholder="veli@email.com" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            Bilgileri Kaydet
          </button>
        </form>
      </div>

      {/* Password change */}
      <div className="rounded-xl bg-white border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-stone-400" /> Şifre Güncelle
        </h3>

        {successKey === "password" && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
            Şifreniz güncellendi.
          </div>
        )}
        {errorKey && passwordErrors[errorKey] && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {passwordErrors[errorKey]}
          </div>
        )}

        <form action={changePasswordAction} className="space-y-4">
          <div>
            <label className={labelClass}>Mevcut Şifre</label>
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className={labelClass}>Yeni Şifre</label>
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
              placeholder="En az 6 karakter"
            />
          </div>
          <div>
            <label className={labelClass}>Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              className={inputClass}
              placeholder="Aynı şifreyi girin"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-stone-800 hover:bg-stone-900 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            Şifreyi Kaydet
          </button>
        </form>
      </div>
    </div>
  );
}
