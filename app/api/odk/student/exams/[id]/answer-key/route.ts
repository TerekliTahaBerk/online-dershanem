import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { getActiveOdkExamGrant } from "@/lib/odk/product-contract-server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Dosya deposu kullanılamıyor." }, { status: 503 });
  const { id } = await context.params;
  const grant = await getActiveOdkExamGrant(auth.session.userId, id);
  const releasedAt = grant?.exam.answerKeyReleasedAt ? new Date(grant.exam.answerKeyReleasedAt) : null;
  if (!grant || !grant.contract.policy.rights.studentReports || !releasedAt || releasedAt > new Date()) return NextResponse.json({ error: "Cevap anahtarı henüz erişime açık değil." }, { status: 404 });
  const exam = await prisma.odkExam.findFirst({ where: { id, status: "RELEASED", attempts: { some: { studentUserId: auth.session.userId, score: { isNot: null } } } }, select: { currentVersion: { select: { files: { where: { type: "ANSWER_KEY_PDF" }, take: 1, select: { blobPathname: true, fileName: true, mimeType: true } } } } } });
  const file = exam?.currentVersion?.files[0];
  if (!file) return NextResponse.json({ error: "Cevap anahtarı PDF'i bulunamadı." }, { status: 404 });
  const result = await get(file.blobPathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") || undefined });
  if (!result) return NextResponse.json({ error: "Cevap anahtarı dosyası bulunamadı." }, { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag } });
  const name = file.fileName.replace(/[\r\n"]/g, "_");
  return new NextResponse(result.stream, { headers: { "Content-Type": file.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control": "private, no-store", ETag: result.blob.etag, "X-Content-Type-Options": "nosniff" } });
}
