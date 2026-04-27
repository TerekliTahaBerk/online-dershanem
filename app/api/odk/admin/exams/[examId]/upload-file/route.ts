import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";

// Direct client upload pattern: the browser uploads the PDF straight to Vercel
// Blob storage, bypassing the 4.5MB Next.js route handler body limit. This
// endpoint only signs the upload token and persists the resulting URL.

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

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { id: true },
  });
  if (!exam) {
    return NextResponse.json({ error: "Sınav bulunamadı" }, { status: 404 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? (JSON.parse(clientPayload) as { fileType?: string }) : null;
        const fileType = payload?.fileType;
        if (!fileType || !["BOOKLET_PDF", "ANSWER_KEY_PDF"].includes(fileType)) {
          throw new Error("Geçersiz fileType");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB cap
          tokenPayload: JSON.stringify({ examId, fileType }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;
        const parsed = JSON.parse(tokenPayload) as { examId: string; fileType: string };
        await prisma.odkExamFile.upsert({
          where: {
            examId_fileType: {
              examId: parsed.examId,
              fileType: parsed.fileType as "BOOKLET_PDF" | "ANSWER_KEY_PDF",
            },
          },
          create: {
            examId: parsed.examId,
            fileType: parsed.fileType as "BOOKLET_PDF" | "ANSWER_KEY_PDF",
            publicUrl: blob.url,
            originalFileName: blob.pathname.split("/").pop() ?? "uploaded.pdf",
            byteSize: 0,
          },
          update: {
            publicUrl: blob.url,
            originalFileName: blob.pathname.split("/").pop() ?? "uploaded.pdf",
          },
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yükleme imzalanamadı" },
      { status: 400 },
    );
  }
}
