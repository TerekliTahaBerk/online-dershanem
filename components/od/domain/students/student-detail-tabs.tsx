"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  User,
  GraduationCap,
  PackageOpen,
  Receipt,
  CalendarCheck,
  StickyNote,
  FileText,
  BarChart3,
  History,
  Phone,
  Mail,
  MapPin,
  School,
  Target,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/od/ui/tabs";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { cn } from "@/lib/utils/cn";

type Student = any;

type Props = {
  student: Student;
  packages: any[];
  payments: any[];
  attendance: any[];
  notes: any[];
  files: any[];
  assignments: any[];
  history: any[];
};

const STATUS_TONE: Record<string, "lavender" | "sky" | "mint" | "blush" | "yellow" | "neutral"> = {
  NEW: "lavender",
  FOLLOW_UP: "sky",
  ACTIVE: "mint",
  AT_RISK: "blush",
  PAUSED: "yellow",
  CHURNED: "neutral",
};

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export function StudentDetailTabs({
  student,
  packages,
  payments,
  attendance,
  notes,
  files,
  assignments,
  history,
}: Props) {
  const [tab, setTab] = useState("genel");

  return (
    <div className="space-y-od-5">
      {/* Header card */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-od-4 py-od-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pastel-mint-soft text-od-h2 font-semibold text-pastel-mint-ink">
            {student.fullName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-od-h2 font-semibold text-od-ink">{student.fullName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-od-2 text-od-small text-od-mute">
              {student.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {student.phone}
                </span>
              )}
              {student.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {student.email}
                </span>
              )}
              {(student.city || student.district) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[student.district, student.city].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            <div className="mt-od-2 flex flex-wrap gap-od-2">
              <Badge tone={STATUS_TONE[student.status] ?? "neutral"}>{student.status}</Badge>
              {student.classLevel && <Badge tone="sky">{student.classLevel}</Badge>}
              {student.examType && <Badge tone="lavender">{student.examType}</Badge>}
              {student.activePackage && <Badge tone="yellow">{student.activePackage}</Badge>}
              {student.tags?.map((t: any) => (
                <Badge key={t.tag.id} tone="mint">
                  {t.tag.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-right text-od-tiny text-od-mute">
            <div>Kayıt: {format(new Date(student.createdAt), "dd MMM yyyy", { locale: tr })}</div>
            <div>Güncelleme: {format(new Date(student.updatedAt), "dd MMM yyyy HH:mm", { locale: tr })}</div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="genel"><User className="mr-1 h-4 w-4" /> Genel</TabsTrigger>
          <TabsTrigger value="egitim"><GraduationCap className="mr-1 h-4 w-4" /> Eğitim</TabsTrigger>
          <TabsTrigger value="paketler"><PackageOpen className="mr-1 h-4 w-4" /> Paketler ({packages.length})</TabsTrigger>
          <TabsTrigger value="odemeler"><Receipt className="mr-1 h-4 w-4" /> Ödemeler ({payments.length})</TabsTrigger>
          <TabsTrigger value="yoklama"><CalendarCheck className="mr-1 h-4 w-4" /> Yoklama</TabsTrigger>
          <TabsTrigger value="odevler"><BarChart3 className="mr-1 h-4 w-4" /> Ödevler ({assignments.length})</TabsTrigger>
          <TabsTrigger value="notlar"><StickyNote className="mr-1 h-4 w-4" /> Notlar ({notes.length})</TabsTrigger>
          <TabsTrigger value="dosyalar"><FileText className="mr-1 h-4 w-4" /> Dosyalar ({files.length})</TabsTrigger>
          <TabsTrigger value="gecmis"><History className="mr-1 h-4 w-4" /> Geçmiş</TabsTrigger>
        </TabsList>

        {/* GENEL */}
        <TabsContent value="genel" className="mt-od-4">
          <Card>
            <CardContent className="grid gap-od-4 py-od-4 sm:grid-cols-2">
              <Field label="Veli Adı" value={student.parentFullName} />
              <Field label="Veli Telefon" value={student.parentPhone} />
              <Field label="Veli Email" value={student.parentEmail} />
              <Field label="Kaynak" value={student.source} />
              <Field label="İhtiyaç Türü" value={student.needType} />
              <Field label="Çalışma Durumu" value={student.studyStatus} />
              <Field label="Haftalık Çalışma" value={student.weeklyStudyHours} />
              <Field
                label="Sıradaki Aksiyon"
                value={
                  student.nextActionAt
                    ? format(new Date(student.nextActionAt), "dd MMM yyyy HH:mm", { locale: tr })
                    : null
                }
              />
              {student.notes && (
                <div className="sm:col-span-2">
                  <Field label="Notlar" value={student.notes} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EĞİTİM */}
        <TabsContent value="egitim" className="mt-od-4">
          <Card>
            <CardContent className="grid gap-od-4 py-od-4 sm:grid-cols-2">
              <Field label="Okul" value={student.schoolName} icon={School} />
              <Field label="Bölüm" value={student.department} />
              <Field label="Mevcut Seviye" value={student.currentLevel} />
              <Field label="Mevcut Net" value={student.currentNet} />
              <Field label="Hedef" value={student.targetGoal} icon={Target} />
              <Field label="Hedef Okul" value={student.targetSchool} />
              <Field label="Hedef Sıralama" value={student.targetRanking} />
              <Field label="Güçlü Dersler" value={student.strongLessons} />
              <div className="sm:col-span-2">
                <Field label="Zayıf Dersler" value={student.weakLessons} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAKETLER */}
        <TabsContent value="paketler" className="mt-od-4">
          {packages.length === 0 ? (
            <EmptyState tone="lavender" icon={PackageOpen} title="Paket yok" description="Bu öğrenciye atanmış aktif paket yok." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-od-border">
                  {packages.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-od-3 px-od-4 py-od-3">
                      <PackageOpen className="h-5 w-5 text-od-accent" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-od-ink">{p.package?.name ?? p.packageName ?? "Paket"}</div>
                        <div className="text-od-tiny text-od-mute">
                          Başlangıç: {p.startDate ? format(new Date(p.startDate), "dd MMM yyyy", { locale: tr }) : "—"}
                          {p.endDate && ` · Bitiş: ${format(new Date(p.endDate), "dd MMM yyyy", { locale: tr })}`}
                        </div>
                      </div>
                      <Badge tone={p.status === "ACTIVE" ? "mint" : "neutral"}>{p.status ?? "—"}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ÖDEMELER */}
        <TabsContent value="odemeler" className="mt-od-4">
          {payments.length === 0 ? (
            <EmptyState tone="yellow" icon={Receipt} title="Ödeme yok" description="Bu öğrenci için kaydedilmiş ödeme bulunamadı." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-od-small">
                  <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                    <tr>
                      <th className="px-od-4 py-od-2">Tarih</th>
                      <th className="px-od-4 py-od-2">Tip</th>
                      <th className="px-od-4 py-od-2">Kategori</th>
                      <th className="px-od-4 py-od-2">Açıklama</th>
                      <th className="px-od-4 py-od-2 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((e: any) => (
                      <tr key={e.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                        <td className="px-od-4 py-od-2">
                          {format(new Date(e.occurredAt), "dd MMM yyyy", { locale: tr })}
                        </td>
                        <td className="px-od-4 py-od-2">
                          <Badge tone={e.type === "INCOME" ? "mint" : "blush"}>{e.type}</Badge>
                        </td>
                        <td className="px-od-4 py-od-2 text-od-mute">{e.category}</td>
                        <td className="px-od-4 py-od-2">{e.description ?? "—"}</td>
                        <td className="px-od-4 py-od-2 text-right font-mono font-medium">
                          {fmtTL(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* YOKLAMA */}
        <TabsContent value="yoklama" className="mt-od-4">
          {attendance.length === 0 ? (
            <EmptyState tone="sky" icon={CalendarCheck} title="Yoklama kaydı yok" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-od-border">
                  {attendance.slice(0, 50).map((a: any) => (
                    <li key={a.id} className="flex items-center gap-od-3 px-od-4 py-od-3">
                      <span className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full text-od-tiny font-semibold",
                        a.status === "PRESENT" && "bg-pastel-mint-soft text-pastel-mint-ink",
                        a.status === "ABSENT" && "bg-pastel-blush-soft text-pastel-blush-ink",
                        a.status === "LATE" && "bg-pastel-yellow-soft text-pastel-yellow-ink",
                      )}>
                        {a.status?.[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-od-small text-od-ink">
                          {a.lesson?.title ?? "Ders"}
                        </div>
                        <div className="text-od-tiny text-od-mute">
                          {a.markedAt ? format(new Date(a.markedAt), "dd MMM yyyy HH:mm", { locale: tr }) : "—"}
                        </div>
                      </div>
                      <Badge tone={
                        a.status === "PRESENT" ? "mint" :
                        a.status === "ABSENT" ? "blush" :
                        a.status === "LATE" ? "yellow" : "neutral"
                      }>{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ÖDEVLER */}
        <TabsContent value="odevler" className="mt-od-4">
          {assignments.length === 0 ? (
            <EmptyState tone="blush" icon={BarChart3} title="Ödev gönderimi yok" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-od-border">
                  {assignments.map((s: any) => (
                    <li key={s.id} className="flex items-start gap-od-3 px-od-4 py-od-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-od-ink">{s.assignment?.title ?? "Ödev"}</div>
                        <div className="text-od-tiny text-od-mute">
                          {s.submittedAt
                            ? `Gönderildi: ${format(new Date(s.submittedAt), "dd MMM yyyy", { locale: tr })}`
                            : "Henüz gönderilmedi"}
                          {s.score != null && ` · Not: ${s.score}/${s.assignment?.maxScore ?? "—"}`}
                        </div>
                      </div>
                      <Badge tone={
                        s.status === "GRADED" ? "mint" :
                        s.status === "SUBMITTED" ? "sky" :
                        s.status === "LATE" ? "yellow" :
                        s.status === "MISSED" ? "blush" : "neutral"
                      }>{s.status}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* NOTLAR */}
        <TabsContent value="notlar" className="mt-od-4">
          {notes.length === 0 ? (
            <EmptyState tone="lavender" icon={StickyNote} title="Not yok" />
          ) : (
            <div className="space-y-od-3">
              {notes.map((n: any) => (
                <Card key={n.id}>
                  <CardContent className="space-y-od-2 py-od-3">
                    <div className="flex items-center gap-od-2 text-od-tiny text-od-mute">
                      <span>{n.author?.name ?? n.author?.email ?? "Sistem"}</span>
                      <span>·</span>
                      <span>{format(new Date(n.createdAt), "dd MMM yyyy HH:mm", { locale: tr })}</span>
                      {n.isPrivate && <Badge tone="blush">Gizli</Badge>}
                    </div>
                    <p className="text-od-body text-od-ink">{n.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DOSYALAR */}
        <TabsContent value="dosyalar" className="mt-od-4">
          {files.length === 0 ? (
            <EmptyState tone="sky" icon={FileText} title="Dosya yok" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-od-border">
                  {files.map((f: any) => (
                    <li key={f.id} className="flex items-center gap-od-3 px-od-4 py-od-3">
                      <FileText className="h-5 w-5 text-od-mute" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={f.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-od-accent hover:underline"
                        >
                          {f.fileName}
                        </a>
                        <div className="text-od-tiny text-od-mute">
                          {(f.byteSize / 1024).toFixed(1)} KB ·{" "}
                          {format(new Date(f.createdAt), "dd MMM yyyy", { locale: tr })}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-od-mute" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GEÇMİŞ */}
        <TabsContent value="gecmis" className="mt-od-4">
          {history.length === 0 ? (
            <EmptyState tone="neutral" icon={History} title="Audit kaydı yok" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-od-border">
                  {history.map((h: any) => (
                    <li key={h.id} className="flex items-start gap-od-3 px-od-4 py-od-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-od-2">
                          <Badge tone="lavender">{h.action}</Badge>
                          <span className="text-od-tiny text-od-mute">
                            {format(new Date(h.createdAt), "dd MMM yyyy HH:mm", { locale: tr })}
                          </span>
                        </div>
                        <div className="mt-1 text-od-small text-od-ink-2">
                          {h.actor?.name ?? h.actor?.email ?? "Sistem"}
                          {h.summary && ` · ${h.summary}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: any;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-od-tiny font-medium uppercase tracking-wider text-od-mute">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="mt-0.5 text-od-body text-od-ink whitespace-pre-wrap">
        {value || <span className="text-od-mute">—</span>}
      </div>
    </div>
  );
}
