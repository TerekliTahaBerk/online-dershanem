import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { ImportWizard } from "./import-wizard";
import type { ImportEntity } from "@/lib/panel/imports";

export const dynamic = "force-dynamic";

const ALLOWED: ReadonlySet<string> = new Set(["students", "parents", "teachers"]);

type SP = Record<string, string | string[] | undefined>;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePanelRole("admin");

  const sp = await searchParams;
  const raw = Array.isArray(sp.entity) ? sp.entity[0] : sp.entity;
  const initialEntity: ImportEntity | undefined =
    raw && ALLOWED.has(raw) ? (raw as ImportEntity) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="İçe Aktar"
        subtitle="Öğrenci / Veli / Öğretmen kayıtlarını CSV ile toplu yükle. Her zaman önce dry-run, sonra onayla."
        breadcrumbs={[
          { label: "Panel", href: "/panel/admin" },
          { label: "İçe Aktar" },
        ]}
      />
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <strong>Güvenlik notu:</strong> CSV'de şifre veya davet token'ı olmamalı. Hesap modu için
        sadece <code>none</code> / <code>invite</code> / <code>disabled</code> kabul edilir.
        Tüm yazma işlemleri AuditLog'a düşer.
      </div>
      <ImportWizard initialEntity={initialEntity} />
    </div>
  );
}
