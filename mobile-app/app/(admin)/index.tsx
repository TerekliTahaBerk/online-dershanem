import React from "react";
import { View } from "react-native";
import { Screen, Typography } from "@/components/ui";

export default function AdminHome() {
  return (
    <Screen scroll>
      <View className="pt-4">
        <Typography variant="displayMd">Yönetim</Typography>
        <Typography variant="bodySm" muted className="mt-2">
          Operasyonel KPI'lar, hızlı arama ve duyuru gönderme bu sürümde geliştirilmektedir.
        </Typography>
      </View>
    </Screen>
  );
}
