"use client";

import { useEffect, useState } from "react";

function remaining(target: string) {
  const total = Math.max(0, new Date(target).getTime() - Date.now());
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  return { total, label: days > 0 ? `${days} gün ${hours} saat` : hours > 0 ? `${hours} saat ${minutes} dk` : total > 0 ? `${Math.max(1, minutes)} dakika` : "Ders başladı" };
}

export function LiveCountdown({ target }: { target: string }) {
  const [value, setValue] = useState(() => remaining(target));
  useEffect(() => { const timer = window.setInterval(() => setValue(remaining(target)), 30000); return () => window.clearInterval(timer); }, [target]);
  return <span className="tabular-nums">{value.label}</span>;
}
