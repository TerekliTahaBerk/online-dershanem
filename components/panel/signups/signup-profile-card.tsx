import Link from "next/link";
import { PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { loadSignupProfileSummary } from "@/lib/panel/signup-profile-server";

/**
 * Yönetim · kullanıcı detayı: kayıt formu, iletişim formu (Tally) ve
 * velinin bildirdiği çocuklar. Kaydı olmayan (admin açtığı) hesaplarda basılmaz.
 * Veri: `loadSignupProfileSummary` (mobil kişi detayı da aynısını kullanır).
 */
export async function SignupProfileCard({ userId }: { userId: string }) {
  const summary = await loadSignupProfileSummary(userId);
  if (!summary) return null;

  return (
    <PanelCard className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PanelCardTitle>Kayıt ve iletişim bilgileri</PanelCardTitle>
        <Link href="/panel/yonetim/basvurular" className="text-[13px] font-semibold text-dc-brand-strong">
          Yeni kayıtlar
        </Link>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
        {summary.rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[12px] text-dc-ink-faint">{label}</dt>
            <dd className="text-dc-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {summary.note ? <p className="mt-3 rounded-lg bg-dc-surface-soft px-3 py-2 text-[13px] text-dc-ink">“{summary.note}”</p> : null}
      {summary.pendingChildren.length ? (
        <div className="mt-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-dc-ink-ghost">Bildirilen çocuklar</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13.5px] text-dc-ink">
            {summary.pendingChildren.map((child) => (
              <li key={child.id}>{child.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {summary.formFields.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-dc-ink">İletişim formu yanıtları</summary>
          <dl className="mt-2 flex flex-col gap-1.5 text-[13px]">
            {summary.formFields.map((field, index) => (
              <div key={index}>
                <dt className="text-[12px] text-dc-ink-faint">{field.label}</dt>
                <dd className="text-dc-ink">{field.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </PanelCard>
  );
}
