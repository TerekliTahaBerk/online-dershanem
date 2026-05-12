import React from "react";
import { ScrollView, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/utils/cn";

interface ScreenProps extends ScrollViewProps {
  scroll?: boolean;
  padded?: boolean;
  className?: string;
  contentClassName?: string;
  edges?: ReadonlyArray<Edge>;
  style?: ViewStyle;
}

/**
 * Tüm ekranların temel sarmalayıcısı.
 * - SafeArea + dark surface
 * - Opsiyonel scroll
 * - Padding default
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  className,
  contentClassName,
  edges = ["top"],
  ...rest
}: ScreenProps) {
  const padCls = padded ? "px-5" : "";
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-bg", className)}>
      <Container
        className={cn("flex-1", padCls, contentClassName)}
        contentContainerClassName={scroll ? cn("pb-10", padCls) : undefined}
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}
