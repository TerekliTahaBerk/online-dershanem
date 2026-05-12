import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type PressableProps,
} from "react-native";
import { cn } from "@/utils/cn";
import { haptics } from "@/lib/haptics";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children"> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantCls: Record<Variant, { base: string; text: string; pressed: string }> = {
  primary: {
    base: "bg-brand",
    pressed: "bg-brand-600",
    text: "text-white",
  },
  secondary: {
    base: "bg-bg-elev border border-bg-border",
    pressed: "bg-bg-card",
    text: "text-ink",
  },
  ghost: {
    base: "bg-transparent",
    pressed: "bg-bg-elev",
    text: "text-ink",
  },
  danger: {
    base: "bg-danger/15 border border-danger/40",
    pressed: "bg-danger/25",
    text: "text-danger",
  },
};

const sizeCls: Record<Size, { container: string; text: string }> = {
  sm: { container: "h-9 px-3 rounded-xl", text: "text-sm font-medium" },
  md: { container: "h-12 px-4 rounded-2xl", text: "text-base font-semibold" },
  lg: { container: "h-14 px-5 rounded-2xl", text: "text-lg font-semibold" },
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading,
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled,
  onPress,
  className,
  ...rest
}: ButtonProps & { className?: string }) {
  const v = variantCls[variant];
  const s = sizeCls[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={(e) => {
        haptics.light();
        onPress?.(e);
      }}
      className={cn(
        "items-center justify-center flex-row gap-2",
        v.base,
        s.container,
        fullWidth && "w-full",
        isDisabled && "opacity-50",
        className,
      )}
      style={({ pressed }) => (pressed ? { transform: [{ scale: 0.98 }] } : null)}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={cn(v.text, s.text)}>{title}</Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
