import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { ClipboardList, UserRoundCheck } from "lucide-react";
import { loadAccountStatus } from "@/lib/account/account-status";
import { ACCOUNT_SETTINGS_PATH, CONTACT_FORM_PATH } from "@/lib/auth/roles";

/**
 * Panel içi hatırlatma bandı (öğrenci / veli).
 *
 * İki şeyi hatırlatır: kayıt sonrası atlanan Tally iletişim formu ve eksik
 * profil alanları. Hiçbir erişimi engellemez; yalnız yönlendirir.
 */
export async function AccountCompletionBanner({ userId, role }: { userId: string; role: UserRole }) {
  if (role !== "STUDENT" && role !== "PARENT") return null;
  const status = await loadAccountStatus(userId, role).catch(() => null);
  if (!status) return null;

  const needsContactForm = status.registrationSource === "SELF_SIGNUP" && !status.contactFormSubmitted;
  const needsProfile = !status.completion.complete;
  if (!needsContactForm && !needsProfile) return null;

  return (
    <section aria-label="Hesap tamamlama" className="mb-6 flex flex-col gap-2">
      {needsContactForm ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-900">
            <ClipboardList size={16} aria-hidden="true" />
            Sana ulaşabilmemiz için kısa iletişim formunu doldur.
          </p>
          <Link href={CONTACT_FORM_PATH} className="rounded-xl bg-amber-600 px-3.5 py-2 text-[13px] font-bold text-white hover:bg-amber-700">
            Formu doldur
          </Link>
        </div>
      ) : null}
      {needsProfile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dc-line bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-dc-ink">
              <UserRoundCheck size={16} aria-hidden="true" className="text-dc-brand-strong" />
              Hesabını tamamla · %{status.completion.percent}
            </p>
            <p className="mt-0.5 text-[12.5px] text-dc-ink-muted">
              Eksik: {status.completion.missing.map((item) => item.label).join(", ")}
            </p>
          </div>
          <Link
            href={ACCOUNT_SETTINGS_PATH}
            className="rounded-xl border border-dc-brand-strong px-3.5 py-2 text-[13px] font-bold text-dc-brand-strong hover:bg-dc-brand-soft"
          >
            Ayarlara git
          </Link>
        </div>
      ) : null}
    </section>
  );
}
