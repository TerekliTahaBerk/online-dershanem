/**
 * Phase 2 / Session 11 — Compensation rules CRUD page.
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { getTeacherCompensationRules } from "@/lib/panel/teacher-payroll";
import { CompensationRuleForm } from "@/components/panel/admin/finance/compensation-rule-form";
import { CompensationRuleTable } from "@/components/panel/admin/finance/compensation-rule-table";

export const dynamic = "force-dynamic";

export default async function AdminCompensationRulesPage() {
  await requirePanelRole("admin");

  const [rules, teachers, courses, classrooms] = await Promise.all([
    getTeacherCompensationRules(),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.classroom.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <header>
        <Link
          href="/panel/admin/ogretmen-hakedisleri"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Hakediş Hub
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Saatlik Ücret Kuralları
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Bir öğretmen için <strong>(öğretmen, ders, sınıf)</strong> üçlüsünden
          en spesifik aktif kural uygulanır. Eşleşme yoksa hesaplama
          ücret-eksik olarak işaretlenir; sistem tahmin yapmaz.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Yeni Kural</h2>
          <CompensationRuleForm
            options={{ teachers, courses, classrooms }}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Tanımlı Kurallar ({rules.length})
          </h2>
          <CompensationRuleTable rows={rules} />
        </div>
      </section>
    </div>
  );
}
