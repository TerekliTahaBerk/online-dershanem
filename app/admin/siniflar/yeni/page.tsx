import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { ClassroomForm } from "../_components/classroom-form";
import { createClassroom } from "../actions";

export default async function YeniSinifPage() {
  await requireAdmin();
  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/admin/siniflar" className="pd-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Sınıflar
          </Link>
          <h1 className="pd-page-title">Yeni Sınıf</h1>
        </div>
      </div>
      <ClassroomForm action={createClassroom} mode="create" />
    </div>
  );
}
