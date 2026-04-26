import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type MobileTokenPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "STUDENT" | "TEACHER";
  name?: string | null;
  exp: number;
};

const encoder = new TextEncoder();

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signPart(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for mobile auth");
  }
  return secret;
}

export function createMobileToken(payload: Omit<MobileTokenPayload, "exp">) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    })
  );
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${signPart(unsigned, getSecret())}`;
}

export function decodeMobileToken(token: string): MobileTokenPayload | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;

  const unsigned = `${header}.${body}`;
  const expected = signPart(unsigned, getSecret());
  const expectedBytes = encoder.encode(expected);
  const actualBytes = encoder.encode(signature);
  if (expectedBytes.length !== actualBytes.length || !crypto.timingSafeEqual(expectedBytes, actualBytes)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MobileTokenPayload;
  if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function getMobileUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) return null;

  const payload = decodeMobileToken(token);
  if (!payload) return null;

  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      student: { select: { id: true } },
      teacher: { select: { id: true } },
    },
  });
}

export function unauthorized() {
  return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

