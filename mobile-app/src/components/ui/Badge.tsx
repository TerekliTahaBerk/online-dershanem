import React from "react";
import { View } from "react-native";
import { cn } from "@/utils/cn";
import { Typography } from "./Typography";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const toneCls: Record<Tone, { wrap: string; text: string }> = {
  neutral: { wrap: "bg-bg-elev border border-bg-border", text: "text-ink-muted" },
  brand: { wrap: "bg-brand/15 border border-brand/40", text: "text-brand-200" },
  success: { wrap: "bg-success/15 border border-success/40", text: "text-success" },
  warning: { wrap: "bg-warning/15 border border-warning/40", text: "text-warning" },
  danger: { wrap: "bg-danger/15 border border-danger/40", text: "text-danger" },
  info: { wrap: "bg-info/15 border border-info/40", text: "text-info" },
};

export function Badge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  const t = toneCls[tone];
  return (
    <View className={cn("px-2.5 py-1 rounded-full self-start", t.wrap, className)}>
      <Typography variant="caption" className={cn("font-medium", t.text)}>
        {label}
      </Typography>
    </View>
  );
}
