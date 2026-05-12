import { NextRequest } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB
const ALLOWED_TYPES = ["BOOKLET_PDF", "ANSWER_KEY_PDF"] as const;
type FileType = (typeof ALLOWED_TYPES)[number];

/**
 * Multipart PDF upload — wizard'da deneme PDF'i / cevap anahtarı PDF'i.
 *
 * FormData:
 *   - file: File (application/pdf)
 *   - fileType: "BOOKLET_PDF" | "ANSWER_KEY_PDF"
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return apiErr("Blob storage yapılandırılmamış (BLOB_READ_WRITE_TOKEN eksik).", 500);
  }

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: { id: true, status: true, slug: true },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status === "ARCHIVED") {
    return apiErr("Arşivlenmiş denemeye dosya yüklenemez.", 409);
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return apiErr("Geçersiz form verisi.", 400); }

  const file = form.get("file");
  const fileTypeRaw = String(form.get("fileType") ?? "");
  if (!(file instanceof Blob)) return apiErr("Dosya gönderilmedi.", 400);
  if (!ALLOWED_TYPES.includes(fileTypeRaw as FileType)) {
    return apiErr("Geçersiz fileType.", 400);
  }
  const fileType = fileTypeRaw as FileType;

  if (file.size === 0) return apiErr("Dosya boş.", 400);
  if (file.size > MAX_BYTES) return apiErr("Dosya boyutu 30 MB'ı aşamaz.", 413);

  // İçerik tipi kontrolü
  const mime = (file as File).type || "";
  if (mime && !mime.includes("pdf")) {
    return apiErr("Yalnızca PDF dosyası kabul edilir.", 415);
  }
  const originalName = (file as File).name || `exam-${exam.slug}.pdf`;
  if (!originalName.toLowerCase().endsWith(".pdf")) {
    return apiErr("Yalnızca .pdf uzantılı dosya kabul edilir.", 415);
  }

  // Aynı tipte eski dosya varsa Blob'tan silmeye çalış (best effort)
  const previous = await prisma.odkExamFile.findUnique({
    where: { examId_fileType: { examId: id, fileType } },
  });

  // Vercel Blob'a yükle
  const pathname = `odk/exams/${exam.slug}/${fileType.toLowerCase()}-${Date.now()}.pdf`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });

  // DB upsert
  const saved = await prisma.odkExamFile.upsert({
    where: { examId_fileType: { examId: id, fileType } },
    create: {
      examId: id,
      fileType,
      originalFileName: originalName,
      publicUrl: blob.url,
      byteSize: file.size,
      uploadedById: auth.userId,
    },
    update: {
      originalFileName: originalName,
      publicUrl: blob.url,
      byteSize: file.size,
      uploadedById: auth.userId,
    },
  });

  if (previous && previous.publicUrl && previous.publicUrl !== blob.url) {
    try { await del(previous.publicUrl); } catch { /* best effort */ }
  }

  return apiOk({ file: saved });
}
