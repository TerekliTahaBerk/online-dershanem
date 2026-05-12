import React from "react";
import { Text, type TextProps } from "react-native";
import { cn } from "@/utils/cn";

type Variant =
  | "displayLg"
  | "displayMd"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySm"
  | "caption"
  | "label"
  | "mono";

const variantCls: Record<Variant, string> = {
  displayLg: "text-4xl font-bold tracking-tight text-ink",
  displayMd: "text-3xl font-bold tracking-tight text-ink",
  h1: "text-2xl font-semibold text-ink",
  h2: "text-xl font-semibold text-ink",
  h3: "text-lg font-semibold text-ink",
  body: "text-base text-ink",
  bodySm: "text-sm text-ink",
  caption: "text-xs text-ink-muted",
  label: "text-sm font-medium text-ink-muted",
  mono: "text-sm text-ink",
};

interface TypographyProps extends TextProps {
  variant?: Variant;
  muted?: boolean;
  className?: string;
}

export function Typography({
  variant = "body",
  muted,
  className,
  ...rest
}: TypographyProps) {
  return (
    <Text
      className={cn(variantCls[variant], muted && "text-ink-muted", className)}
      {...rest}
    />
  );
}
