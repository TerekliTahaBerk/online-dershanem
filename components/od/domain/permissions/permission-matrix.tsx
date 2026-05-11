"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Input } from "@/components/od/ui/input";
import { toggleRolePermission } from "@/lib/services/permissions/mutations";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

type Permission = {
  id: string;
  key: string;
  category: string;
  description: string | null;
};

type Props = {
  permissions: Permission[];
  /** "ROLE::permissionId" set */
  granted: string[];
};

const ROLES = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;

const ROLE_TONE: Record<string, "lavender" | "sky" | "mint" | "yellow"> = {
  ADMIN: "lavender",
  TEACHER: "sky",
  STUDENT: "mint",
  PARENT: "yellow",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TEACHER: "Öğretmen",
  STUDENT: "Öğrenci",
  PARENT: "Veli",
};

export function PermissionMatrix({ permissions, granted }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [grantedSet, setGrantedSet] = useState(new Set(granted));

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return permissions;
    return permissions.filter(
      (p) =>
        p.key.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [permissions, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of filtered) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function isGranted(role: string, pid: string) {
    return grantedSet.has(`${role}::${pid}`);
  }

  function toggle(role: (typeof ROLES)[number], perm: Permission) {
    if (role === "ADMIN") {
      toast.error("ADMIN tüm izinlere sahiptir, değiştirilemez.");
      return;
    }
    const key = `${role}::${perm.id}`;
    const next = !grantedSet.has(key);
    const updated = new Set(grantedSet);
    next ? updated.add(key) : updated.delete(key);
    setGrantedSet(updated);

    startTransition(async () => {
      const res = await toggleRolePermission({
        role,
        permissionKey: perm.key,
        granted: next,
      });
      if (res.ok) {
        toast.success(`${ROLE_LABEL[role]} · ${perm.key} ${next ? "verildi" : "kaldırıldı"}`);
        router.refresh();
      } else {
        // rollback
        setGrantedSet(grantedSet);
        toast.error(res.error.message);
      }
    });
  }

  return (
    <div className="space-y-od-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-od-3 py-od-3">
          <Search className="h-4 w-4 text-od-mute" />
          <Input
            type="search"
            placeholder="İzin / kategori ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm flex-1"
          />
          <div className="ml-auto flex items-center gap-od-2 text-od-tiny text-od-mute">
            <ShieldCheck className="h-3.5 w-3.5 text-pastel-mint-ink" /> Verilmiş
            <ShieldOff className="ml-2 h-3.5 w-3.5 text-pastel-blush-ink" /> Verilmemiş
          </div>
        </CardContent>
      </Card>

      {grouped.map(([category, perms]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <Badge tone="lavender">{category}</Badge>
              <span className="text-od-mute">{perms.length} izin</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-od-small">
              <thead>
                <tr className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase tracking-wider text-od-mute">
                  <th className="px-od-4 py-od-2 font-medium">İzin</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-od-3 py-od-2 text-center font-medium">
                      <Badge tone={ROLE_TONE[r]}>{ROLE_LABEL[r]}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-od-border/60 transition-colors hover:bg-od-subtle"
                  >
                    <td className="px-od-4 py-od-2">
                      <code className="font-mono text-od-ink">{p.key}</code>
                      {p.description && (
                        <p className="mt-0.5 text-od-tiny text-od-mute">{p.description}</p>
                      )}
                    </td>
                    {ROLES.map((r) => {
                      const on = isGranted(r, p.id) || r === "ADMIN";
                      return (
                        <td key={r} className="px-od-3 py-od-2 text-center">
                          <button
                            type="button"
                            disabled={pending || r === "ADMIN"}
                            onClick={() => toggle(r, p)}
                            className={cn(
                              "inline-flex h-7 w-12 items-center justify-center rounded-full border transition-all",
                              on
                                ? "border-pastel-mint-ink/30 bg-pastel-mint-soft text-pastel-mint-ink"
                                : "border-od-border bg-od-subtle text-od-mute",
                              r === "ADMIN" && "cursor-not-allowed opacity-70",
                              !pending && r !== "ADMIN" && "hover:scale-105 cursor-pointer",
                            )}
                            aria-label={`${ROLE_LABEL[r]} - ${p.key} - ${on ? "ver" : "kaldır"}`}
                          >
                            {on ? (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldOff className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
