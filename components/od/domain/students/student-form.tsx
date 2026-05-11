"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Input, Textarea, Label } from "@/components/od/ui/input";
import { Button } from "@/components/od/ui/button";
import { toast } from "sonner";
import {
  createStudentAction,
  updateStudentAction,
} from "@/lib/services/students/actions";

type Initial = Partial<{
  id: string;
  fullName: string;
  phone: string;
  email: string;
  classLevel: string;
  examType: string;
  city: string;
  district: string;
  schoolName: string;
  notes: string;
}>;

export function StudentForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<Initial>({
    fullName: "",
    phone: "",
    email: "",
    classLevel: "",
    examType: "",
    city: "",
    district: "",
    schoolName: "",
    notes: "",
    ...initial,
  });

  const isEdit = !!initial?.id;

  function set<K extends keyof Initial>(k: K, v: Initial[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function clean(s?: string | null) {
    const v = (s ?? "").trim();
    return v === "" ? null : v;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const payload: any = {
        fullName: form.fullName?.trim() ?? "",
        phone: form.phone?.trim() ?? "",
        email: clean(form.email),
        classLevel: clean(form.classLevel),
        examType: clean(form.examType),
        city: clean(form.city),
        district: clean(form.district),
        schoolName: clean(form.schoolName),
        notes: clean(form.notes),
      };

      const res = isEdit
        ? await updateStudentAction({ ...payload, id: initial!.id })
        : await createStudentAction(payload);

      if (res.ok) {
        toast.success(isEdit ? "Öğrenci güncellendi" : "Öğrenci eklendi");
        const id = (res.data as any)?.id ?? initial?.id;
        if (id) router.push(`/v2/admin/ogrenciler/${id}`);
        else router.push("/v2/admin/ogrenciler");
      } else if (res.error.code === "VALIDATION") {
        setErrors(res.error.fields);
        toast.error("Form geçersiz");
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function err(k: string) {
    return errors[k]?.[0];
  }

  return (
    <form onSubmit={submit} className="space-y-od-4">
      <Card>
        <CardHeader>
          <CardTitle>Temel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-od-4 sm:grid-cols-2">
          <FieldInput label="Ad Soyad *" value={form.fullName} onChange={(v) => set("fullName", v)} error={err("fullName")} required />
          <FieldInput label="Telefon *" value={form.phone} onChange={(v) => set("phone", v)} error={err("phone")} required />
          <FieldInput label="E-posta" type="email" value={form.email} onChange={(v) => set("email", v)} error={err("email")} />
          <FieldInput label="Okul" value={form.schoolName} onChange={(v) => set("schoolName", v)} error={err("schoolName")} />
          <FieldInput label="Sınıf Seviyesi" value={form.classLevel} onChange={(v) => set("classLevel", v)} error={err("classLevel")} placeholder="örn. 12" />
          <FieldInput label="Sınav" value={form.examType} onChange={(v) => set("examType", v)} error={err("examType")} placeholder="TYT / AYT / LGS" />
          <FieldInput label="Şehir" value={form.city} onChange={(v) => set("city", v)} error={err("city")} />
          <FieldInput label="İlçe" value={form.district} onChange={(v) => set("district", v)} error={err("district")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>İç Notlar</Label>
          <Textarea
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            rows={4}
            className="mt-1"
            placeholder="Öğrenci hakkında dahili notlar…"
          />
          {err("notes") && <p className="mt-1 text-od-tiny text-pastel-blush-ink">{err("notes")}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-od-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          İptal
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="mr-1 h-4 w-4" />
          {pending ? "Kaydediliyor…" : isEdit ? "Güncelle" : "Oluştur"}
        </Button>
      </div>
    </form>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  error,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1"
      />
      {error && <p className="mt-1 text-od-tiny text-pastel-blush-ink">{error}</p>}
    </div>
  );
}
