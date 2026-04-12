import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreditCard, ExternalLink, CheckCircle, Clock, XCircle, Receipt } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type PurchaseWithEvents = Prisma.PurchaseIntentGetPayload<{
  include: { events: true };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        purchaseIntents: { include: { events: true } };
      };
    };
  };
}>;

const statusConfig = {
  PAID: { label: "Ödendi", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Beklemede", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  FAILED: { label: "Başarısız", icon: XCircle, cls: "bg-red-50 text-red-600 border-red-200" },
} as const;

function formatPrice(str: string) {
  // packageName may contain price info or not — just show it
  return str;
}

export default async function PanelOdemelerPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          purchaseIntents: {
            include: { events: { orderBy: { createdAt: "asc" } } },
            orderBy: { submittedAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const purchases = student.purchaseIntents as unknown as PurchaseWithEvents[];
  const paidCount = purchases.filter((p) => p.status === "PAID").length;
  const pendingCount = purchases.filter((p) => p.status === "PENDING").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Ödemelerim</h1>
        <p className="mt-1 text-sm text-stone-500">
          {purchases.length} ödeme · {paidCount} tamamlandı · {pendingCount} beklemede
        </p>
      </div>

      {/* Summary cards */}
      {purchases.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Toplam Kayıt", value: purchases.length, icon: Receipt, color: "text-stone-600 bg-stone-100" },
            { label: "Ödendi", value: paidCount, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
            { label: "Bekleyen", value: pendingCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl bg-white border border-stone-200 p-4">
              <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-stone-900">{value}</p>
              <p className="text-xs text-stone-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-white border border-stone-200">
          <CreditCard className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Henüz ödeme hareketiniz yok</p>
          <p className="text-xs text-stone-400 mt-1">Satın alma detaylarınız burada yer alacak.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => {
            const cfg = statusConfig[purchase.status as keyof typeof statusConfig] ?? statusConfig.PENDING;
            const StatusIcon = cfg.icon;
            return (
              <div key={purchase.id} className="rounded-xl bg-white border border-stone-200 overflow-hidden">
                {/* Purchase header */}
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CreditCard className="w-4 h-4 text-stone-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{purchase.packageName}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {new Intl.DateTimeFormat("tr-TR", {
                          day: "numeric", month: "long", year: "numeric",
                        }).format(new Date(purchase.submittedAt))}
                        {" · "}{purchase.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.cls}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    {purchase.status === "PENDING" && purchase.paymentLink && (
                      <a
                        href={purchase.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition"
                      >
                        Ödemeye Git <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Event timeline */}
                {purchase.events.length > 0 && (
                  <div className="border-t border-stone-100 bg-stone-50 px-5 py-3">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Ödeme Geçmişi</p>
                    <div className="space-y-1.5">
                      {purchase.events.map((event) => (
                        <div key={event.id} className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0" />
                          <p className="text-xs text-stone-500">
                            <span className="font-medium text-stone-700">
                              {event.eventType.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                            {" · "}
                            {new Intl.DateTimeFormat("tr-TR", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            }).format(new Date(event.createdAt))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
