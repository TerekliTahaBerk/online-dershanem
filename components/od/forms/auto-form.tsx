"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Input, Textarea, Label } from "@/components/od/ui/input";
import { Button } from "@/components/od/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "textarea" | "select" | "checkbox" | "url" | "date" | "datetime-local" | "tel";
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  cols?: 1 | 2;
};

export type AutoFormProps = {
  title?: string;
  fields: FieldDef[];
  initial?: Record<string, any>;
  /** server action that returns ActionResult */
  action: (input: any) => Promise<{ ok: true; data: any } | { ok: false; error: any }>;
  /** Extra payload merged into submit (e.g. { id }) */
  extra?: Record<string, any>;
  submitLabel?: string;
  successMessage?: string;
  redirectTo?: (data: any) => string;
};

export function AutoForm({
  title,
  fields,
  initial,
  action,
  extra,
  submitLabel = "Kaydet",
  successMessage = "Kaydedildi",
  redirectTo,
}: AutoFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const f of fields) {
      init[f.name] = initial?.[f.name] ?? f.defaultValue ?? (f.type === "checkbox" ? false : "");
    }
    return init;
  });

  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function clean(s: any) {
    if (typeof s !== "string") return s;
    const v = s.trim();
    return v === "" ? null : v;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const payload: Record<string, any> = { ...extra };
      for (const f of fields) {
        const raw = form[f.name];
        if (f.type === "number") {
          payload[f.name] = raw === "" || raw === null ? undefined : Number(raw);
        } else if (f.type === "checkbox") {
          payload[f.name] = !!raw;
        } else if (f.required) {
          payload[f.name] = (raw ?? "").toString();
        } else {
          payload[f.name] = clean(raw);
        }
      }

      const res = await action(payload);
      if (res.ok) {
        toast.success(successMessage);
        if (redirectTo) router.push(redirectTo(res.data));
        else router.back();
      } else if ((res.error as any).code === "VALIDATION") {
        setErrors((res.error as any).fields);
        toast.error("Form geçersiz");
      } else {
        toast.error((res.error as any).message ?? "Hata");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-od-4">
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="grid gap-od-4 sm:grid-cols-2">
          {fields.map((f) => {
            const err = errors[f.name]?.[0];
            const span = f.cols === 2 || f.type === "textarea" ? "sm:col-span-2" : "";
            return (
              <div key={f.name} className={cn(span)}>
                {f.type !== "checkbox" && <Label>{f.label}{f.required && " *"}</Label>}
                {f.type === "textarea" ? (
                  <Textarea
                    value={form[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
                    rows={4}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="mt-1"
                  />
                ) : f.type === "select" ? (
                  <select
                    value={form[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
                    required={f.required}
                    className="mt-1 h-10 w-full rounded-od border border-od-border bg-od-surface px-od-2 text-od-body"
                  >
                    {!f.required && <option value="">—</option>}
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === "checkbox" ? (
                  <label className="mt-od-2 flex items-center gap-od-2 text-od-body">
                    <input
                      type="checkbox"
                      checked={!!form[f.name]}
                      onChange={(e) => set(f.name, e.target.checked)}
                      className="h-4 w-4 rounded border-od-border"
                    />
                    {f.label}
                  </label>
                ) : (
                  <Input
                    type={f.type ?? "text"}
                    value={form[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
                    required={f.required}
                    placeholder={f.placeholder}
                    className="mt-1"
                  />
                )}
                {f.helpText && !err && (
                  <p className="mt-1 text-od-tiny text-od-mute">{f.helpText}</p>
                )}
                {err && <p className="mt-1 text-od-tiny text-pastel-blush-ink">{err}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-od-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          İptal
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="mr-1 h-4 w-4" />
          {pending ? "Kaydediliyor…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
