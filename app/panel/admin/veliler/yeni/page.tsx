/**
 * Phase 3 / Session 3 — D2: Parent Creation Wizard page.
 * Server shell — delegates the form/state to the client wizard.
 */
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { ParentCreateWizard } from "@/components/panel/parents/parent-create-wizard";

export const dynamic = "force-dynamic";

export default async function NewParent() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader
        title="Yeni veli"
        breadcrumbs={[
          { label: "Admin", href: "/panel/admin" },
          { label: "Veliler", href: "/panel/admin/veliler" },
          { label: "Yeni" },
        ]}
        subtitle="Kimlik · hesap erisimi · ogrenci baglantisi tek seferde."
      />
      <ParentCreateWizard />
    </>
  );
}
