import React from "react";
import { View } from "react-native";
import { Typography } from "./Typography";
import { Button } from "./Button";

export function ErrorState({
  title = "Bir şeyler ters gitti",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <Typography variant="h3" className="text-center">
        {title}
      </Typography>
      {description ? (
        <Typography variant="bodySm" muted className="text-center mt-2 max-w-xs">
          {description}
        </Typography>
      ) : null}
      {onRetry ? (
        <View className="mt-6 w-full max-w-xs">
          <Button title="Tekrar dene" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
