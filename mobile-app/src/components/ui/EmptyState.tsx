import React from "react";
import { View } from "react-native";
import { Typography } from "./Typography";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-12 px-6">
      {icon ? <View className="mb-4">{icon}</View> : null}
      <Typography variant="h3" className="text-center">
        {title}
      </Typography>
      {description ? (
        <Typography variant="bodySm" muted className="text-center mt-2 max-w-xs">
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-6 w-full max-w-xs">
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
