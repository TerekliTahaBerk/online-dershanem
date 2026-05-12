import React from "react";
import { Screen, Typography } from "@/components/ui";
import { View } from "react-native";

export default function TeacherHome() {
  return (
    <Screen scroll>
      <View className="pt-4">
        <Typography variant="displayMd">Öğretmen Paneli</Typography>
        <Typography variant="bodySm" muted className="mt-2">
          Bugünkü dersler, bekleyen ödev değerlendirmeleri ve yoklama akışı bu sürümde geliştirilmektedir.
        </Typography>
      </View>
    </Screen>
  );
}
