import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExamCreateForm } from "@/components/odk/admin/exam-create-form";

export default function YeniSinavPage() {
  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <Link
          href="/odk/admin/sinavlar"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Sınavlara dön
        </Link>
        <h1 className="text-xl font-semibold text-stone-900">Yeni Sınav Oluştur</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Sınav bilgilerini ve bölümlerini tanımla. Cevap anahtarını ve PDF dosyalarını sonradan ekleyebilirsin.
        </p>
      </div>

      <ExamCreateForm />
    </div>
  );
}
