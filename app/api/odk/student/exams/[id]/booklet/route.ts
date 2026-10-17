import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { getActiveOdkExamGrant } from "@/lib/odk/product-contract-server";
import { loadStudentBookletFile } from "@/lib/odk/student-booklet-server";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Dosya deposuna şu an ulaşılamıyor. Lütfen biraz sonra tekrar deneyin." }, { status: 503 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  if (!(await getActiveOdkExamGrant(auth.session.userId, id))) return NextResponse.json({ error: "Bu deneme için aktif paket erişiminiz yok." }, { status: 403 });
  // Oturumlu sınavda yalnız açık oturumun kitapçığı; arada ve bitişte hiçbiri (P1-1).
  const booklet = await loadStudentBookletFile(id, auth.session.userId);
  if (!booklet.ok) {
    const error = booklet.code === "SESSION_BREAK" ? "Oturum arası: kitapçık sıradaki oturumda açılır." : booklet.code === "SESSION_FINISHED" ? "Oturumlar tamamlandı." : "Aktif sınav kitapçığı şu an görünmüyor.";
    return NextResponse.json({ error, code: booklet.code }, { status: booklet.status });
  }
  const file = booklet.file;
  const result = await get(file.blobPathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") || undefined });
  if (!result) return NextResponse.json({ error: "Kitapçık dosyası bulunamadı; kaldırılmış ya da değişmiş olabilir." }, { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag } });
  const name = file.fileName.replace(/[\r\n"]/g, "_");
  return new NextResponse(result.stream, { headers: { "Content-Type": file.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control": "private, no-store", ETag: result.blob.etag, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'" } });
}
