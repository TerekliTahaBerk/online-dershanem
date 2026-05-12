import React from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { Screen, Typography } from "@/components/ui";

export default function NotFound() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-3">
        <Typography variant="displayMd">404</Typography>
        <Typography variant="bodySm" muted>
          Aradığın ekranı bulamadık.
        </Typography>
        <Link href="/">
          <Typography variant="bodySm" className="text-brand-300">
            Ana sayfaya dön
          </Typography>
        </Link>
      </View>
    </Screen>
  );
}
