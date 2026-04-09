import { PurchaseEvent, PurchaseIntent } from "@prisma/client";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

const statusLabels: Record<string, string> = {
  PENDING: "Bekliyor",
  PAID: "Ödendi",
  FAILED: "Başarısız"
};

export default async function AdminPage() {
  let leadCount = 0;
  let purchaseCount = 0;
  let eventCount = 0;
  let leads: Array<{
    id: string;
    fullName: string;
    phone: string;
    classLevel: string;
    examType: string;
    targetGoal: string;
    currentNet: string;
    parentPhone: string | null;
    source: string;
    createdAt: Date;
  }> = [];
  let rawPurchases: PurchaseIntent[] = [];
  let events: PurchaseEvent[] = [];
  let databaseUnavailable = false;

  try {
    [leadCount, purchaseCount, eventCount, leads, rawPurchases, events] = await Promise.all([
      prisma.leadSubmission.count(),
      prisma.purchaseIntent.count(),
      prisma.purchaseEvent.count(),
      prisma.leadSubmission.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 12
      }),
      prisma.purchaseIntent.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 12
      }),
      prisma.purchaseEvent.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      })
    ]);
  } catch {
    databaseUnavailable = true;
  }

  const purchases = rawPurchases;
  const eventsByPurchaseIntentId = new Map<string, PurchaseEvent[]>();

  for (const event of events) {
    if (!event.purchaseIntentId) {
      continue;
    }

    const current = eventsByPurchaseIntentId.get(event.purchaseIntentId) ?? [];
    if (current.length < 3) {
      current.push(event);
      eventsByPurchaseIntentId.set(event.purchaseIntentId, current);
    }
  }

  return (
    <main className="py-10">
      <Container>
        {databaseUnavailable ? (
          <section className="mb-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Admin paneli açıldı ancak bu ortamda veritabanına erişilemedi. Yerelde sandbox DNS kısıtı veya geçici ağ hatası olabilir; Vercel
            ortamında ya da tam ağ erişimli bir local oturumda kayıtlar görünecektir.
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-muted">Toplam Lead</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-ink">{leadCount}</p>
            <p className="mt-2 text-sm text-muted">Popup ve kısa form başvuruları.</p>
          </div>
          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-muted">Satın Alma Ön Formu</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-ink">{purchaseCount}</p>
            <p className="mt-2 text-sm text-muted">Ödeme öncesi öğrenci analiz kayıtları.</p>
          </div>
          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-muted">Ödeme Olayları</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-ink">{eventCount}</p>
            <p className="mt-2 text-sm text-muted">Ödeme linkine geçiş ve callback kayıtları.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_1.15fr]">
          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Lead Akışı</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">Son başvurular</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {leads.map((lead) => (
                <article key={lead.id} className="rounded-2xl border border-line bg-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{lead.fullName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {lead.phone} • {lead.classLevel} • {lead.examType}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted">{formatDate(lead.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Hedef: <span className="font-medium text-ink">{lead.targetGoal}</span> | Mevcut durum:{" "}
                    <span className="font-medium text-ink">{lead.currentNet}</span>
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Kaynak: {lead.source}
                    {lead.parentPhone ? ` • Veli: ${lead.parentPhone}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Satın Alma Akışı</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Satın alma niyetleri</h2>

            <div className="mt-6 space-y-4">
              {purchases.map((purchase) => (
                <article key={purchase.id} className="rounded-2xl border border-line bg-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{purchase.studentFullName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {purchase.packageName} • {purchase.studentPhone} • {purchase.studentEmail}
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink">
                      {statusLabels[purchase.status]}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                    <p>
                      {purchase.classLevel} • {purchase.examType}
                    </p>
                    <p>
                      {purchase.city} / {purchase.district}
                    </p>
                    <p>Hedef: {purchase.targetRanking}</p>
                    <p>Çalışma durumu: {purchase.studyStatus}</p>
                  </div>

                  <p className="mt-3 text-xs text-muted">
                    Zayıf dersler: {purchase.weakLessons}
                    {purchase.strongLessons ? ` • Güçlü dersler: ${purchase.strongLessons}` : ""}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(eventsByPurchaseIntentId.get(purchase.id) ?? []).map((event) => (
                      <span key={event.id} className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold text-muted">
                        {event.eventType} • {formatDate(event.createdAt)}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-line bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Olay Günlüğü</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Son ödeme olayları</h2>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted">
                  <th className="px-3 py-2">Tarih</th>
                  <th className="px-3 py-2">Olay</th>
                  <th className="px-3 py-2">Paket</th>
                  <th className="px-3 py-2">Kaynak</th>
                  <th className="px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="rounded-2xl bg-soft text-sm text-ink">
                    <td className="rounded-l-2xl px-3 py-3 text-muted">{formatDate(event.createdAt)}</td>
                    <td className="px-3 py-3 font-semibold">{event.eventType}</td>
                    <td className="px-3 py-3 text-muted">{event.packageName ?? "-"}</td>
                    <td className="px-3 py-3 text-muted">{event.source ?? "-"}</td>
                    <td className="rounded-r-2xl px-3 py-3 text-muted">{event.status ? statusLabels[event.status] : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </main>
  );
}
