import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);
  if (!session || !access.hasAdminPanel) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const { examId } = await params;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const fileType = formData.get("fileType") as string | null;

  if (!file || !fileType || !["BOOKLET_PDF", "ANSWER_KEY_PDF"].includes(fileType)) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  if (!file.type.includes("pdf")) {
    return NextResponse.json({ error: "Yalnızca PDF yüklenebilir" }, { status: 400 });
  }

  const filename = `odk/exams/${examId}/${fileType === "BOOKLET_PDF" ? "kitapcik" : "cevap-anahtari"}-${Date.now()}.pdf`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: "application/pdf",
  });

  await prisma.odkExamFile.upsert({
    where: { examId_fileType: { examId, fileType: fileType as "BOOKLET_PDF" | "ANSWER_KEY_PDF" } },
    create: {
      examId,
      fileType: fileType as "BOOKLET_PDF" | "ANSWER_KEY_PDF",
      publicUrl: blob.url,
      originalFileName: file.name,
      byteSize: file.size,
    },
    update: {
      publicUrl: blob.url,
      originalFileName: file.name,
      byteSize: file.size,
    },
  });

  return NextResponse.json({ url: blob.url });
}
