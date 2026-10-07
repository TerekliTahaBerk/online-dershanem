import { SessionManager } from "@/components/panel/session-manager";
import { requireSession } from "@/lib/auth/guards";
import { listActiveUserSessions } from "@/lib/auth/session";
import {
  SESSION_POLICIES,
  formatPolicyDuration,
} from "@/lib/auth/session-policy";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export default async function SessionsPage() {
  const session = await requireSession();
  const activeSessions = await listActiveUserSessions(
    session.userId,
    session.role,
  );
  const policy = SESSION_POLICIES[session.role];
  return (
    <main className="mx-auto max-w-3xl">
      <header className="mb-7">
        <p className={PAGE_EYEBROW_CLASS}>
          Hesap güvenliği
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Aktif oturumlar
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Bu hesap {formatPolicyDuration(policy.idleTimeoutMs)}{" "}
          kullanılmadığında veya en geç{" "}
          {formatPolicyDuration(policy.absoluteTtlMs)} sonunda yeniden giriş
          ister. MFA ve adım yükseltme bu süreleri uzatmaz.
        </p>
      </header>
      <SessionManager
        sessions={activeSessions.map((item) => ({
          id: item.id,
          current: item.id === session.sessionId,
          createdAt: item.createdAt.toISOString(),
          lastSeenAt: item.lastSeenAt.toISOString(),
          expiresAt: item.expiresAt.toISOString(),
          userAgent: item.userAgent,
          ip: item.ip,
        }))}
      />
    </main>
  );
}
