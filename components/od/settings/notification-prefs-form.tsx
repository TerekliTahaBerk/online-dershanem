"use client";

import * as React from "react";
import { toast } from "sonner";
import type { NotificationType } from "@prisma/client";
import { Button } from "@/components/od/ui/button";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import {
  ALL_CHANNELS,
  ALL_TYPES,
  CHANNEL_LABEL,
  TYPE_LABEL,
  defaultPrefs,
  isChannelEnabled,
  type NotificationChannel,
  type NotificationPrefs,
} from "@/lib/services/notification-prefs/types";
import {
  saveNotificationPrefsAction,
  resetNotificationPrefsAction,
} from "@/lib/services/notification-prefs/actions";

type Props = {
  initialPrefs: NotificationPrefs;
};

export function NotificationPrefsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(() => {
    // hydrate with full matrix so toggles render deterministically
    const base = defaultPrefs();
    for (const t of ALL_TYPES) {
      base[t] = {
        ...(base[t] ?? {}),
        ...(initialPrefs[t] ?? {}),
      };
    }
    return base;
  });
  const [pending, startTransition] = React.useTransition();

  const toggle = (type: NotificationType, channel: NotificationChannel) => {
    setPrefs((prev) => {
      const next = { ...prev };
      const current = isChannelEnabled(prev, type, channel);
      next[type] = { ...(prev[type] ?? {}), [channel]: !current };
      return next;
    });
  };

  const onSave = () => {
    startTransition(async () => {
      const res = await saveNotificationPrefsAction({ prefs });
      if (res?.ok) toast.success("Bildirim tercihleri kaydedildi");
      else toast.error(res?.error?.message ?? "Kaydedilemedi");
    });
  };

  const onReset = () => {
    if (!confirm("Tercihleri varsayılana sıfırlamak istediğinden emin misin?")) return;
    startTransition(async () => {
      const res = await resetNotificationPrefsAction({});
      if (res?.ok) {
        setPrefs(defaultPrefs());
        toast.success("Tercihler sıfırlandı");
      } else {
        toast.error(res?.error?.message ?? "Sıfırlanamadı");
      }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-od-4 py-od-4">
        <div className="space-y-od-1">
          <h2 className="text-od-h3 font-semibold text-od-ink">Bildirim Kanalları</h2>
          <p className="text-od-small text-od-mute">
            Her bildirim tipi için hangi kanalların açık olduğunu seç. URGENT öncelikli
            bildirimler bu tercihlerden bağımsız her zaman iletilir.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-od-1 text-od-small">
            <thead>
              <tr className="text-left text-od-mute">
                <th className="pb-od-2 font-medium">Bildirim Tipi</th>
                {ALL_CHANNELS.map((c) => (
                  <th key={c} className="pb-od-2 text-center font-medium">
                    {CHANNEL_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_TYPES.map((t) => (
                <tr key={t} className="rounded-od-md bg-od-soft/40">
                  <td className="rounded-l-od-md px-od-3 py-od-2 font-medium text-od-ink">
                    {TYPE_LABEL[t]}
                  </td>
                  {ALL_CHANNELS.map((c, i) => {
                    const checked = isChannelEnabled(prefs, t, c);
                    const isLast = i === ALL_CHANNELS.length - 1;
                    return (
                      <td
                        key={c}
                        className={`px-od-3 py-od-2 text-center ${isLast ? "rounded-r-od-md" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-od-mint disabled:cursor-not-allowed disabled:opacity-40"
                          checked={checked}
                          disabled={pending}
                          onChange={() => toggle(t, c)}
                          aria-label={`${TYPE_LABEL[t]} - ${CHANNEL_LABEL[c]}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-od-2 pt-od-2">
          <Button variant="ghost" onClick={onReset} disabled={pending}>
            Varsayılana Sıfırla
          </Button>
          <Button onClick={onSave} disabled={pending}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
