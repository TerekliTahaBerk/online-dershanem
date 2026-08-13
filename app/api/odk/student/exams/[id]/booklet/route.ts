import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { getActiveOdkExamGrant } from "@/lib/odk/product-contract-server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Dosya deposu kullanılamıyor." }, { status: 503 });
  const { id } = await context.params;
  if (!(await getActiveOdkExamGrant(auth.session.userId, id))) return NextResponse.json({ error: "Bu deneme için aktif paket erişiminiz yok." }, { status: 403 });
  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { examId: id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { gt: new Date() } },
    orderBy: { attemptNumber: "desc" },
    select: { version: { select: { files: { where: { type: "BOOKLET_PDF" }, take: 1, select: { blobPathname: true, fileName: true, mimeType: true } } } } },
  });
  const file = attempt?.version.files[0];
  if (!file) return NextResponse.json({ error: "Aktif sınav kitapçığı bulunamadı." }, { status: 404 });
  const result = await get(file.blobPathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") || undefined });
  if (!result) return NextResponse.json({ error: "Kitapçık dosyası bulunamadı." }, { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag } });
  const name = file.fileName.replace(/[\r\n"]/g, "_");
  return new NextResponse(result.stream, { headers: { "Content-Type": file.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control": "private, no-store", ETag: result.blob.etag, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'" } });
}
