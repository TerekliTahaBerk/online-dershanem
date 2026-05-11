import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Activity, ShieldAlert, Clock, Hash } from "lucide-react";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function categorize(key: string): { kind: string; tone: "mint" | "blush" | "sky" | "yellow" | "lavender" | "neutral" } {
  if (key.startsWith("login:")) return { kind: "Login", tone: "blush" };
  if (key.startsWith("password-reset:")) return { kind: "Şifre sıfırlama", tone: "yellow" };
  if (key.startsWith("contact:") || key.startsWith("form:")) return { kind: "Form", tone: "sky" };
  if (key.startsWith("api:")) return { kind: "API", tone: "lavender" };
  if (key.startsWith("upload:")) return { kind: "Upload", tone: "mint" };
  return { kind: "Diğer", tone: "neutral" };
}

export default async function RateLimitDashboardPage() {
  await requirePagePermission("settings.read");

  const since1h = new Date(Date.now() - HOUR);
  const since24h = new Date(Date.now() - DAY);

  const [grouped1h, grouped24h, totalAll] = await Promise.all([
    prisma.rateLimitEntry.groupBy({
      by: ["key"],
      where: { createdAt: { gte: since1h } },
      _count: { _all: true },
      orderBy: { _count: { key: "desc" } },
      take: 100,
    }),
    prisma.rateLimitEntry.groupBy({
      by: ["key"],
      where: { createdAt: { gte: since24h } },
      _count: { _all: true },
    }),
    prisma.rateLimitEntry.count(),
  ]);

  const total1h = grouped1h.reduce((a, r) => a + r._count._all, 0);
  const total24h = grouped24h.reduce((a, r) => a + r._count._all, 0);
  const uniqueKeys24h = grouped24h.length;
  const top = grouped1h.slice(0, 30);

  // Kategoriye göre grupla (24h)
  const byCat = new Map<string, number>();
  for (const r of grouped24h) {
    const c = categorize(r.key).kind;
    byCat.set(c, (byCat.get(c) ?? 0) + r._count._all);
  }
  const catList = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-od-3">
      <div>
        <h1 className="font-display text-2xl">Rate Limit Dashboard</h1>
        <p className="text-od-ink-3 text-sm">
          Son 24 saatteki API throttle aktivitesi. Kayıtlar `RateLimitEntry` tablosundan toplanır.
        </p>
      </div>

      {/* KPI */}
      <div className="grid gap-od-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="py-od-3 flex items-center gap-3">
          <Activity className="h-5 w-5 text-od-mint-600" />
          <div><div className="text-xs text-od-ink-3">Son 1 saat</div><div className="font-display text-lg">{total1h.toLocaleString("tr-TR")}</div></div>
        </CardContent></Card>
        <Card><CardContent className="py-od-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-od-sky-600" />
          <div><div className="text-xs text-od-ink-3">Son 24 saat</div><div className="font-display text-lg">{total24h.toLocaleString("tr-TR")}</div></div>
        </CardContent></Card>
        <Card><CardContent className="py-od-3 flex items-center gap-3">
          <Hash className="h-5 w-5 text-od-lavender-600" />
          <div><div className="text-xs text-od-ink-3">Tekil anahtar (24h)</div><div className="font-display text-lg">{uniqueKeys24h.toLocaleString("tr-TR")}</div></div>
        </CardContent></Card>
        <Card><CardContent className="py-od-3 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-od-blush-600" />
          <div><div className="text-xs text-od-ink-3">Toplam (tüm zaman)</div><div className="font-display text-lg">{totalAll.toLocaleString("tr-TR")}</div></div>
        </CardContent></Card>
      </div>

      {/* Kategori dağılımı */}
      <Card>
        <CardHeader>
          <CardTitle>Kategori dağılımı (24h)</CardTitle>
          <CardDescription>Anahtar prefix'ine göre gruplanmış toplam rate-limit denemeleri.</CardDescription>
        </CardHeader>
        <CardContent className="py-od-3">
          {catList.length === 0 ? (
            <p className="text-sm text-od-ink-3">Son 24 saatte rate-limit kaydı yok.</p>
          ) : (
            <div className="space-y-2">
              {catList.map(([cat, n]) => {
                const pct = total24h > 0 ? Math.round((n / total24h) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="text-od-ink-3">{n.toLocaleString("tr-TR")} · {pct}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-od-surface-2 overflow-hidden">
                      <div className="h-full bg-od-mint-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top anahtarlar */}
      <Card>
        <CardHeader>
          <CardTitle>En aktif anahtarlar (son 1 saat)</CardTitle>
          <CardDescription>İlk 30 anahtar — aşırı görünenler suistimal/saldırı belirtisi olabilir.</CardDescription>
        </CardHeader>
        <CardContent className="py-od-3">
          {top.length === 0 ? (
            <p className="text-sm text-od-ink-3">Son 1 saatte rate-limit kaydı yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-od-border text-left text-xs text-od-ink-3 uppercase">
                  <tr>
                    <th className="py-2 pr-4">Anahtar</th>
                    <th className="py-2 pr-4">Kategori</th>
                    <th className="py-2 text-right">Sayı</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r) => {
                    const cat = categorize(r.key);
                    return (
                      <tr key={r.key} className="border-b border-od-border/60 last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{r.key}</td>
                        <td className="py-2 pr-4"><Badge tone={cat.tone}>{cat.kind}</Badge></td>
                        <td className="py-2 text-right font-mono">{r._count._all.toLocaleString("tr-TR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
