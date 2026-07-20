import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";

export async function GET(request: Request, context: { params: Promise<{ fileId: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Dosya deposu kullanılamıyor." }, { status: 503 });
  const { fileId } = await context.params;
  const file = await prisma.odkExamFile.findUnique({ where: { id: fileId }, select: { blobPathname: true, fileName: true, mimeType: true } });
  if (!file) return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  const result = await get(file.blobPathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") || undefined });
  if (!result) return NextResponse.json({ error: "Dosya depoda bulunamadı." }, { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag } });
  const name = file.fileName.replace(/[\r\n"]/g, "_");
  return new NextResponse(result.stream, { headers: { "Content-Type": file.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control": "private, no-cache", ETag: result.blob.etag, "X-Content-Type-Options": "nosniff" } });
}
