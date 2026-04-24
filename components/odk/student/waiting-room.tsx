"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Clock } from "lucide-react";

type Props = {
  examTitle: string;
  startsAt: string; // ISO string
  serverNow: number; // ms since epoch from server
  googleMeetLink?: string | null;
};

export function WaitingRoom({ examTitle, startsAt, serverNow, googleMeetLink }: Props) {
  const router = useRouter();
  const clockOffset = useRef(serverNow - Date.now());
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, new Date(startsAt).getTime() - (Date.now() + clockOffset.current)),
  );
  const refreshedRef = useRef(false);

  useEffect(() => {
    const startMs = new Date(startsAt).getTime();

    const tick = () => {
      const left = Math.max(0, startMs - (Date.now() + clockOffset.current));
      setRemaining(left);

      if (left === 0 && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startsAt, router]);

  const totalSecs = Math.ceil(remaining / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="rounded-full bg-blue-50 p-4">
        <Clock className="h-8 w-8 text-blue-500" />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-stone-900">{examTitle}</h1>
        <p className="text-sm text-stone-500">Sınav başlamasına kalan süre</p>
      </div>

      <div className="flex items-end gap-1 tabular-nums">
        <span className="text-7xl font-bold tracking-tight text-stone-900">
          {String(mins).padStart(2, "0")}
        </span>
        <span className="mb-2 text-4xl font-bold text-stone-400">:</span>
        <span className="text-7xl font-bold tracking-tight text-stone-900">
          {String(secs).padStart(2, "0")}
        </span>
      </div>

      <p className="text-xs text-stone-400">
        Sayfa otomatik olarak güncellenecek. Burada beklemeye devam edebilirsin.
      </p>

      {googleMeetLink && (
        <a
          href={googleMeetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          <Video className="h-4 w-4" />
          Google Meet&apos;e Katıl
        </a>
      )}
    </div>
  );
}
