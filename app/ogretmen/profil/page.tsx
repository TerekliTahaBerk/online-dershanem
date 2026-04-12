import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { updateTeacherProfileAction, changeTeacherPasswordAction } from "../actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type TeacherWithUser = Prisma.UserGetPayload<{
  include: { teacher: true };
}>;

export default async function OgretmenProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { teacher: true },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) redirect("/ogretmen");

  const successMsg: Record<string, string> = {
    profile: "Profil bilgileri güncellendi.",
    password: "Şifre başarıyla değiştirildi.",
  };
  const errorMsg: Record<string, string> = {
    "wrong-password": "Mevcut şifreniz hatalı.",
    "password-mismatch": "Yeni şifreler uyuşmuyor.",
    "password-short": "Yeni şifre en az 6 karakter olmalı.",
    "profile-error": "Profil güncellenirken bir hata oluştu.",
    "password-error": "Şifre değiştirilirken bir hata oluştu.",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Profilim</h1>
        <p className="mt-1 text-sm text-stone-500">Kişisel bilgilerinizi ve şifrenizi yönetin.</p>
      </div>

      {params.success && successMsg[params.success] && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg[params.success]}
        </div>
      )}
      {params.error && errorMsg[params.error] && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg[params.error]}
        </div>
      )}

      {/* Profile info */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4">Profil Bilgileri</h2>
        <form action={updateTeacherProfileAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Ad Soyad</label>
              <input
                name="fullName"
                required
                defaultValue={teacher.fullName}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">E-posta (hesap)</label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="w-full rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Telefon</label>
              <input
                name="phone"
                defaultValue={teacher.phone ?? ""}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+90 555 000 0000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Branşlar</label>
              <input
                name="subjects"
                required
                defaultValue={teacher.subjects}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Matematik, Fizik"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Hakkımda / Bio</label>
              <textarea
                name="bio"
                rows={3}
                defaultValue={teacher.bio ?? ""}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Kendinizden kısaca bahsedin..."
              />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-stone-100">
            <button type="submit" className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
              Kaydet
            </button>
          </div>
        </form>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4">Şifre Değiştir</h2>
        <form action={changeTeacherPasswordAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Mevcut Şifre</label>
            <input
              type="password"
              name="currentPassword"
              required
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Yeni Şifre</label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-stone-100">
            <button type="submit" className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-900 transition">
              Şifreyi Değiştir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
