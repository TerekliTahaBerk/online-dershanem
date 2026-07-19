import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { learningMaterialAccessScope } from "@/lib/auth/resource-scopes";
import { logPrivateMaterialAccessed, logResourceAccessDenied } from "@/lib/security/resource-access-log";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN", "TEACHER", "STUDENT", "PARENT");
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const roleScope = learningMaterialAccessScope(auth.session.role, auth.session.userId);
  const material = await prisma.learningMaterial.findFirst({ where: { id, isActive: true, ...roleScope }, select: { blobPathname: true, fileName: true, mimeType: true } });
  if (!material?.blobPathname) {
    logResourceAccessDenied({ actorUserId: auth.session.userId, role: auth.session.role, resourceType: "LearningMaterial", resourceId: id, reason: material ? "missing_blob" : "outside_scope" });
    return NextResponse.json({ error: "Dosya bulunamadı veya erişim yetkiniz yok." }, { status: 404 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Dosya deposu kullanılamıyor." }, { status: 503 });

  const result = await get(material.blobPathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") || undefined });
  if (!result) return NextResponse.json({ error: "Dosya depoda bulunamadı." }, { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag } });
  logPrivateMaterialAccessed({ actorUserId: auth.session.userId, role: auth.session.role, materialId: id });
  const originalName = (material.fileName || "materyal").replace(/[\r\n"]/g, "_");
  const asciiName = originalName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_") || "materyal";
  return new NextResponse(result.stream, { headers: { "Content-Type": material.mimeType || result.blob.contentType || "application/octet-stream", "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`, "Content-Length": String(result.blob.size), "Cache-Control": "private, no-cache", ETag: result.blob.etag, "X-Content-Type-Options": "nosniff" } });
}
