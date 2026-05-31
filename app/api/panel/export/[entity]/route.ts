import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { rowsToXlsxResponse, fmtDate, fmtMoney } from "@/lib/export";

export const dynamic = "force-dynamic";

type Entity =
  | "ogrenciler"
  | "ogretmenler"
  | "veliler"
  | "siniflar"
  | "paketler"
  | "odevler"
  | "odemeler"
  | "muhasebe"
  | "odk-denemeler"
  | "odk-cheat"
  | "odk-cozumler"
  | "odk-kazanim"
  | "odk-raporlar";

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  await requirePanelRole("admin");
  const { entity } = await params;
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const idsRaw = req.nextUrl.searchParams.get("ids") ?? "";
  // Phase 3 / Session 8 — when caller passes `?ids=a,b,c`, restrict the
  // export to just those rows (used by selected-row export from list bulk
  // bar). Hard-cap at 1000 ids to match BULK_MAX_IDS×2 sanity.
  const ids = idsRaw
    ? Array.from(new Set(idsRaw.split(",").map((s) => s.trim()).filter(Boolean))).slice(0, 1000)
    : [];
  const today = new Date().toISOString().slice(0, 10);

  switch (entity as Entity) {
    case "ogrenciler": {
      const filters: Record<string, unknown>[] = [];
      if (q) filters.push({ OR: [{ fullName: ci(q) }, { email: ci(q) }, { phone: { contains: q } }, { city: ci(q) }, { schoolName: ci(q) }] });
      if (ids.length > 0) filters.push({ id: { in: ids } });
      const where = filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { AND: filters };
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
      const filters: Record<string, unknown>[] = [];
      if (q) filters.push({ OR: [{ fullName: ci(q) }, { email: ci(q) }, { phone: { contains: q } }, { subjects: ci(q) }] });
      if (ids.length > 0) filters.push({ id: { in: ids } });
      const where = filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { AND: filters };
      const list = await prisma.teacher.findMany({ where, orderBy: { createdAt: "desc" } });
      const rows = list.map((t) => ({
        "Ad Soyad": t.fullName, Email: t.email ?? "", Telefon: t.phone ?? "",
        Branş: t.subjects, Bio: t.bio ?? "", Durum: t.status, Oluşturma: fmtDate(t.createdAt),
      }));
      return rowsToXlsxResponse(rows, "Öğretmenler", `ogretmenler-${today}.xlsx`);
    }
    case "veliler": {
      const filters: Record<string, unknown>[] = [];
      if (q) filters.push({ OR: [{ fullName: ci(q) }, { email: ci(q) }, { phone: { contains: q } }] });
      if (ids.length > 0) filters.push({ id: { in: ids } });
      const where = filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { AND: filters };
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
    case "odk-denemeler": {
      const where = q
        ? { OR: [{ title: ci(q) }, { slug: ci(q) }, { classLevel: ci(q) }] }
        : {};
      const list = await prisma.odkExam.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { sections: true, attempts: true, files: true, examAccessTags: true } } },
      });
      const rows = list.map((e) => ({
        Başlık: e.title,
        Slug: e.slug,
        Tür: e.cadenceFamily,
        Sınıf: e.classLevel ?? "",
        Süre_dk: e.durationMinutes,
        Durum: e.status,
        Bölüm: e._count.sections,
        Çözüm: e._count.attempts,
        Dosya: e._count.files,
        Tag: e._count.examAccessTags,
        Başlangıç: fmtDate(e.startsAt),
        Bitiş: fmtDate(e.endsAt),
        Yayın: fmtDate(e.publishedAt),
        Oluşturma: fmtDate(e.createdAt),
      }));
      return rowsToXlsxResponse(rows, "ODK Denemeler", `odk-denemeler-${today}.xlsx`);
    }
    case "odk-cheat": {
      const list = await prisma.odkExamAttempt.findMany({
        where: { cheatViolationCount: { gt: 0 } },
        orderBy: [{ cheatViolationCount: "desc" }, { lastEventAt: "desc" }],
        take: 1000,
        select: {
          id: true,
          status: true,
          cheatViolationCount: true,
          tabSwitchCount: true,
          autoSubmitted: true,
          suspiciousScore: true,
          startedAt: true,
          submittedAt: true,
          lastEventAt: true,
          user: { select: { name: true, email: true } },
          exam: { select: { title: true, cadenceFamily: true } },
        },
      });
      const rows = list.map((a) => ({
        Öğrenci: a.user.name ?? "",
        Email: a.user.email,
        Deneme: a.exam.title,
        Tür: a.exam.cadenceFamily,
        İhlal: a.cheatViolationCount,
        Sekme: a.tabSwitchCount,
        Şüphe_Yüzde: a.suspiciousScore != null ? Math.round(a.suspiciousScore * 100) : "",
        Otomatik_Submit: a.autoSubmitted ? "Evet" : "Hayır",
        Durum: a.status,
        Başlangıç: fmtDate(a.startedAt),
        Submit: fmtDate(a.submittedAt),
        Son_olay: fmtDate(a.lastEventAt),
        Attempt_Id: a.id,
      }));
      return rowsToXlsxResponse(rows, "ODK Cheat", `odk-cheat-${today}.xlsx`);
    }
    case "odk-cozumler": {
      const list = await prisma.odkExamAttempt.findMany({
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 2000,
        select: {
          id: true,
          score: true,
          correctCount: true,
          wrongCount: true,
          blankCount: true,
          cheatViolationCount: true,
          durationSeconds: true,
          startedAt: true,
          submittedAt: true,
          user: { select: { name: true, email: true } },
          exam: { select: { title: true, cadenceFamily: true } },
        },
      });
      const rows = list.map((a) => ({
        Öğrenci: a.user.name ?? "",
        Email: a.user.email,
        Deneme: a.exam.title,
        Tür: a.exam.cadenceFamily,
        Net: a.score ? Number(a.score) : 0,
        Doğru: a.correctCount,
        Yanlış: a.wrongCount,
        Boş: a.blankCount,
        Süre_dk: a.durationSeconds ? Math.round(a.durationSeconds / 60) : "",
        Cheat: a.cheatViolationCount,
        Başlangıç: fmtDate(a.startedAt),
        Submit: fmtDate(a.submittedAt),
        Attempt_Id: a.id,
      }));
      return rowsToXlsxResponse(rows, "ODK Çözümler", `odk-cozumler-${today}.xlsx`);
    }
    case "odk-kazanim": {
      const attempts = await prisma.odkExamAttempt.findMany({
        where: { status: "SUBMITTED" },
        take: 2000,
        orderBy: { submittedAt: "desc" },
        select: {
          examId: true,
          opticalAnswers: { select: { sectionId: true, questionNumber: true, selectedOption: true } },
        },
      });
      const examIds = Array.from(new Set(attempts.map((a) => a.examId)));
      const sections = await prisma.odkExamSection.findMany({
        where: { examId: { in: examIds } },
        select: { id: true },
      });
      const officials = await prisma.odkExamOfficialAnswer.findMany({
        where: { sectionId: { in: sections.map((s) => s.id) } },
        select: {
          sectionId: true,
          questionNumber: true,
          correctOption: true,
          lesson: true,
          learningOutcomeCode: true,
          learningOutcome: true,
        },
      });
      const offMap = new Map<string, { correct: string; lesson: string | null; code: string | null; outcome: string | null }>();
      for (const o of officials) {
        offMap.set(`${o.sectionId}:${o.questionNumber}`, {
          correct: o.correctOption,
          lesson: o.lesson,
          code: o.learningOutcomeCode,
          outcome: o.learningOutcome,
        });
      }
      type Agg = { lesson: string; code: string; outcome: string; total: number; correct: number; wrong: number; blank: number };
      const aggMap = new Map<string, Agg>();
      for (const a of attempts) {
        for (const o of a.opticalAnswers) {
          const off = offMap.get(`${o.sectionId}:${o.questionNumber}`);
          if (!off || !off.code) continue;
          const key = `${off.lesson ?? "—"}::${off.code}`;
          const cur = aggMap.get(key) ?? {
            lesson: off.lesson ?? "—",
            code: off.code,
            outcome: off.outcome ?? "",
            total: 0,
            correct: 0,
            wrong: 0,
            blank: 0,
          };
          cur.total += 1;
          if (!o.selectedOption) cur.blank += 1;
          else if (o.selectedOption === off.correct) cur.correct += 1;
          else cur.wrong += 1;
          aggMap.set(key, cur);
        }
      }
      const rows = Array.from(aggMap.values())
        .filter((r) => r.total >= 2)
        .sort((a, b) => (b.wrong + b.blank) / b.total - (a.wrong + a.blank) / a.total)
        .map((r) => ({
          Ders: r.lesson,
          Kod: r.code,
          Kazanım: r.outcome,
          Toplam: r.total,
          Doğru: r.correct,
          Yanlış: r.wrong,
          Boş: r.blank,
          Başarı_Yüzde: Math.round((r.correct / r.total) * 100),
          Hata_Yüzde: Math.round(((r.wrong + r.blank) / r.total) * 100),
        }));
      return rowsToXlsxResponse(rows, "ODK Kazanım", `odk-kazanim-${today}.xlsx`);
    }
    case "odk-raporlar": {
      const exams = await prisma.odkExam.findMany({
        where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          title: true,
          slug: true,
          cadenceFamily: true,
          classLevel: true,
          status: true,
          durationMinutes: true,
          attempts: {
            where: { status: "SUBMITTED" },
            select: {
              score: true,
              correctCount: true,
              wrongCount: true,
              blankCount: true,
              durationSeconds: true,
              cheatViolationCount: true,
            },
          },
        },
      });
      const rows = exams.map((e) => {
        const n = e.attempts.length;
        if (n === 0) {
          return {
            Deneme: e.title,
            Slug: e.slug,
            Tür: e.cadenceFamily,
            Sınıf: e.classLevel ?? "",
            Durum: e.status,
            Çözüm: 0,
            Ort_Net: "",
            Ort_Doğru: "",
            Ort_Yanlış: "",
            Ort_Boş: "",
            Ort_Süre_dk: "",
            Cheat_Toplam: 0,
          };
        }
        const sumScore = e.attempts.reduce((s, a) => s + (a.score ? Number(a.score) : 0), 0);
        const sumCorrect = e.attempts.reduce((s, a) => s + a.correctCount, 0);
        const sumWrong = e.attempts.reduce((s, a) => s + a.wrongCount, 0);
        const sumBlank = e.attempts.reduce((s, a) => s + a.blankCount, 0);
        const sumDur = e.attempts.reduce((s, a) => s + (a.durationSeconds ?? 0), 0);
        const cheat = e.attempts.reduce((s, a) => s + a.cheatViolationCount, 0);
        return {
          Deneme: e.title,
          Slug: e.slug,
          Tür: e.cadenceFamily,
          Sınıf: e.classLevel ?? "",
          Durum: e.status,
          Çözüm: n,
          Ort_Net: Math.round((sumScore / n) * 100) / 100,
          Ort_Doğru: Math.round((sumCorrect / n) * 10) / 10,
          Ort_Yanlış: Math.round((sumWrong / n) * 10) / 10,
          Ort_Boş: Math.round((sumBlank / n) * 10) / 10,
          Ort_Süre_dk: Math.round(sumDur / n / 60),
          Cheat_Toplam: cheat,
        };
      });
      return rowsToXlsxResponse(rows, "ODK Raporlar", `odk-raporlar-${today}.xlsx`);
    }
    default:
      return new Response("Bilinmeyen export tipi", { status: 404 });
  }
}
