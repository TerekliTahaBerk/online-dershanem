import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { ParentForm } from "../_components/parent-form";
import { createParent } from "../actions";

export default async function YeniVeliPage() {
  await requireAdmin();
  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/admin/veliler" className="pd-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Veliler
          </Link>
          <h1 className="pd-page-title">Yeni Veli</h1>
        </div>
      </div>
      <ParentForm action={createParent} mode="create" />
    </div>
  );
}
