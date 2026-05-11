"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Award } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Input, Textarea, Label } from "@/components/od/ui/input";
import { gradeSubmissionAction } from "@/lib/services/assignments/submission-actions";

export function GradeForm({
  submissionId,
  initialScore,
  initialFeedback,
  maxScore,
}: {
  submissionId: string;
  initialScore?: number | null;
  initialFeedback?: string | null;
  maxScore?: number | null;
}) {
  const [score, setScore] = useState<string>(initialScore?.toString() ?? "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!score) {
      toast.error("Not gerekli");
      return;
    }
    start(async () => {
      const r = await gradeSubmissionAction({
        submissionId,
        score: Number(score),
        feedback: feedback || null,
      });
      if (r.ok) toast.success("Notlandırıldı");
      else if ("fields" in r.error) toast.error("Form geçersiz");
      else toast.error((r.error as any).message ?? "Hata");
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-od-2 md:grid-cols-[120px_1fr_auto] md:items-end">
      <div>
        <Label htmlFor={`s-${submissionId}`}>Not{maxScore ? ` /${maxScore}` : ""}</Label>
        <Input
          id={`s-${submissionId}`}
          type="number"
          min={0}
          max={maxScore ?? undefined}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`f-${submissionId}`}>Geri bildirim</Label>
        <Textarea
          id={`f-${submissionId}`}
          rows={2}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        <Award className="mr-1 h-4 w-4" /> {pending ? "…" : "Kaydet"}
      </Button>
    </form>
  );
}
