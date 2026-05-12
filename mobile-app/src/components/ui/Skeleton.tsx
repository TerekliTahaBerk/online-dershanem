import React from "react";
import { View } from "react-native";
import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
  height?: number;
  width?: number | string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

const roundCls = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-2xl",
  full: "rounded-full",
} as const;

/** Static skeleton — animasyonu Reanimated ile sonra ekleriz. */
export function Skeleton({ className, height = 16, width, rounded = "md" }: SkeletonProps) {
  return (
    <View
      style={{ height, width: typeof width === "number" ? width : undefined }}
      className={cn(
        "bg-bg-elev",
        roundCls[rounded],
        typeof width === "string" ? `w-${width}` : "",
        className,
      )}
    />
  );
}
