import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARENT" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: auth.userId },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true, fullName: true, classLevel: true, status: true,
              email: true, phone: true,
            },
          },
        },
      },
    },
  });
  if (!parent) return jsonError(404, "PARENT_NOT_FOUND", "Veli kaydı yok.");

  return NextResponse.json({
    data: parent.students.map((s) => ({
      id: s.student.id,
      fullName: s.student.fullName,
      classLevel: s.student.classLevel,
      status: s.student.status,
      email: s.student.email,
      phone: s.student.phone,
      relationship: s.relationship,
      isPrimary: s.isPrimary,
    })),
  });
}
