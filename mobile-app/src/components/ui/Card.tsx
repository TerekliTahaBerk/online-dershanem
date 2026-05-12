import React from "react";
import { View, Pressable, type ViewProps } from "react-native";
import { cn } from "@/utils/cn";
import { haptics } from "@/lib/haptics";

interface CardProps extends ViewProps {
  variant?: "flat" | "elevated";
  pressable?: boolean;
  onPress?: () => void;
  className?: string;
}

/**
 * Tüm liste/dashboard öğelerinin omurgası — premium feel için
 * subtle border + dark elevated surface.
 */
export function Card({
  variant = "flat",
  pressable,
  onPress,
  children,
  className,
  ...rest
}: CardProps) {
  const base =
    variant === "elevated"
      ? "bg-bg-elev border border-bg-border"
      : "bg-bg-card border border-bg-border";

  if (pressable && onPress) {
    return (
      <Pressable
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        style={({ pressed }) => (pressed ? { transform: [{ scale: 0.99 }], opacity: 0.95 } : null)}
        className={cn(base, "rounded-2xl p-4", className)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={cn(base, "rounded-2xl p-4", className)} {...rest}>
      {children}
    </View>
  );
}
