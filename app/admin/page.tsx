import { redirect } from "next/navigation";
import { LeadStatus, PurchaseStatus } from "@prisma/client";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişime Geçildi",
  QUALIFIED: "Uygun",
  CLOSED: "Kapandı"
};

const purchaseStatusLabels: Record<PurchaseStatus, string> = {
  INTENT: "Talep",
  PENDING_PAYMENT: "Ödeme Bekliyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Başarısız",
  CANCELLED: "İptal"
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default async function AdminPage() {
  const session = await getServerAuthSession();

  if (session?.user?.role !== "ADMIN") {
    redirect("/giris?callbackUrl=/admin");
  }

  const [leadCount, purchaseCount, latestLeads, latestPurchases] = await Promise.all([
    prisma.leadSubmission.count(),
    prisma.purchaseSubmission.count(),
    prisma.leadSubmission.findMany({
      orderBy: { submittedAt: "desc" },
      take: 10
    }),
    prisma.purchaseSubmission.findMany({
      orderBy: { submittedAt: "desc" },
      take: 10
    })
  ]);

  const completedPurchaseCount = latestPurchases.filter((item) => item.status === "COMPLETED").length;

  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <section className="rounded-[2rem] border border-line bg-white p-7 shadow-soft sm:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Admin Paneli</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Başvurular ve satın almalar tek ekranda</h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                  Landing üzerindeki lead formları, satın alma niyetleri ve ödeme callback zemini artık uygulama veritabanında tutuluyor.
                </p>
              </div>
              <div className="rounded-2xl border border-brand/20 bg-mint px-4 py-3 text-sm font-medium text-pine">
                Aktif kullanıcı: {session.user.email}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-line bg-soft p-5">
                <p className="text-sm font-medium text-muted">Toplam Lead</p>
                <p className="mt-3 text-3xl font-bold text-ink">{leadCount}</p>
              </div>
              <div className="rounded-3xl border border-line bg-soft p-5">
                <p className="text-sm font-medium text-muted">Toplam Satın Alma Kaydı</p>
                <p className="mt-3 text-3xl font-bold text-ink">{purchaseCount}</p>
              </div>
              <div className="rounded-3xl border border-line bg-soft p-5">
                <p className="text-sm font-medium text-muted">Son 10 Kayda Göre Tamamlanan</p>
                <p className="mt-3 text-3xl font-bold text-ink">{completedPurchaseCount}</p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-ink">Son Lead Başvuruları</h2>
                <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted">{latestLeads.length} kayıt</span>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-muted/80">
                    <tr>
                      <th className="px-3 py-3">Ad</th>
                      <th className="px-3 py-3">Sınav</th>
                      <th className="px-3 py-3">Kaynak</th>
                      <th className="px-3 py-3">Durum</th>
                      <th className="px-3 py-3">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestLeads.map((lead) => (
                      <tr key={lead.id} className="border-t border-line">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-ink">{lead.fullName}</p>
                          <p className="text-xs text-muted">{lead.phone}</p>
                        </td>
                        <td className="px-3 py-3 text-muted">
                          {lead.classLevel}
                          <br />
                          {lead.examType}
                        </td>
                        <td className="px-3 py-3 text-muted">{lead.source}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink">
                            {leadStatusLabels[lead.status]}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted">{formatDate(lead.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-ink">Son Satın Alma Kayıtları</h2>
                <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted">{latestPurchases.length} kayıt</span>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-muted/80">
                    <tr>
                      <th className="px-3 py-3">Öğrenci</th>
                      <th className="px-3 py-3">Paket</th>
                      <th className="px-3 py-3">Durum</th>
                      <th className="px-3 py-3">Kaynak</th>
                      <th className="px-3 py-3">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestPurchases.map((purchase) => (
                      <tr key={purchase.id} className="border-t border-line">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-ink">{purchase.studentFullName}</p>
                          <p className="text-xs text-muted">{purchase.studentPhone}</p>
                        </td>
                        <td className="px-3 py-3 text-muted">{purchase.packageName}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink">
                            {purchaseStatusLabels[purchase.status]}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted">{purchase.source}</td>
                        <td className="px-3 py-3 text-muted">{formatDate(purchase.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
