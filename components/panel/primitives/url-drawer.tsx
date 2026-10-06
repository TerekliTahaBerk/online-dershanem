"use client";

import { useCallback, type ReactNode } from "react";
import { Drawer, useDrawerParam } from "@/components/panel/primitives/drawer";

/**
 * Sunucu sayfasının yan paneli: sayfa `?onizle=…` parametresini okuyup içeriği
 * (ör. server action formu) sunucuda üretir; bu sarmalayıcı yalnız açık/kapalı
 * durumunu ve kapatmayı (parametreyi silerek) yönetir. Parametre yoksa sunucu
 * bileşeni hiç çizmez.
 */
export function UrlDrawer({
  title,
  description,
  children,
  footer,
  param = "onizle",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  param?: string;
}) {
  const [value, setValue] = useDrawerParam(param);
  const close = useCallback(() => setValue(null), [setValue]);
  return (
    <Drawer open={Boolean(value)} onClose={close} title={title} description={description} footer={footer}>
      {children}
    </Drawer>
  );
}
