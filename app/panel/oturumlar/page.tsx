import { SessionManager } from "@/components/panel/session-manager";
import { requireSession } from "@/lib/auth/guards";
import { listActiveUserSessions } from "@/lib/auth/session";
import { SESSION_POLICIES, formatPolicyDuration } from "@/lib/auth/session-policy";

export default async function SessionsPage() {
  const session = await requireSession();
  const activeSessions = await listActiveUserSessions(session.userId, session.role);
  const policy = SESSION_POLICIES[session.role];
  return <main className="mx-auto max-w-3xl">
    <header className="mb-7">
      <p className="text-sm font-bold uppercase tracking-wider text-[var(--brand-olive)]">Hesap güvenliği</p>
      <h1 className="mt-2 text-3xl font-black text-[var(--site-ink)]">Aktif oturumlar</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--site-body)]">Bu hesap {formatPolicyDuration(policy.idleTimeoutMs)} kullanılmadığında veya en geç {formatPolicyDuration(policy.absoluteTtlMs)} sonunda yeniden giriş ister. MFA ve adım yükseltme bu süreleri uzatmaz.</p>
    </header>
    <SessionManager sessions={activeSessions.map((item) => ({ id: item.id, current: item.id === session.sessionId, createdAt: item.createdAt.toISOString(), lastSeenAt: item.lastSeenAt.toISOString(), expiresAt: item.expiresAt.toISOString(), userAgent: item.userAgent, ip: item.ip }))} />
  </main>;
}
