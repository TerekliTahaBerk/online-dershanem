import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BadgeCheck, ExternalLink, Tent, Users } from "lucide-react";

export const dynamic = "force-dynamic";

type CategoryTab = "TUMU" | "AYT" | "TYT" | "LGS";

const categoryLabels: Record<string, string> = {
  AYT: "AYT Matematik",
  TYT: "TYT Matematik",
  LGS: "LGS",
};

const categoryColors: Record<string, string> = {
  AYT: "bg-blue-100 text-blue-700",
  TYT: "bg-purple-100 text-purple-700",
  LGS: "bg-orange-100 text-orange-700",
};

const sharedFeatures = [
  "8 Kişilik Sınıf Yapısı",
  "Haftalık Detaylı PDF Materyali",
  "Konu Bazlı Mini Deneme Uygulaması",
  "Soru Çözüm Seansı ve Çözüm Notları",
  "Düzenli Eksik Analizi ve Tekrar Planı",
];

function formatPrice(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

const tabs: { label: string; value: CategoryTab }[] = [
  { label: "Tümü", value: "TUMU" },
  { label: "AYT Matematik", value: "AYT" },
  { label: "TYT Matematik", value: "TYT" },
  { label: "LGS", value: "LGS" },
];

export default async function PanelKamplarPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;
  const kategori = (params.kategori?.toUpperCase() as CategoryTab) || "TUMU";

  const camps = await prisma.camp.findMany({
    where: {
      isActive: true,
      ...(kategori !== "TUMU" ? { category: kategori as "AYT" | "TYT" | "LGS" } : {}),
    },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Kamplar</h1>
        <p className="mt-1 text-sm text-stone-500">
          Açık kamp programlarını inceleyip size uygun olanı seçin.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <a
            key={tab.value}
            href={`/panel/kamplar${tab.value === "TUMU" ? "" : `?kategori=${tab.value}`}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              kategori === tab.value
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {camps.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center">
          <Tent className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Bu kategoride açık kamp görünmüyor</p>
          <p className="text-xs text-stone-400 mt-1">Yeni kamp açıldığında burada yayınlanacak.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {camps.map((camp) => (
            <div
              key={camp.id}
              className="flex flex-col rounded-xl border border-stone-200 bg-white overflow-hidden"
            >
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryColors[camp.category]}`}>
                    {categoryLabels[camp.category]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                    <Users className="w-3 h-3" />
                    Max {camp.quota} Öğrenci
                  </span>
                </div>

                <h2 className="text-base font-semibold text-stone-900 leading-snug">{camp.name}</h2>
                <p className="text-sm text-stone-500 leading-relaxed flex-1">{camp.detail}</p>

                <ul className="space-y-1.5">
                  {sharedFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-stone-500">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                  {camp.originalPrice > camp.price && (
                    <p className="text-xs text-stone-400 line-through">{formatPrice(camp.originalPrice)}</p>
                  )}
                  <p className="text-xl font-bold text-stone-900">{formatPrice(camp.price)}</p>
                  {camp.startDate && (
                    <p className="text-xs text-stone-500 mt-1">
                      Başlangıç:{" "}
                      {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(camp.startDate)}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5">
                {camp.paytrLink ? (
                  <a
                    href={camp.paytrLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Kayıt Ol
                  </a>
                ) : (
                  <div className="rounded-lg bg-stone-100 px-4 py-2.5 text-center text-sm font-medium text-stone-500">
                    Başvuru Yakında Açılacak
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar section */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Kamp Takvimi</h2>
          <p className="text-sm text-stone-500 mt-0.5">Kamplar en geç 1 Mayıs tarihinde başlar.</p>
        </div>
        <div className="rounded-lg overflow-hidden border border-stone-100">
          <iframe
            src="https://calendar.google.com/calendar/embed?src=c7e9bc8f3695d608c263a450c1402dba131bc20a71b86ece44737de9115d9772%40group.calendar.google.com&ctz=Europe%2FIstanbul"
            style={{ border: 0 }}
            width="100%"
            height="500"
            frameBorder="0"
            scrolling="no"
            title="Kamplar Takvimi"
          />
        </div>
      </div>
    </div>
  );
}
