/**
 * Phase 2 / Session 11 — New payroll period form.
 */
import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { createPayrollPeriodAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function AdminNewPayrollPeriodPage() {
  await requirePanelRole("admin");
  // Default range: previous calendar month.
  const now = new Date();
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const titleDefault = firstPrevMonth
    .toLocaleDateString("tr-TR", { year: "numeric", month: "long" });

  function fmt(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yeni Bordro Dönemi"
        subtitle="Dönem oluşturulduktan sonra Hakedişleri Üret butonu ile uygun dersler tarandığı esnada dakikadan tutar hesaplanır."
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmen Hakedişleri", href: "/panel/admin/ogretmen-hakedisleri" },
          { label: "Yeni Dönem" },
        ]}
        right={
          <Link
            href="/panel/admin/ogretmen-hakedisleri"
            className="od-btn ghost sm"
          >
            ← Hakediş Hub
          </Link>
        }
      />

      <form
        action={createPayrollPeriodAction}
        className="od-form-card od-form-grid"
        style={{ maxWidth: 720 }}
      >
        <label className="full">
          <span>Başlık *</span>
          <input
            name="title"
            required
            defaultValue={titleDefault}
          />
        </label>
        <label>
          <span>Başlangıç *</span>
          <input
            type="date"
            name="startsAt"
            required
            defaultValue={fmt(firstPrevMonth)}
          />
        </label>
        <label>
          <span>Bitiş *</span>
          <input
            type="date"
            name="endsAt"
            required
            defaultValue={fmt(firstThisMonth)}
          />
        </label>
        <label className="full">
          <span>Not</span>
          <textarea
            name="note"
            rows={2}
          />
        </label>
        <div className="full">
          <button type="submit" className="od-btn dark sm">
            Dönemi Oluştur
          </button>
        </div>
      </form>
    </div>
  );
}
