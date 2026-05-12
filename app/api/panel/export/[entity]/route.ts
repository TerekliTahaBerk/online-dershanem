import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { rowsToXlsxResponse, fmtDate, fmtMoney } from "@/lib/export";

export const dynamic = "force-dynamic";

type Entity = "ogrenciler" | "ogretmenler" | "veliler" | "siniflar" | "paketler" | "odevler" | "odemeler" | "muhasebe";

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  await requirePanelRole("admin");
  const { entity } = await params;
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const today = new Date().toISOString().slice(0, 10);

  switch (entity as Entity) {
    case "ogrenciler": {
      const where = q ? { OR: [{ fullName: ci(q) }, { email: ci(q) }, { phone: { contains: q } }, { city: ci(q) }, { schoolName: ci(q) }] } : {};
      const list = await prisma.student.findMany({ where, orderBy: { updatedAt: "desc" } });
      const rows = list.map((s) => ({
        "Ad Soyad": s.fullName, Telefon: s.phone, Email: s.email ?? "",
        Sınıf: s.classLevel ?? "", Sınav: s.examType ?? "", Şehir: s.city ?? "",
        İlçe: s.district ?? "", Okul: s.schoolName ?? "", Hedef: s.targetGoal ?? "",
        Durum: s.status, Notlar: s.notes ?? "", Oluşturma: fmtDate(s.createdAt), Güncelleme: fmtDate(s.updatedAt),
      }));
      return rowsToXlsxResponse(rows, "Öğrenciler", `ogrenciler-${today}.xlsx`);
    }
    case "ogretmenler": {
      const where = q ? { OR: [{ fullName: ci(q) }, { email: ci(q) }, { phone: { contains: q } }, { subjects: ci(q) }] } : {};
      const list = await prisma.teacher.findMany({ where, orderBy: { createdAt: "desc" } });
      const rows = list.map((t) => ({
        "Ad Soyad": t.fullName, Email: t.email ?? "", Telefon: t.phone ?? "",
        Branş: t.subjects, Bio: t.bio ?? "", Durum: t.status, Oluşturma: fmtDate(t.createdAt),
      }));
      return rowsToXlsxResponse(rows, "Öğretmenler", `ogretmenler-${today}.xlsx`);
    }
    case "veliler": {
      const where = q ? { OR: [{ fullName: ci(q) }, { email: ci(q) }, { phone: { contains: q } }] } : {};
      const list = await prisma.parent.findMany({
        where, orderBy: { createdAt: "desc" },
        include: { students: { include: { student: { select: { fullName: true } } } } },
      });
      const rows = list.map((p) => ({
        "Ad Soyad": p.fullName, Telefon: p.phone ?? "", Email: p.email ?? "",
        Çocuklar: p.students.map((c) => c.student.fullName).join(", "),
        Notlar: p.notes ?? "", Oluşturma: fmtDate(p.createdAt),
      }));
      return rowsToXlsxResponse(rows, "Veliler", `veliler-${today}.xlsx`);
    }
    case "siniflar": {
      const where = q ? { OR: [{ name: ci(q) }, { branch: ci(q) }] } : {};
      const list = await prisma.classroom.findMany({
        where, orderBy: { name: "asc" },
        include: { _count: { select: { students: true, teachers: true, lessons: true } } },
      });
      const rows = list.map((c) => ({
        Sınıf: c.name, Şube: c.branch ?? "", Seviye: c.level, Kapasite: c.capacity,
        Öğrenci: c._count.students, Öğretmen: c._count.teachers, Ders: c._count.lessons,
        Aktif: c.isActive ? "Evet" : "Hayır", Açıklama: c.description ?? "",
      }));
      return rowsToXlsxResponse(rows, "Sınıflar", `siniflar-${today}.xlsx`);
    }
    case "paketler": {
      const where = q ? { OR: [{ name: ci(q) }, { subjects: ci(q) }] } : {};
      const list = await prisma.package.findMany({ where, orderBy: { createdAt: "desc" } });
      const rows = list.map((p) => ({
        Ad: p.name, Tür: p.type, "Ders Sayısı": p.lessonCount,
        "Fiyat (TL)": fmtMoney(p.price), Dersler: p.subjects,
        Aktif: p.isActive ? "Evet" : "Hayır", Açıklama: p.description ?? "",
      }));
      return rowsToXlsxResponse(rows, "Paketler", `paketler-${today}.xlsx`);
    }
    case "odevler": {
      const where = q ? { OR: [{ title: ci(q) }, { subject: ci(q) }, { description: ci(q) }] } : {};
      const list = await prisma.assignment.findMany({
        where, orderBy: { createdAt: "desc" },
        include: { teacher: { select: { fullName: true } }, _count: { select: { submissions: true } } },
      });
      const rows = list.map((a) => ({
        Başlık: a.title, Ders: a.subject ?? "", Öğretmen: a.teacher.fullName,
        "Son Teslim": fmtDate(a.dueAt), Durum: a.status, Gönderim: a._count.submissions,
        Açıklama: a.description ?? "",
      }));
      return rowsToXlsxResponse(rows, "Ödevler", `odevler-${today}.xlsx`);
    }
    case "odemeler": {
      const where = q ? { OR: [{ studentFullName: ci(q) }, { packageName: ci(q) }] } : {};
      const list = await prisma.purchaseIntent.findMany({ where, orderBy: { submittedAt: "desc" } });
      const rows = list.map((p) => ({
        Öğrenci: p.studentFullName, Telefon: p.studentPhone ?? "", Paket: p.packageName,
        Durum: p.status, Tarih: fmtDate(p.submittedAt),
      }));
      return rowsToXlsxResponse(rows, "Ödemeler", `odemeler-${today}.xlsx`);
    }
    case "muhasebe": {
      const where = q ? { description: ci(q) } : {};
      const list = await prisma.accountingEntry.findMany({
        where, orderBy: { occurredAt: "desc" },
        include: { student: { select: { fullName: true } }, teacher: { select: { fullName: true } } },
      });
      const rows = list.map((e) => ({
        Tarih: fmtDate(e.occurredAt), Tip: e.type, Kategori: e.category,
        "Tutar (TL)": fmtMoney(e.amount), Açıklama: e.description ?? "",
        Öğrenci: e.student?.fullName ?? "", Öğretmen: e.teacher?.fullName ?? "",
      }));
      return rowsToXlsxResponse(rows, "Muhasebe", `muhasebe-${today}.xlsx`);
    }
    default:
      return new Response("Bilinmeyen export tipi", { status: 404 });
  }
}
