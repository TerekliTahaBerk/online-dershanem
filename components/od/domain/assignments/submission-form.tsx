"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Input, Textarea, Label } from "@/components/od/ui/input";
import { Card, CardContent } from "@/components/od/ui/card";
import { submitAssignmentAction } from "@/lib/services/assignments/submission-actions";

export function SubmissionForm({
  assignmentId,
  initialContent,
  initialAttachmentUrl,
  alreadySubmitted,
}: {
  assignmentId: string;
  initialContent?: string | null;
  initialAttachmentUrl?: string | null;
  alreadySubmitted: boolean;
}) {
  const [content, setContent] = useState(initialContent ?? "");
  const [url, setUrl] = useState(initialAttachmentUrl ?? "");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await submitAssignmentAction({
        assignmentId,
        content: content || null,
        attachmentUrl: url || null,
      });
      if (r.ok) {
        toast.success(alreadySubmitted ? "Gönderim güncellendi" : "Ödev gönderildi");
      } else if ("fields" in r.error) {
        toast.error("Form geçersiz");
      } else {
        toast.error((r.error as any).message ?? "Hata");
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-od-3">
        <form onSubmit={submit} className="space-y-od-3">
          <div>
            <Label htmlFor="content">Cevabın</Label>
            <Textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cevabını buraya yaz…"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="url">Dosya/Link (opsiyonel)</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1"
            />
            <p className="mt-1 text-od-tiny text-od-mute">
              Drive, Dropbox veya görsel linki yapıştırabilirsin.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={pending}>
              <Send className="mr-1 h-4 w-4" />
              {pending ? "Gönderiliyor…" : alreadySubmitted ? "Güncelle" : "Gönder"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
