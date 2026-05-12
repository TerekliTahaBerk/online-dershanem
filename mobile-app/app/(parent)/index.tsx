import React from "react";
import { View } from "react-native";
import { Screen, Typography } from "@/components/ui";

export default function ParentHome() {
  return (
    <Screen scroll>
      <View className="pt-4">
        <Typography variant="displayMd">Veli Paneli</Typography>
        <Typography variant="bodySm" muted className="mt-2">
          Çocuğunun günlük takibi, performansı ve ödeme durumu bu sürümde geliştirilmektedir.
        </Typography>
      </View>
    </Screen>
  );
}
