import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { User, Phone, Mail, MapPin, School, BookOpen, Lock } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { changePasswordAction } from "@/app/panel/actions";

export const dynamic = "force-dynamic";

type UserWithStudent = Prisma.UserGetPayload<{
  include: { student: true };
}>;

type Props = { searchParams?: Promise<{ error?: string; success?: string }> };

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-stone-400 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm text-stone-800">{value}</dd>
    </div>
  );
}

const errorMessages: Record<string, string> = {
  missing: "Lütfen tüm alanları doldurun.",
  short: "Yeni şifre en az 6 karakter olmalıdır.",
  mismatch: "Yeni şifreler eşleşmiyor.",
  wrong: "Mevcut şifreniz hatalı.",
};

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
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Profilim</h1>
        <p className="mt-1 text-sm text-stone-500">Kişisel bilgilerinizi görüntüleyin.</p>
      </div>

      {/* Avatar + name */}
      <div className="rounded-xl bg-white border border-stone-200 p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{student.fullName}</h2>
          {user?.email && (
            <p className="text-sm text-stone-500 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </p>
          )}
          {student.activePackage && (
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5">
              <BookOpen className="w-3 h-3" />
              {student.activePackage}
            </span>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="rounded-xl bg-white border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-stone-400" /> İletişim
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon" value={student.phone} />
          <Field label="E-posta" value={student.email} />
          <Field label="Şehir" value={student.city} />
          <Field label="İlçe" value={student.district} />
        </dl>
      </div>

      {/* Academic info */}
      <div className="rounded-xl bg-white border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <School className="w-4 h-4 text-stone-400" /> Akademik
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Okul" value={student.schoolName} />
          <Field label="Sınıf" value={student.classLevel} />
          <Field label="Alan" value={student.department} />
          <Field label="Sınav Türü" value={student.examType} />
          <Field label="Hedef" value={student.targetGoal} />
          <Field label="Hedef Okul" value={student.targetSchool} />
          <Field label="Güçlü Dersler" value={student.strongLessons} />
          <Field label="Zayıf Dersler" value={student.weakLessons} />
        </dl>
      </div>

      {/* Parent info */}
      {(student.parentFullName || student.parentPhone) && (
        <div className="rounded-xl bg-white border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-stone-400" /> Veli
          </h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Veli Adı" value={student.parentFullName} />
            <Field label="Veli Telefonu" value={student.parentPhone} />
            <Field label="Veli E-postası" value={student.parentEmail} />
          </dl>
        </div>
      )}

      {/* Password change */}
      <div className="rounded-xl bg-white border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-stone-400" /> Şifre Değiştir
        </h3>

        {successKey === "password" && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
            Şifreniz başarıyla güncellendi.
          </div>
        )}
        {errorKey && errorMessages[errorKey] && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {errorMessages[errorKey]}
          </div>
        )}

        <form action={changePasswordAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Mevcut Şifre</label>
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Yeni Şifre</label>
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="En az 6 karakter"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="Aynı şifreyi girin"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            Şifreyi Güncelle
          </button>
        </form>
      </div>
    </div>
  );
}
