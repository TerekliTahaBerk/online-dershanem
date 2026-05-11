"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Input, Textarea, Label } from "@/components/od/ui/input";
import { broadcastInbox } from "@/lib/services/inbox/mutations";
import { toast } from "sonner";

const ROLES = [
  { value: "ALL", label: "Tüm kullanıcılar" },
  { value: "STUDENT", label: "Öğrenciler" },
  { value: "PARENT", label: "Veliler" },
  { value: "TEACHER", label: "Öğretmenler" },
  { value: "ADMIN", label: "Yöneticiler" },
];

const CATEGORIES = [
  { value: "ANNOUNCEMENT", label: "Duyuru" },
  { value: "SYSTEM", label: "Sistem" },
  { value: "EDUCATION", label: "Eğitim" },
  { value: "FINANCE", label: "Finans" },
];

const PRIORITIES = [
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "Yüksek" },
  { value: "URGENT", label: "Acil" },
  { value: "LOW", label: "Düşük" },
];

export function BroadcastForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    recipientRole: "ALL" as const,
    category: "ANNOUNCEMENT" as const,
    priority: "NORMAL" as const,
    title: "",
    body: "",
    href: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await broadcastInbox({
        recipientRole: form.recipientRole,
        category: form.category,
        priority: form.priority,
        title: form.title,
        body: form.body,
        ...(form.href ? { href: form.href } : {}),
      } as any);

      if (res.ok) {
        toast.success(`${res.data.count} kişiye gönderildi`);
        router.push("/v2/admin/inbox");
      } else if (res.error.code === "VALIDATION") {
        toast.error("Form geçersiz: " + Object.keys(res.error.fields).join(", "));
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-od-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <Megaphone className="h-5 w-5 text-od-accent" /> Duyuru / Toplu Mesaj
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-od-4">
          <div className="grid gap-od-3 sm:grid-cols-3">
            <div>
              <Label>Alıcı</Label>
              <select
                value={form.recipientRole}
                onChange={(e) => set("recipientRole", e.target.value as any)}
                className="mt-1 h-10 w-full rounded-od border border-od-border bg-od-surface px-od-2 text-od-body"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Kategori</Label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value as any)}
                className="mt-1 h-10 w-full rounded-od border border-od-border bg-od-surface px-od-2 text-od-body"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Öncelik</Label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as any)}
                className="mt-1 h-10 w-full rounded-od border border-od-border bg-od-surface px-od-2 text-od-body"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Başlık *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              minLength={2}
              maxLength={200}
              className="mt-1"
              placeholder="Örn. Hafta sonu deneme sınavı"
            />
          </div>

          <div>
            <Label>Mesaj *</Label>
            <Textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              required
              minLength={2}
              maxLength={5000}
              rows={6}
              className="mt-1"
              placeholder="Mesaj içeriği…"
            />
          </div>

          <div>
            <Label>Yönlendirme bağlantısı (opsiyonel)</Label>
            <Input
              type="text"
              value={form.href}
              onChange={(e) => set("href", e.target.value)}
              className="mt-1"
              placeholder="/panel/odevler veya https://…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-od-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          İptal
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          <Send className="mr-1 h-4 w-4" />
          {pending ? "Gönderiliyor…" : "Gönder"}
        </Button>
      </div>
    </form>
  );
}
