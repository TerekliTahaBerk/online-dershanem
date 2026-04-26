import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createMobileToken } from "@/lib/mobile-auth";
import { credentialsSchema } from "@/lib/validators";
import { ensureUserAccessLinksByEmail } from "@/lib/user-links";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await ensureUserAccessLinksByEmail(user.id, user.email, user.role);

  const token = createMobileToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return Response.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

