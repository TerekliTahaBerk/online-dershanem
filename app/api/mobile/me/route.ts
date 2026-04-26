import { NextRequest } from "next/server";
import { getMobileUser, unauthorized } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasStudentAccess: user.role === "STUDENT" || Boolean(user.student),
      hasTeacherAccess: user.role === "TEACHER" || Boolean(user.teacher),
      isAdmin: user.role === "ADMIN",
    },
  });
}

