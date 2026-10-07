import { prisma } from "@/lib/prisma";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { ApproveMfaResetButton } from "@/components/panel/mfa-reset-controls";

/**
 * ÇİFT KONTROLLÜ MFA SIFIRLAMA ONAY KUYRUĞU.
 *
 * Kuyruk eskiden yalnız `/panel/yonetim/kullanicilar` listesindeydi; o adres
 * `next.config.ts` ile `/panel/yonetim/kisiler`'e yönlendirildiği için hiçbir
 * yöneticiye görünmüyordu. Onayı isteği açandan BAŞKA bir yönetici verdiği
 * için liste tüm yöneticilere gösterilir. Kurallar sunucudadır
 * (`/api/panel/mfa-resets/[id]/approve`); buradaki "onaylayamazsınız" notu
 * yalnız sunum kolaylığıdır.
 *
 * Bekleyen istek yoksa hiçbir şey çizmez.
 */

const EXPIRY = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export async function PendingMfaResetQueue({
  viewerUserId,
  className = "",
}: {
  viewerUserId: string;
  className?: string;
}) {
  const pending = await prisma.mfaResetRequest.findMany({
    where: { status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    include: {
      target: { select: { id: true, fullName: true, email: true } },
      requestedBy: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!pending.length) return null;

  return (
    <section
      id="mfa-sifirlama"
      aria-labelledby="mfa-reset-queue-title"
      className={`rounded-[14px] border border-dc-line border-l-[3px] border-l-[#C2493D] bg-white p-[22px] ${className}`}
    >
      <h2 id="mfa-reset-queue-title" className="text-[16px] font-bold text-dc-ink">
        Bekleyen MFA sıfırlama onayı ({pending.length})
      </h2>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-dc-ink-muted">
        Onayı, isteği açan ve hedef yöneticiden farklı bir yönetici vermelidir.
        Onaylandığında hedefin tüm doğrulama yöntemleri silinir ve oturumları
        kapatılır.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {pending.map((reset) => {
          const blocked =
            reset.targetUserId === viewerUserId ||
            reset.requestedById === viewerUserId;
          return (
            <li
              key={reset.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-od border border-dc-line p-4"
            >
              <div className="min-w-[220px] flex-1">
                <p className="text-[13.5px] font-bold text-dc-ink">
                  {reset.target.fullName || reset.target.email}
                </p>
                <p className="mt-1 text-[12.5px] text-dc-ink-faint">
                  İsteyen: {reset.requestedBy.fullName || reset.requestedBy.email}{" "}
                  · son geçerlilik {EXPIRY.format(reset.expiresAt)}
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.6] text-dc-ink-body">
                  {reset.reason}
                </p>
              </div>
              {blocked ? (
                <p className="text-[12.5px] font-semibold text-[#C2493D]">
                  Bu isteği siz onaylayamazsınız.
                </p>
              ) : (
                <ApproveMfaResetButton requestId={reset.id} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
