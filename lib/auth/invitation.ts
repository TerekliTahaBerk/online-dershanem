import { createHash, randomBytes } from "node:crypto";

const INVITE_TTL_HOURS = 72;

export type UserInviteIssue = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueUserInvite(now = new Date()): UserInviteIssue {
  const token = randomBytes(24).toString("base64url");
  return {
    token,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(now.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000),
  };
}

export function issueInvitePlaceholderSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function resolveAppOrigin(fallbackFromRequest: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!envUrl) return fallbackFromRequest;
  try {
    return new URL(envUrl).origin;
  } catch {
    return fallbackFromRequest;
  }
}

export function buildInviteUrl(origin: string, token: string): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  return `${cleanOrigin}/davet?token=${encodeURIComponent(token)}`;
}

export function buildInviteMessage(input: {
  fullName?: string | null;
  email: string;
  inviteUrl: string;
  expiresAt: Date;
}): string {
  const formatter = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });

  return [
    `Merhaba${input.fullName ? ` ${input.fullName}` : ""},`,
    "",
    "Online Dershanem panel hesabınız için davet bağlantınız hazır.",
    "",
    `E-posta: ${input.email}`,
    `Davet bağlantısı: ${input.inviteUrl}`,
    `Son geçerlilik: ${formatter.format(input.expiresAt)}`,
    "",
    "Bağlantıyı açıp kendi parolanızı belirleyerek ilk girişinizi tamamlayabilirsiniz.",
  ].join("\n");
}
