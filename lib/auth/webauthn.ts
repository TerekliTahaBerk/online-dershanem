import "server-only";

import { generateAuthenticationOptions, generateRegistrationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import type { MfaChallengePurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashMfaValue } from "@/lib/auth/mfa-crypto";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function webAuthnConfig() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const origin = new URL(raw).origin;
  return { origin, rpID: new URL(origin).hostname, rpName: "Online Dershanem" };
}

async function saveChallenge(input: { userId: string; sessionId: string; purpose: MfaChallengePurpose; challenge: string }) {
  await prisma.mfaChallenge.updateMany({
    where: { userId: input.userId, sessionId: input.sessionId, purpose: input.purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return prisma.mfaChallenge.create({ data: { userId: input.userId, sessionId: input.sessionId, purpose: input.purpose, challengeHash: hashMfaValue(input.challenge), expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) } });
}

export async function registrationOptions(input: { userId: string; sessionId: string; email: string; fullName: string | null }) {
  const { rpID, rpName } = webAuthnConfig();
  const credentials = await prisma.passkeyCredential.findMany({ where: { userId: input.userId, revokedAt: null } });
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(input.userId, "utf8"),
    userName: input.email,
    userDisplayName: input.fullName || input.email,
    attestationType: "none",
    excludeCredentials: credentials.map((credential) => ({ id: credential.credentialId, transports: credential.transports as AuthenticatorTransportFuture[] })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    supportedAlgorithmIDs: [-7, -257],
  });
  const challenge = await saveChallenge({ userId: input.userId, sessionId: input.sessionId, purpose: "PASSKEY_ENROLLMENT", challenge: options.challenge });
  return { options, challengeId: challenge.id };
}

export async function authenticationOptions(input: { userId: string; sessionId: string; purpose: "MFA_AUTHENTICATION" | "STEP_UP" }) {
  const { rpID } = webAuthnConfig();
  const credentials = await prisma.passkeyCredential.findMany({ where: { userId: input.userId, revokedAt: null } });
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: credentials.map((credential) => ({ id: credential.credentialId, transports: credential.transports as AuthenticatorTransportFuture[] })),
  });
  const challenge = await saveChallenge({ userId: input.userId, sessionId: input.sessionId, purpose: input.purpose, challenge: options.challenge });
  return { options, challengeId: challenge.id };
}

export async function loadChallenge(input: { challengeId: string; userId: string; sessionId: string; purpose: MfaChallengePurpose }) {
  return prisma.mfaChallenge.findFirst({ where: { id: input.challengeId, userId: input.userId, sessionId: input.sessionId, purpose: input.purpose, consumedAt: null, expiresAt: { gt: new Date() } } });
}

export function challengeMatches(expectedHash: string) {
  return (candidate: string) => hashMfaValue(candidate) === expectedHash;
}

export async function consumeChallenge(id: string): Promise<boolean> {
  const result = await prisma.mfaChallenge.updateMany({ where: { id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
  return result.count === 1;
}
