"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Button } from "@/components/od/ui/button";
import { Badge } from "@/components/od/ui/badge";
import { Input, Label } from "@/components/od/ui/input";
import {
  linkParentStudentAction,
  unlinkParentStudentAction,
} from "@/lib/services/parents/actions";

type StudentLink = {
  studentId: string;
  studentName: string;
  studentStatus: string;
  relationship: string | null;
  isPrimary: boolean;
};

type StudentOption = { id: string; fullName: string };

export function ParentStudentsManager({
  parentId,
  links,
  studentOptions,
}: {
  parentId: string;
  links: StudentLink[];
  studentOptions: StudentOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [filter, setFilter] = useState("");

  const linkedIds = new Set(links.map((l) => l.studentId));
  const available = studentOptions
    .filter((s) => !linkedIds.has(s.id))
    .filter((s) => (filter ? s.fullName.toLowerCase().includes(filter.toLowerCase()) : true))
    .slice(0, 50);

  function add() {
    if (!selected) {
      toast.error("Önce öğrenci seçin");
      return;
    }
    startTransition(async () => {
      const r = await linkParentStudentAction({
        parentId,
        studentId: selected,
        relationship: relationship || null,
        isPrimary,
      });
      if (r.ok) {
        toast.success("Bağlandı");
        setSelected("");
        setRelationship("");
        setIsPrimary(false);
        router.refresh();
      } else {
        toast.error((r.error as any).message ?? "Hata");
      }
    });
  }

  function remove(studentId: string) {
    startTransition(async () => {
      const r = await unlinkParentStudentAction({ parentId, studentId });
      if (r.ok) {
        toast.success("Bağ kaldırıldı");
        router.refresh();
      } else {
        toast.error((r.error as any).message ?? "Hata");
      }
    });
  }

  return (
    <div className="space-y-od-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <UserPlus className="h-4 w-4 text-pastel-sky-ink" /> Öğrenci Bağla
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-od-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Öğrenci Ara</Label>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Ad ile ara…"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Öğrenci</Label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-1 h-10 w-full rounded-od border border-od-border bg-od-surface px-od-2"
            >
              <option value="">— seçin —</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
            {available.length === 0 && filter && (
              <p className="mt-1 text-od-tiny text-od-mute">Eşleşme yok.</p>
            )}
          </div>
          <div>
            <Label>İlişki</Label>
            <Input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Anne, Baba, Vasi…"
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-od-2 text-od-body">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-od-border"
              />
              Birincil iletişim
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={add} variant="primary" disabled={pending || !selected}>
              <Plus className="mr-1 h-4 w-4" /> Bağla
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bağlı Öğrenciler ({links.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border p-0">
          {links.length === 0 && (
            <p className="p-od-3 text-od-tiny text-od-mute">Henüz bağlı öğrenci yok.</p>
          )}
          {links.map((l) => (
            <div key={l.studentId} className="flex items-center justify-between p-od-3">
              <div>
                <div className="font-medium text-od-body">{l.studentName}</div>
                <div className="text-od-tiny text-od-mute">
                  {l.relationship ?? "—"} {l.isPrimary && "· Birincil"}
                </div>
              </div>
              <div className="flex items-center gap-od-2">
                <Badge tone={l.studentStatus === "ACTIVE" ? "mint" : "blush"}>{l.studentStatus}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(l.studentId)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4 text-pastel-blush-ink" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
