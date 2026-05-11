import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { prisma } from "@/lib/prisma";
import { PrintShell } from "@/components/od/print/print-shell";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  INCOME: "Gelir",
  EXPENSE: "Gider",
};

const CATEGORY_LABEL: Record<string, string> = {
  PACKAGE_SALE: "Paket Satışı",
  PRIVATE_LESSON: "Özel Ders",
  CAMP: "Kamp",
  OTHER_INCOME: "Diğer Gelir",
  TEACHER_PAYROLL: "Öğretmen Maaşı",
  RENT: "Kira",
  UTILITY: "Fatura",
  MARKETING: "Pazarlama",
  OTHER_EXPENSE: "Diğer Gider",
};

function fmtTL(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

export default async function PaymentReceiptPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("accounting.read");
  const { id } = await params;

  const entry = await prisma.accountingEntry.findUnique({
    where: { id },
    include: {
      student: { select: { fullName: true, phone: true, email: true } },
      package: { select: { name: true } },
      teacher: { select: { fullName: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!entry) notFound();

  const isIncome = entry.type === "INCOME";
  const meta = [
    `Belge No: ${entry.id.slice(-8).toUpperCase()}`,
    `Tarih: ${entry.occurredAt.toLocaleDateString("tr-TR")}`,
    `Tip: ${TYPE_LABEL[entry.type] ?? entry.type}`,
  ];

  return (
    <PrintShell
      title={isIncome ? "Tahsilat Makbuzu" : "Ödeme Belgesi"}
      subtitle={`${CATEGORY_LABEL[entry.category] ?? entry.category} · ${entry.occurredAt.toLocaleString("tr-TR")}`}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Tutar bloku */}
        <div className="border-2 border-black p-4 text-center">
          <div className="text-[11px] uppercase tracking-wider text-gray-600">
            {isIncome ? "Tahsil Edilen Tutar" : "Ödenen Tutar"}
          </div>
          <div className="mt-2 text-3xl font-bold">{fmtTL(entry.amount)}</div>
        </div>

        {/* İlişkili taraf */}
        {(entry.student || entry.teacher) && (
          <div>
            <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">
              {entry.student ? "Öğrenci Bilgileri" : "Öğretmen Bilgileri"}
            </h3>
            <table className="w-full text-[12px]">
              <tbody>
                {entry.student && (
                  <>
                    <tr><td className="py-1 w-32 text-gray-600">Ad Soyad</td><td className="py-1 font-medium">{entry.student.fullName}</td></tr>
                    {entry.student.phone && <tr><td className="py-1 text-gray-600">Telefon</td><td className="py-1 font-mono">{entry.student.phone}</td></tr>}
                    {entry.student.email && <tr><td className="py-1 text-gray-600">E-posta</td><td className="py-1">{entry.student.email}</td></tr>}
                  </>
                )}
                {entry.teacher && (
                  <tr><td className="py-1 w-32 text-gray-600">Ad Soyad</td><td className="py-1 font-medium">{entry.teacher.fullName}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Detaylar */}
        <div>
          <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">Detaylar</h3>
          <table className="w-full text-[12px]">
            <tbody>
              <tr><td className="py-1 w-32 text-gray-600">Kategori</td><td className="py-1">{CATEGORY_LABEL[entry.category] ?? entry.category}</td></tr>
              {entry.package && <tr><td className="py-1 text-gray-600">Paket</td><td className="py-1">{entry.package.name}</td></tr>}
              {entry.description && <tr><td className="py-1 text-gray-600 align-top">Açıklama</td><td className="py-1 whitespace-pre-line">{entry.description}</td></tr>}
              {entry.createdBy && <tr><td className="py-1 text-gray-600">Düzenleyen</td><td className="py-1">{entry.createdBy.name ?? entry.createdBy.email ?? "—"}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* İmzalar */}
        <div className="pt-12 grid grid-cols-2 gap-12">
          <div className="border-t border-black pt-2 text-center text-[11px] text-gray-600">
            Düzenleyen<br/>İmza
          </div>
          <div className="border-t border-black pt-2 text-center text-[11px] text-gray-600">
            {isIncome ? "Tahsil Eden" : "Teslim Alan"}<br/>İmza
          </div>
        </div>
      </div>
    </PrintShell>
  );
}
